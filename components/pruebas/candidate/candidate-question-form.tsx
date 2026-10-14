"use client"

import { useTranslations } from "next-intl"

import type { MockQuestion } from "@/lib/pruebas/types"
import { LIKERT_SCALE_MAX, LIKERT_SCALE_MIN } from "@/lib/pruebas/question-editor"

type CandidateQuestionFormProps = {
  question: MockQuestion
  value: unknown
  onChange: (value: unknown) => void
  disabled?: boolean
}

const CONTROL =
  "min-h-11 rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:opacity-50"

/**
 * Interactive candidate question controls. Never shows correct answers or points.
 */
export function CandidateQuestionForm({
  question,
  value,
  onChange,
  disabled = false,
}: CandidateQuestionFormProps) {
  const t = useTranslations("PruebasPortal.candidate.question")

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
      data-testid="candidate-question-form"
      data-kind={question.kind}
    >
      <p className="font-sans text-base font-medium text-foreground">
        {question.prompt}
      </p>

      {question.kind === "single_choice" ? (
        <div
          role="radiogroup"
          aria-label={t("optionsAria")}
          className="flex flex-col gap-2"
        >
          {question.options.map((option) => {
            const checked = value === option.id
            return (
              <label
                key={option.id}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 font-sans text-sm ${
                  checked
                    ? "border-vo-purple bg-vo-purple/10 text-foreground"
                    : "border-border text-foreground"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={option.id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(option.id)}
                  className="size-4 border-border text-vo-purple focus:ring-vo-purple"
                />
                <span>{option.label}</span>
              </label>
            )
          })}
        </div>
      ) : null}

      {question.kind === "multiple_choice" ? (
        <div
          role="group"
          aria-label={t("optionsAria")}
          className="flex flex-col gap-2"
        >
          {question.options.map((option) => {
            const selected = Array.isArray(value)
              ? (value as string[]).includes(option.id)
              : false
            return (
              <label
                key={option.id}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 font-sans text-sm ${
                  selected
                    ? "border-vo-purple bg-vo-purple/10 text-foreground"
                    : "border-border text-foreground"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={disabled}
                  onChange={() => {
                    const current = Array.isArray(value)
                      ? ([...value] as string[])
                      : []
                    if (selected) {
                      onChange(current.filter((id) => id !== option.id))
                    } else {
                      onChange([...current, option.id])
                    }
                  }}
                  className="size-4 rounded border-border text-vo-purple focus:ring-vo-purple"
                />
                <span>{option.label}</span>
              </label>
            )
          })}
        </div>
      ) : null}

      {question.kind === "true_false" ? (
        <div
          role="radiogroup"
          aria-label={t("trueFalseAria")}
          className="flex flex-wrap gap-2"
        >
          {[
            { label: t("trueLabel"), bool: true },
            { label: t("falseLabel"), bool: false },
          ].map((option) => {
            const checked = value === option.bool
            return (
              <label
                key={String(option.bool)}
                className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-4 font-sans text-sm ${
                  checked
                    ? "border-vo-purple bg-vo-purple/10"
                    : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(option.bool)}
                  className="size-4 border-border text-vo-purple focus:ring-vo-purple"
                />
                {option.label}
              </label>
            )
          })}
        </div>
      ) : null}

      {question.kind === "likert" ? (
        <div
          role="radiogroup"
          aria-label={t("likertAria")}
          className="flex flex-wrap gap-2"
        >
          {Array.from(
            { length: LIKERT_SCALE_MAX - LIKERT_SCALE_MIN + 1 },
            (_, index) => LIKERT_SCALE_MIN + index,
          ).map((scaleValue) => {
            const checked = value === scaleValue
            return (
              <label
                key={scaleValue}
                className={`inline-flex size-11 cursor-pointer items-center justify-center rounded-md border font-sans text-sm ${
                  checked
                    ? "border-vo-purple bg-vo-purple/10"
                    : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  className="sr-only"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(scaleValue)}
                />
                {scaleValue}
              </label>
            )
          })}
        </div>
      ) : null}

      {question.kind === "numeric" ? (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`numeric-${question.id}`}
            className="font-sans text-sm font-medium text-foreground"
          >
            {t("numericLabel")}
          </label>
          <input
            id={`numeric-${question.id}`}
            type="number"
            disabled={disabled}
            className={`${CONTROL} w-full max-w-xs`}
            value={typeof value === "number" ? value : ""}
            onChange={(event) => {
              const next = event.target.value
              if (next === "") {
                onChange(undefined)
                return
              }
              const parsed = Number(next)
              onChange(Number.isFinite(parsed) ? parsed : undefined)
            }}
          />
        </div>
      ) : null}

      {question.kind === "open" ? (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`open-${question.id}`}
            className="font-sans text-sm font-medium text-foreground"
          >
            {t("openLabel")}
          </label>
          <textarea
            id={`open-${question.id}`}
            rows={4}
            disabled={disabled}
            className={`${CONTROL} w-full py-2`}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      ) : null}
    </div>
  )
}
