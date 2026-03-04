import type { User } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"]

type ProfileClient = {
  from: (table: "profiles") => {
    upsert: (
      values: ProfileInsert,
      options?: {
        onConflict?: string
      },
    ) => PromiseLike<{ error: { message: string } | null }>
  }
}

function getFullName(user: User): string | null {
  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : ""
  const fallbackName =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name.trim() : ""
  const resolved = fullName || fallbackName

  return resolved.length > 0 ? resolved : null
}

export async function ensureProfileExists(
  supabase: ProfileClient,
  user: User,
) {
  const email = user.email?.trim()
  if (!email) {
    throw new Error("Your account is missing an email address.")
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name: getFullName(user),
    },
    { onConflict: "id" },
  )

  if (error) {
    throw new Error(`Failed to sync profile record: ${error.message}`)
  }
}
