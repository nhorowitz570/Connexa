import { ChatView } from "@/components/assistant/chat-view"

export default function AssistantPage() {
  return (
    <section className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-white">Assistant</h1>
        <p className="text-sm text-[#919191]">
          Chat with ConnexaAI about briefs, results, and sourcing strategy.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <ChatView />
      </div>
    </section>
  )
}
