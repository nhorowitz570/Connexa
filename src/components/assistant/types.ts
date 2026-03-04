export type ChatAttachment = {
  name: string
  type: string
  size?: number
  path?: string
  url?: string | null
  text_content?: string | null
}

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  attachments: ChatAttachment[]
  brief_refs: string[]
  created_at: string
}

export type ChatThread = {
  id: string
  title: string
  created_at: string
  updated_at: string
}
