import type { ChatAttachment, ChatMessage, ChatThread } from "@/components/assistant/types"

type ThreadExportInput = {
  thread: ChatThread
  messages: ChatMessage[]
}

type ThreadExportEnvelope = {
  version: "connexa.export.v1"
  exported_at: string
  type: "conversation"
  data: ThreadExportInput
}

function escapeYaml(value: string): string {
  return `"${value.replaceAll("\"", "\\\"")}"`
}

function formatAttachments(attachments: ChatAttachment[]): string {
  if (attachments.length === 0) return ""
  return attachments
    .map((attachment) => {
      const urlSuffix = attachment.url ? ` (${attachment.url})` : ""
      return `  - ${attachment.name}${urlSuffix}`
    })
    .join("\n")
}

export function toThreadExportEnvelope(input: ThreadExportInput): ThreadExportEnvelope {
  return {
    version: "connexa.export.v1",
    exported_at: new Date().toISOString(),
    type: "conversation",
    data: input,
  }
}

export function serializeThreadAsJson(input: ThreadExportInput): string {
  return JSON.stringify(toThreadExportEnvelope(input), null, 2)
}

export function serializeThreadAsMarkdown(input: ThreadExportInput): string {
  const envelope = toThreadExportEnvelope(input)
  const messageBlocks = input.messages.length
    ? input.messages
        .map((message, index) => {
          const attachments = formatAttachments(message.attachments)
          const refs =
            message.brief_refs.length > 0 ? `- Brief refs: ${message.brief_refs.join(", ")}` : null
          return [
            `### ${index + 1}. ${message.role === "assistant" ? "Assistant" : "User"}`,
            `- Sent: ${new Date(message.created_at).toISOString()}`,
            refs,
            attachments ? "- Attachments:\n" + attachments : null,
            "",
            message.content.trim().length > 0 ? message.content : "_(empty message)_",
          ]
            .filter(Boolean)
            .join("\n")
        })
        .join("\n\n")
    : "No messages in this thread."

  return [
    "---",
    `version: ${escapeYaml(envelope.version)}`,
    `exported_at: ${escapeYaml(envelope.exported_at)}`,
    `type: ${escapeYaml(envelope.type)}`,
    `thread_id: ${escapeYaml(input.thread.id)}`,
    `thread_title: ${escapeYaml(input.thread.title)}`,
    `message_count: ${input.messages.length}`,
    "---",
    "",
    `# Conversation: ${input.thread.title}`,
    "",
    `- Thread ID: ${input.thread.id}`,
    `- Created: ${new Date(input.thread.created_at).toISOString()}`,
    `- Updated: ${new Date(input.thread.updated_at).toISOString()}`,
    "",
    "## Messages",
    "",
    messageBlocks,
  ].join("\n")
}
