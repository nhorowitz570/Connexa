import { NextResponse } from "next/server"

import { CREDIT_PACKAGES } from "@/lib/credits"
import { FEATURES } from "@/lib/feature-flags"
import { createClient } from "@/lib/supabase/server"

type CreatePurchaseInput = {
  credits?: number
}

async function createStripePaymentIntent(amountCents: number, userId: string) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY")
  }

  const payload = new URLSearchParams()
  payload.set("amount", String(amountCents))
  payload.set("currency", "usd")
  payload.set("automatic_payment_methods[enabled]", "true")
  payload.set("metadata[user_id]", userId)
  payload.set("description", "Connexa additional search credits")

  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
  })

  const result = (await response.json()) as {
    id?: string
    client_secret?: string
    error?: { message?: string }
  }

  if (!response.ok || !result.id || !result.client_secret) {
    throw new Error(result.error?.message ?? "Failed to create Stripe PaymentIntent")
  }

  return {
    id: result.id,
    clientSecret: result.client_secret,
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("search_credits_remaining, search_credits_purchased")
      .eq("id", user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        credits_remaining: profile?.search_credits_remaining ?? -1,
        credits_purchased: profile?.search_credits_purchased ?? 0,
        search_credits_enabled: FEATURES.SEARCH_CREDITS,
        has_stripe: FEATURES.STRIPE_PAYMENTS,
        packages: CREDIT_PACKAGES,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load credit data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreatePurchaseInput
    const requestedCredits = typeof body.credits === "number" ? body.credits : null
    const selectedPackage = CREDIT_PACKAGES.find((pkg) => pkg.credits === requestedCredits)

    if (!selectedPackage) {
      return NextResponse.json({ error: "Invalid credit package." }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: purchase, error: insertError } = await supabase
      .from("search_purchases")
      .insert({
        user_id: user.id,
        credits: selectedPackage.credits,
        amount_cents: selectedPackage.price_cents,
        currency: "USD",
        status: "pending",
      })
      .select("id")
      .single()

    if (insertError || !purchase) {
      return NextResponse.json({ error: insertError?.message ?? "Failed to create purchase" }, { status: 500 })
    }

    if (!FEATURES.STRIPE_PAYMENTS) {
      return NextResponse.json({
        data: {
          purchase_id: purchase.id,
          deferred: true,
          message: "Payment processing coming soon. We'll notify you when checkout is enabled.",
        },
      })
    }

    try {
      const intent = await createStripePaymentIntent(selectedPackage.price_cents, user.id)
      const { error: updateError } = await supabase
        .from("search_purchases")
        .update({ payment_intent_id: intent.id })
        .eq("id", purchase.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        data: {
          purchase_id: purchase.id,
          deferred: false,
          payment_intent_id: intent.id,
          client_secret: intent.clientSecret,
        },
      })
    } catch (error) {
      await supabase
        .from("search_purchases")
        .update({ status: "failed" })
        .eq("id", purchase.id)

      const message = error instanceof Error ? error.message : "Failed to create payment intent"
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start purchase"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
