"use client"

import { useState, useRef, useEffect } from 'react'
import { Header } from "@/components/header"
import { 
  Plus, Send, Mic, Paperclip, MessageSquare, Sparkles, Copy, Check, 
  ChevronDown, ChevronUp, Trash2
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Chat {
  id: string
  title: string
  preview: string
  timestamp: Date
  messages: Message[]
}

const initialChats: Chat[] = [
  {
    id: '1',
    title: 'Marketing Agency Search',
    preview: 'Help me find a B2B marketing agency...',
    timestamp: new Date('2026-03-02'),
    messages: [
      { id: '1', role: 'user', content: 'Help me find a B2B marketing agency that specializes in SaaS.', timestamp: new Date('2026-03-02T10:00:00') },
      { id: '2', role: 'assistant', content: "I'd be happy to help you find a B2B marketing agency! Based on your requirements, I'll analyze our database for agencies with:\n\n- **SaaS specialization**\n- **B2B expertise**\n- **Proven track record**\n\nWould you like me to create a detailed brief, or would you prefer a quick search with the default criteria?", timestamp: new Date('2026-03-02T10:00:05') },
    ]
  },
  {
    id: '2',
    title: 'Understanding Match Scores',
    preview: 'How does the AI scoring work?',
    timestamp: new Date('2026-03-01'),
    messages: [
      { id: '1', role: 'user', content: 'How does the AI scoring work?', timestamp: new Date('2026-03-01T15:30:00') },
      { id: '2', role: 'assistant', content: "Great question! Our AI scoring system evaluates vendors across multiple dimensions:\n\n```\n1. Relevance Score (40%)\n   - Industry match\n   - Service alignment\n   - Experience level\n\n2. Quality Indicators (30%)\n   - Case studies\n   - Client testimonials\n   - Portfolio strength\n\n3. Fit Analysis (30%)\n   - Budget compatibility\n   - Team size match\n   - Geographic alignment\n```\n\nEach factor is weighted based on your brief's priorities. The final score represents the overall confidence in the match.", timestamp: new Date('2026-03-01T15:30:10') },
    ]
  },
  {
    id: '3',
    title: 'Export Options',
    preview: 'Can I export my results to CSV?',
    timestamp: new Date('2026-02-28'),
    messages: []
  },
]

export default function AssistantPage() {
  const [chats, setChats] = useState<Chat[]>(initialChats)
  const [activeChat, setActiveChat] = useState<Chat | null>(initialChats[0])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeChat?.messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [input])

  const handleNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Conversation',
      preview: '',
      timestamp: new Date(),
      messages: []
    }
    setChats(prev => [newChat, ...prev])
    setActiveChat(newChat)
  }

  const handleSend = async () => {
    if (!input.trim() || !activeChat || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    const updatedChat = {
      ...activeChat,
      messages: [...activeChat.messages, userMessage],
      preview: input.trim().slice(0, 50) + '...',
      title: activeChat.messages.length === 0 ? input.trim().slice(0, 30) + '...' : activeChat.title
    }

    setActiveChat(updatedChat)
    setChats(prev => prev.map(c => c.id === activeChat.id ? updatedChat : c))
    setInput('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I understand you're looking for assistance. Let me analyze your request and provide some insights.\n\n**Key Points:**\n- I've reviewed your query\n- Here are my recommendations\n- Let me know if you need more details\n\nWould you like me to elaborate on any specific aspect?",
        "Based on my analysis, here's what I found:\n\n1. **Primary Finding**: Your requirements align well with several vendors in our database.\n\n2. **Recommendation**: Consider creating a detailed brief to get more accurate matches.\n\n3. **Next Steps**: I can help you refine your criteria or start a new search.\n\nWhat would you like to do next?",
        "Great question! Let me break this down for you:\n\n```typescript\n// Here's how the process works\nconst searchProcess = {\n  step1: 'Analyze brief',\n  step2: 'Query database',\n  step3: 'Score matches',\n  step4: 'Rank results'\n};\n```\n\nThis ensures you get the most relevant results every time."
      ]
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date()
      }

      const finalChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, aiMessage]
      }

      setActiveChat(finalChat)
      setChats(prev => prev.map(c => c.id === activeChat.id ? finalChat : c))
      setIsLoading(false)
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleExpand = (id: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const deleteChat = (chatId: string) => {
    setChats(prev => prev.filter(c => c.id !== chatId))
    if (activeChat?.id === chatId) {
      setActiveChat(chats.find(c => c.id !== chatId) || null)
    }
  }

  const renderMessage = (content: string) => {
    // Simple markdown-like rendering
    const lines = content.split('\n')
    return lines.map((line, i) => {
      // Code blocks
      if (line.startsWith('```')) {
        return null // Handle multi-line code blocks separately
      }
      
      // Headers
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold text-white mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>
      }
      
      // Bold text inline
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/g)
        return (
          <p key={i} className="text-[#C9D1D9]">
            {parts.map((part, j) => 
              part.startsWith('**') && part.endsWith('**') 
                ? <strong key={j} className="text-white">{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        )
      }
      
      // List items
      if (line.startsWith('- ')) {
        return <li key={i} className="text-[#C9D1D9] ml-4">{line.slice(2)}</li>
      }
      
      // Numbered lists
      if (/^\d+\.\s/.test(line)) {
        return <li key={i} className="text-[#C9D1D9] ml-4 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>
      }
      
      // Empty lines
      if (!line.trim()) {
        return <br key={i} />
      }
      
      return <p key={i} className="text-[#C9D1D9]">{line}</p>
    })
  }

  const renderCodeBlock = (content: string) => {
    const codeMatch = content.match(/```(\w+)?\n([\s\S]*?)```/)
    if (codeMatch) {
      const [, lang, code] = codeMatch
      return (
        <div className="my-3 rounded-lg overflow-hidden border border-[#30363D]">
          <div className="flex items-center justify-between px-4 py-2 bg-[#1F1F1F] border-b border-[#30363D]">
            <span className="text-xs text-[#919191]">{lang || 'code'}</span>
          </div>
          <pre className="p-4 bg-[#0D1117] overflow-x-auto">
            <code className="text-sm text-[#C9D1D9] font-mono">{code.trim()}</code>
          </pre>
        </div>
      )
    }
    return null
  }

  return (
    <div className="relative h-screen w-full bg-[#0D1117] text-white overflow-hidden">
      <Header />
      
      <div className="flex h-full pt-20">
        {/* Chat Sidebar */}
        <aside className="hidden md:flex w-72 flex-col bg-[#161B22] border-r border-[#30363D]">
          <div className="p-4">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#4F6EF7] hover:bg-[#4F6EF7]/90 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              New Chat
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <div className="space-y-1">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group relative flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                    activeChat?.id === chat.id
                      ? 'bg-[#4F6EF7]/10 border border-[#4F6EF7]/30'
                      : 'hover:bg-[#1F1F1F]'
                  }`}
                  onClick={() => setActiveChat(chat)}
                >
                  <MessageSquare className="h-5 w-5 text-[#919191] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{chat.title}</p>
                    <p className="text-xs text-[#919191] truncate">{chat.preview || 'No messages yet'}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteChat(chat.id) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded transition-all"
                  >
                    <Trash2 className="h-4 w-4 text-[#919191] hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col min-w-0">
          {activeChat ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-3xl mx-auto space-y-6">
                  {activeChat.messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#4F6EF7] to-indigo-700 flex items-center justify-center mb-4">
                        <Sparkles className="h-8 w-8 text-white" />
                      </div>
                      <h2 className="text-xl font-semibold text-white mb-2">ConnexaAI Assistant</h2>
                      <p className="text-[#919191] max-w-md">
                        I can help you create briefs, understand your match results, export data, and answer questions about the platform.
                      </p>
                    </div>
                  )}
                  
                  {activeChat.messages.map((message) => {
                    const isLong = message.content.length > 400
                    const isExpanded = expandedMessages.has(message.id)
                    const displayContent = isLong && !isExpanded 
                      ? message.content.slice(0, 400) + '...'
                      : message.content
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-[#4F6EF7] text-white'
                              : 'bg-[#161B22] border border-[#30363D]'
                          }`}
                        >
                          {message.role === 'assistant' && (
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#30363D]">
                              <Sparkles className="h-4 w-4 text-[#4F6EF7]" />
                              <span className="text-sm font-medium text-white">ConnexaAI</span>
                            </div>
                          )}
                          
                          <div className="text-sm leading-relaxed">
                            {displayContent.includes('```') 
                              ? renderCodeBlock(displayContent)
                              : null
                            }
                            {renderMessage(displayContent.replace(/```[\s\S]*?```/g, ''))}
                          </div>
                          
                          {isLong && (
                            <button
                              onClick={() => toggleExpand(message.id)}
                              className="flex items-center gap-1 mt-2 text-xs text-[#919191] hover:text-white transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  Show more
                                </>
                              )}
                            </button>
                          )}
                          
                          {message.role === 'assistant' && (
                            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#30363D]">
                              <button
                                onClick={() => copyToClipboard(message.content, message.id)}
                                className="flex items-center gap-1 text-xs text-[#919191] hover:text-white transition-colors"
                              >
                                {copiedId === message.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    Copy
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[#4F6EF7]" />
                          <span className="text-sm font-medium text-white">ConnexaAI</span>
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          <div className="w-2 h-2 bg-[#4F6EF7] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-[#4F6EF7] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-[#4F6EF7] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Bar */}
              <div className="border-t border-[#30363D] bg-[#161B22] p-4">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-end gap-3 bg-[#0D1117] rounded-xl border border-[#30363D] p-3">
                    <button className="p-2 text-[#919191] hover:text-white hover:bg-[#1F1F1F] rounded-lg transition-colors">
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask ConnexaAI anything..."
                      rows={1}
                      className="flex-1 bg-transparent text-white placeholder-[#919191] resize-none focus:outline-none text-sm leading-relaxed max-h-[150px]"
                    />
                    <button className="p-2 text-[#919191] hover:text-white hover:bg-[#1F1F1F] rounded-lg transition-colors">
                      <Mic className="h-5 w-5" />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className={`p-2 rounded-lg transition-all ${
                        input.trim() && !isLoading
                          ? 'bg-[#4F6EF7] text-white hover:bg-[#4F6EF7]/90 hover:scale-105'
                          : 'bg-[#1F1F1F] text-[#919191] cursor-not-allowed'
                      }`}
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-center text-xs text-[#919191] mt-2">
                    ConnexaAI may produce inaccurate information. Verify important details.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-[#919191] mx-auto mb-4" />
                <p className="text-[#919191]">Select a chat or start a new conversation</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
