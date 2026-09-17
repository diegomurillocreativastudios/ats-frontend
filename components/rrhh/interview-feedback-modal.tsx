"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import Modal from "@/components/ui/Modal"
import {
  classifyInterviewFeedbackConflict,
  interviewFeedbackErrorKey,
  resolveInterviewFeedbackToastKind,
  signedDeltaPointsLabel,
  submitInterviewFeedback,
  toPercentPoints,
  type InterviewFeedbackResponse,
} from "@/lib/api/interview-feedback"

export interface InterviewFeedbackCompletePayload {
  variant: "success" | "error"
  message: string
  shouldRefresh: boolean
}

export interface InterviewFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  applicationId: string | null
  candidateLabel?: string | null
  onComplete: (payload: InterviewFeedbackCompletePayload) => void
}

function buildSuccessToastMessage(
  t: (key: string, values?: Record<string, string | number>) => string,
  result: InterviewFeedbackResponse
): string {
  const previous = toPercentPoints(result.previousMatchScore)
  const next = toPercentPoints(result.matchScore)
  const kind = resolveInterviewFeedbackToastKind(result)
  if (kind === "increased") {
    return `${t("successIncreased", { previous, next })} ${t("changePoints", {
      signedDelta: signedDeltaPointsLabel(result.delta),
    })}`
  }
  if (kind === "decreased") {
    return `${t("successDecreased", { previous, next })} ${t("changePoints", {
      signedDelta: signedDeltaPointsLabel(result.delta),
    })}`
  }
  if (kind === "unchangedNoWeight") {
    return t("successUnchangedNoWeight")
  }
  return t("successUnchanged", { score: next })
}

export function InterviewFeedbackModal({
  isOpen,
  onClose,
  applicationId,
  candidateLabel,
  onComplete,
}: InterviewFeedbackModalProps) {
  const t = useTranslations("RecruiterPortal.vacancies.matching.interviewFeedback")
  const tCommon = useTranslations("Common")
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setFeedback("")
    setError(null)
  }, [isOpen, applicationId])

  const handleClose = useCallback(() => {
    if (isSubmitting) return
    onClose()
  }, [isSubmitting, onClose])

  const handleSubmit = useCallback(async () => {
    if (!applicationId || isSubmitting) return
    const trimmed = feedback.trim()
    if (!trimmed) {
      setError(t("required"))
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const result = await submitInterviewFeedback(applicationId, trimmed)
      onComplete({
        variant: "success",
        message: buildSuccessToastMessage(t, result),
        shouldRefresh: true,
      })
      onClose()
    } catch (err: unknown) {
      const conflict = classifyInterviewFeedbackConflict(err)
      const message = t(interviewFeedbackErrorKey(err))
      if (conflict) {
        onComplete({
          variant: "error",
          message,
          shouldRefresh: true,
        })
        onClose()
        return
      }
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [applicationId, feedback, isSubmitting, onClose, onComplete, t])

  if (!applicationId) return null

  const canSubmit = feedback.trim().length > 0 && !isSubmitting

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("modalTitle")}
      size="md"
      closeOnOverlayClick={!isSubmitting}
      overlayZIndexClass="z-[100]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="inline-flex items-center rounded-md border border-border px-4 py-2 font-sans text-sm text-foreground hover:bg-muted disabled:opacity-50"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2 font-sans text-sm font-medium text-white hover:bg-vo-purple-hover disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {isSubmitting ? t("submitting") : t("submit")}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {candidateLabel ? (
          <p className="font-sans text-sm text-muted-foreground">{candidateLabel}</p>
        ) : null}
        <p className="font-sans text-sm text-muted-foreground">{t("modalDescription")}</p>
        {error ? (
          <p className="font-sans text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <label htmlFor="interview-feedback-modal-field" className="font-sans text-sm font-medium">
          {t("fieldLabel")}
        </label>
        <textarea
          id="interview-feedback-modal-field"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={8}
          disabled={isSubmitting}
          placeholder={t("placeholder")}
          className="resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm disabled:opacity-60"
        />
      </div>
    </Modal>
  )
}
