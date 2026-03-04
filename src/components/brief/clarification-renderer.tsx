"use client"

import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { QuestionsPayload } from "@/types"

type ClarificationRendererProps = {
  payload: QuestionsPayload
  submitting: boolean
  onSubmit: (answers: Record<string, unknown>) => Promise<void>
}

export function ClarificationRenderer({
  payload,
  submitting,
  onSubmit,
}: ClarificationRendererProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [otherAnswers, setOtherAnswers] = useState<Record<string, string>>({})
  const [showErrors, setShowErrors] = useState(false)

  const isQuestionAnswered = (questionId: string) => {
    const selectedValue = selectedAnswers[questionId]
    if (!selectedValue) return false
    if (selectedValue !== "__other__") return true
    return (otherAnswers[questionId] ?? "").trim().length > 0
  }

  const canSubmit = payload.questions.every(
    (question) => !question.required || isQuestionAnswered(question.id),
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setShowErrors(true)
    if (!canSubmit) return

    const answers: Record<string, unknown> = {}
    for (const question of payload.questions) {
      const selectedValue = selectedAnswers[question.id]
      if (!selectedValue) continue
      if (selectedValue === "__other__") {
        const otherValue = (otherAnswers[question.id] ?? "").trim()
        if (otherValue.length > 0) {
          answers[question.id] = otherValue
        }
      } else {
        answers[question.id] = selectedValue
      }
    }

    try {
      await onSubmit(answers)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit clarifications."
      toast.error(message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clarify Brief</CardTitle>
        <CardDescription>Answer a few questions so we can improve provider matching.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {payload.questions.map((question) => {
            const selectedValue = selectedAnswers[question.id] ?? ""
            const hasRequiredError = showErrors && question.required && !isQuestionAnswered(question.id)

            return (
              <div key={question.id} className="space-y-2">
                <Label>{question.prompt}</Label>
                {question.helpText ? (
                  <p className="text-xs text-muted-foreground">{question.helpText}</p>
                ) : null}

                <RadioGroup
                  value={selectedValue}
                  onValueChange={(value) =>
                    setSelectedAnswers((current) => ({
                      ...current,
                      [question.id]: value,
                    }))
                  }
                  className="space-y-2"
                >
                  {question.options.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem id={`${question.id}-${option}`} value={option} />
                      <Label htmlFor={`${question.id}-${option}`} className="font-normal">
                        {option}
                      </Label>
                    </div>
                  ))}
                  {question.allowOther ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id={`${question.id}-other`} value="__other__" />
                        <Label htmlFor={`${question.id}-other`} className="font-normal">
                          Other
                        </Label>
                      </div>
                      {selectedValue === "__other__" ? (
                        <Input
                          value={otherAnswers[question.id] ?? ""}
                          onChange={(event) =>
                            setOtherAnswers((current) => ({
                              ...current,
                              [question.id]: event.target.value,
                            }))
                          }
                          placeholder="Enter your answer"
                        />
                      ) : null}
                    </div>
                  ) : null}
                </RadioGroup>

                {hasRequiredError ? (
                  <p className="text-xs text-destructive">Please answer this question.</p>
                ) : null}

              </div>
            )
          })}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit answers and run"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
