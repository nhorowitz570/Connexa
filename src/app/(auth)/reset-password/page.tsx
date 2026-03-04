import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { ConnexaLogo } from "@/components/connexa-logo"

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0D1117] p-6">
      <div className="mb-8">
        <ConnexaLogo />
      </div>
      <ResetPasswordForm />
    </main>
  )
}
