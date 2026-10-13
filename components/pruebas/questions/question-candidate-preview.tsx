"use client"

import { useTranslations } from "next-intl"

import type { MockQuestion } from "@/lib/pruebas/types"
import { LIKERT_SCALE_MAX, LIKERT_SCALE_MIN } from "@/lib/pruebas/question-editor"

type QuestionCandidatePreviewProps = {
  question: MockQuestion
}

/**
 * Candidate-facing preview: no correct answers, points, or scoring internals.
 */
export function QuestionCandidatePreview({
  question,
}: QuestionCandidatePreviewProps) {
  const t = useTranslations("PruebasPortal.questionsBank.preview")

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
      data-testid="question-candidate-preview"
    >
      <p className="font-sans text-sm text-muted-foreground">{t("hint")}</p>
      <p className="font-sans text-base font-medium text-foreground">
        {question.prompt.trim() || t("emptyPrompt")}
      </p>

      {question.kind === "single_choice" || question.kind === "multiple_choice" ? (
        <ul className="flex flex-col gap-2" role="list">
          {question.options.map((option) => (
            <li
              key={option.id}
              className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3 py-2 font-sans text-sm text-foreground"
            >
              <span
                className={`inline-flex size-4 shrink-0 rounded-full border border-border ${
                  question.kind === "multiple_choice" ? "rounded-sm" : ""
                }`}
                aria-hidden
              />
              <span>{option.label.trim() || t("emptyOption")}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {question.kind === "true_false" ? (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-11 items-center rounded-md border border-border px-4 font-sans text-sm">
            {t("trueLabel")}
          </span>
          <span className="inline-flex min-h-11 items-center rounded-md border border-border px-4 font-sans text-sm">
            {t("falseLabel")}
          </span>
        </div>
      ) : null}

      {question.kind === "likert" ? (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t("likertScaleAria")}
        >
          {Array.from(
            { length: LIKERT_SCALE_MAX - LIKERT_SCALE_MIN + 1 },
            (_, index) => LIKERT_SCALE_MIN + index,
          ).map((value) => (
            <span
              key={value}
              className="inline-flex size-11 items-center justify-center rounded-md border border-border font-sans text-sm"
            >
              {value}
            </span>
          ))}
        </div>
      ) : null}

      {question.kind === "numeric" ? (
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-sm font-medium text-foreground">
            {t("numericLabel")}
          </label>
          <input
            type="number"
            disabled
            className="h-11 w-full max-w-xs rounded-md border border-border bg-muted px-3 font-sans text-sm text-foreground"
            aria-label={t("numericLabel")}
          />
        </div>
      ) : null}

      {question.kind === "open" ? (
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-sm font-medium text-foreground">
            {t("openLabel")}
          </label>
          <textarea
            disabled
            rows={4}
            className="w-full rounded-md border border-border bg-muted px-3 py-2 font-sans text-sm text-foreground"
            aria-label={t("openLabel")}
          />
        </div>
      ) : null}
    </div>
  )
}
