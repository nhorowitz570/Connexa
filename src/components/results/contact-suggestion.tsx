export function ContactSuggestion({
  email,
  contactUrl,
  websiteUrl,
}: {
  email?: string | null
  contactUrl?: string | null
  websiteUrl: string
}) {
  if (email) {
    return (
      <a className="text-sm underline underline-offset-4" href={`mailto:${email}`}>
        Email: {email}
      </a>
    )
  }

  if (contactUrl) {
    return (
      <a
        className="text-sm underline underline-offset-4"
        href={contactUrl}
        target="_blank"
        rel="noreferrer"
      >
        Visit contact page
      </a>
    )
  }

  return (
    <a
      className="text-sm underline underline-offset-4"
      href={websiteUrl}
      target="_blank"
      rel="noreferrer"
    >
      Visit website or reach out via LinkedIn
    </a>
  )
}
