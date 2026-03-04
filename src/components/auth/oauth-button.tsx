"use client"

import { useState } from "react"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export function OAuthButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleGoogle = async () => {
    setLoading(true)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/callback`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <Button type="button" variant="outline" onClick={handleGoogle} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Continue with Google
    </Button>
  )
}
