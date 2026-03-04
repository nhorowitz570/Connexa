"use client"

import { useRef, useState } from "react"
import { Paperclip } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { ChatAttachment } from "@/components/assistant/types"

type FileUploadButtonProps = {
  disabled?: boolean
  onUploaded: (attachment: ChatAttachment) => void
}

export function FileUploadButton({ disabled, onUploaded }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleSelectFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB.`)
          continue
        }

        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/assistant/upload", {
          method: "POST",
          body: formData,
        })

        const payload = (await response.json()) as {
          data?: ChatAttachment
          error?: string
        }

        if (!response.ok || !payload.data) {
          toast.error(payload.error ?? `Failed to upload ${file.name}.`)
          continue
        }

        onUploaded(payload.data)
        toast.success(`${file.name} uploaded.`)
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.txt,.csv,.png,.jpg,.jpeg"
        onChange={(event) => {
          void handleSelectFiles(event.target.files)
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="h-4 w-4" />
      </Button>
    </>
  )
}
