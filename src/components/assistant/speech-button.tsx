"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { Mic, MicOff } from "lucide-react"

import { Button } from "@/components/ui/button"

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: { results?: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  }
}

type SpeechButtonProps = {
  disabled?: boolean
  onTranscript: (text: string) => void
}

export function SpeechButton({ disabled, onTranscript }: SpeechButtonProps) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)

  const SupportedRecognition = useMemo(
    () => (typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null),
    [],
  )

  useEffect(() => {
    if (!SupportedRecognition) return

    const recognition = new SupportedRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript
      if (transcript) {
        onTranscript(transcript)
      }
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognition.onerror = () => {
      setListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [SupportedRecognition, onTranscript])

  if (!SupportedRecognition) return null

  return (
    <Button
      type="button"
      variant={listening ? "default" : "outline"}
      size="icon"
      disabled={disabled}
      onClick={() => {
        if (!recognitionRef.current) return
        if (listening) {
          recognitionRef.current.stop()
          setListening(false)
        } else {
          recognitionRef.current.start()
          setListening(true)
        }
      }}
      title={listening ? "Listening..." : "Speak"}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  )
}
