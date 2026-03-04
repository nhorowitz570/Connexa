"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { OAuthButton } from "@/components/auth/oauth-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success("Logged in successfully.")
    router.push("/")
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Access your Connexa dashboard.</CardDescription>
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

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <OAuthButton />

          <div className="flex justify-between text-sm text-[#919191]">
            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
              Create account
            </Link>
            <Link href="/reset-password" className="text-[#919191] hover:text-indigo-400 underline underline-offset-4">
              Forgot password?
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
