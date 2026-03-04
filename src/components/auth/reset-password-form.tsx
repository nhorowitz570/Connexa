"use client"

import Link from "next/link"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export function ResetPasswordForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success("Reset email sent.")
    setLoading(false)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>We will send a reset link to your email.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>

          <Link href="/login" className="text-sm text-muted-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        </form>
      </CardContent>
    </Card>
  )
}
