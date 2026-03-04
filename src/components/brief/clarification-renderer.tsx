"use client"

import { type FormEvent, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Question, QuestionsPayload } from "@/types"

type ClarificationRendererProps = {
  payload: QuestionsPayload
  submitting: boolean
  onSubmit: (answers: Record<string, unknown>) => Promise<void>
}

const PRIORITY_ORDER: Record<NonNullable<Question["priority"]>, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function getPriorityLabel(priority: Question["priority"]): string {
  return (priority ?? "medium").replace(/^\w/, (char) => char.toUpperCase())
}

export function ClarificationRenderer({
  payload,
  submitting,
  onSubmit,
}: ClarificationRendererProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [otherAnswers, setOtherAnswers] = useState<Record<string, string>>({})
  const [showErrors, setShowErrors] = useState(false)

  const questions = useMemo(
    () =>
      [...payload.questions].sort(
        (a, b) => PRIORITY_ORDER[a.priority ?? "medium"] - PRIORITY_ORDER[b.priority ?? "medium"],
      ),
    [payload.questions],
  )

  const getResolvedAnswer = (question: Question): unknown => {
    const selectedValue = selectedAnswers[question.id] ?? ""
    if (question.type === "multiple_choice") {
      if (selectedValue === "__other__") {
        const other = (otherAnswers[question.id] ?? "").trim()
        return other.length > 0 ? other : undefined
      }
      return selectedValue || undefined
    }

    if (question.type === "number") {
      if (!selectedValue.trim()) return undefined
      const numericValue = Number(selectedValue)
      return Number.isFinite(numericValue) ? numericValue : undefined
    }

    const trimmed = selectedValue.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  const validateQuestion = (question: Question): string | null => {
    const resolved = getResolvedAnswer(question)

    if (question.required && (resolved === undefined || resolved === null || resolved === "")) {
      return "Please answer this question."
    }

    if (resolved === undefined || resolved === null || resolved === "") {
      return null
    }

    if (question.type === "multiple_choice" || question.type === "select") {
      if (typeof resolved !== "string") {
        return "Please choose one option."
      }

      const options = question.options ?? []
      if (question.type === "multiple_choice" && selectedAnswers[question.id] === "__other__") {
        return null
      }

      if (!options.includes(resolved)) {
        return "Please choose a valid option."
      }
    }

    if (question.type === "number") {
      if (typeof resolved !== "number" || !Number.isFinite(resolved)) {
        return "Please enter a valid number."
      }
      const min = question.validation?.min
      const max = question.validation?.max
      if (typeof min === "number" && resolved < min) {
        return `Value must be at least ${min}.`
      }
      if (typeof max === "number" && resolved > max) {
        return `Value must be at most ${max}.`
      }
    }

    if (question.type === "text" || question.type === "multiple_choice" || question.type === "select") {
      if (typeof resolved !== "string") return "Please enter valid text."
      const minLength = question.validation?.minLength
      const maxLength = question.validation?.maxLength
      const pattern = question.validation?.pattern
      if (typeof minLength === "number" && resolved.length < minLength) {
        return `Answer must be at least ${minLength} characters.`
      }
      if (typeof maxLength === "number" && resolved.length > maxLength) {
        return `Answer must be at most ${maxLength} characters.`
      }
      if (pattern) {
        try {
          const matcher = new RegExp(pattern)
          if (!matcher.test(resolved)) {
            return "Answer format is invalid."
          }
        } catch {
          return "Question validation pattern is invalid."
        }
      }
    }

    return null
  }

  const errors = (() => {
    const entries: Record<string, string | null> = {}
    for (const question of questions) {
      entries[question.id] = validateQuestion(question)
    }
    return entries
  })()

  const canSubmit = questions.every((question) => !errors[question.id])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setShowErrors(true)
    if (!canSubmit) return

    const answers: Record<string, unknown> = {}
    for (const question of questions) {
      const answer = getResolvedAnswer(question)
      if (answer !== undefined) {
        answers[question.id] = answer
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
        <form className="space-y-5" onSubmit={handleSubmit}>
          {questions.map((question) => {
            const selectedValue = selectedAnswers[question.id] ?? ""
            const errorText = showErrors ? errors[question.id] : null
            const options = question.options ?? []

            return (
              <div key={question.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{question.prompt}</Label>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {getPriorityLabel(question.priority)}
                  </span>
                </div>

                {question.helpText ? (
                  <p className="text-xs text-muted-foreground">{question.helpText}</p>
                ) : null}

                {question.type === "multiple_choice" ? (
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
                    {options.map((option) => (
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
                ) : null}

                {question.type === "select" ? (
                  <Select
                    value={selectedValue}
                    onValueChange={(value) =>
                      setSelectedAnswers((current) => ({
                        ...current,
                        [question.id]: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}

                {question.type === "text" ? (
                  <Textarea
                    value={selectedValue}
                    onChange={(event) =>
                      setSelectedAnswers((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))
                    }
                    placeholder="Type your answer"
                    rows={3}
                  />
                ) : null}

                {question.type === "number" ? (
                  <Input
                    type="number"
                    min={question.validation?.min}
                    max={question.validation?.max}
                    value={selectedValue}
                    onChange={(event) =>
                      setSelectedAnswers((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))
                    }
                    placeholder="Enter a number"
                  />
                ) : null}

                {errorText ? (
                  <p className="text-xs text-destructive">{errorText}</p>
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
