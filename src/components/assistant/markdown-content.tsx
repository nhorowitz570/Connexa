"use client"

import { Check, Copy, ExternalLink } from "lucide-react"
import { type ReactNode, useMemo, useState } from "react"
import rehypeSanitize from "rehype-sanitize"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type MarkdownContentProps = {
  content: string
  className?: string
}

type CodeBlockProps = {
  className?: string
  children?: ReactNode
}

function CodeBlock({ className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const code = useMemo(() => String(children ?? "").replace(/\n$/, ""), [children])
  const language = className?.replace("language-", "") ?? "text"

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-md border border-border bg-muted/70 dark:border-[#2B3138] dark:bg-[#0B0F14]">
      <div className="flex items-center justify-between border-b border-border px-2 py-1.5 dark:border-[#2B3138]">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground dark:text-[#8B949E]">{language}</span>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void copyCode()}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-foreground dark:text-[#E6EDF3]">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("space-y-2 text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          code: ({ className: codeClassName, children, ...props }) => {
            const value = String(children ?? "")
            const isBlock = Boolean(codeClassName) || value.includes("\n")
            if (!isBlock) {
              return (
                <code {...props} className="rounded bg-muted px-1 py-0.5 text-xs dark:bg-[#1F1F1F]">
                  {children}
                </code>
              )
            }
            return <CodeBlock className={codeClassName}>{children}</CodeBlock>
          },
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-indigo-700 underline underline-offset-2 dark:text-[#79C0FF]"
            >
              {children}
              <ExternalLink className="h-3 w-3" />
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="whitespace-pre-wrap">{children}</li>,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-border bg-muted px-2 py-1.5 font-medium dark:border-[#2B3138] dark:bg-[#161B22]">{children}</th>,
          td: ({ children }) => <td className="border border-border px-2 py-1.5 align-top dark:border-[#2B3138]">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
