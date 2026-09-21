"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import Modal from "@/components/ui/Modal"
import {
  classifyInterviewFeedbackConflict,
  fetchInterviewFeedbackForm,
  interviewFeedbackErrorKey,
  resolveInterviewFeedbackToastKind,
  signedDeltaPointsLabel,
  submitInterviewFeedback,
  toPercentPoints,
  validateInterviewFeedbackCoverage,
  type InterviewFeedbackEntry,
  type InterviewFeedbackForm,
  type InterviewFeedbackResponse,
} from "@/lib/api/interview-feedback"
import { formatRequirementKey } from "@/lib/vacancies/format-requirement-key"

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

const SCORE_MIN = 1
const SCORE_MAX = 10

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

function ScoreSlider({
  id,
  label,
  value,
  disabled,
  onChange,
  unsetLabel,
}: {
  id: string
  label: string
  value: number | null
  disabled: boolean
  onChange: (next: number) => void
  unsetLabel: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="font-sans text-sm font-medium text-foreground">
          {label}
        </label>
        <span className="font-sans text-xs font-medium tabular-nums text-foreground">
          {value == null ? unsetLabel : value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={SCORE_MIN}
        max={SCORE_MAX}
        step={1}
        value={value ?? SCORE_MIN}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-vo-purple disabled:cursor-not-allowed disabled:opacity-60"
        aria-valuemin={SCORE_MIN}
        aria-valuemax={SCORE_MAX}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value == null ? unsetLabel : String(value)}
      />
    </div>
  )
}

function FeedbackHistoryList({
  entries,
  t,
}: {
  entries: InterviewFeedbackEntry[]
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  if (entries.length === 0) return null

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4" aria-label={t("historyTitle")}>
      <h3 className="font-sans text-sm font-semibold text-foreground">{t("historyTitle")}</h3>
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => {
          const previous = toPercentPoints(entry.previousMatchScore)
          const next = toPercentPoints(entry.matchScore)
          const createdLabel = entry.createdAt
            ? new Date(entry.createdAt).toLocaleString()
            : ""
          return (
            <li
              key={entry.id}
              className="rounded-md border border-border bg-muted/40 p-3"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-sans text-xs text-muted-foreground">
                  {entry.createdBy
                    ? t("historyBy", { name: entry.createdBy })
                    : t("historyAnonymous")}
                  {createdLabel ? ` · ${createdLabel}` : ""}
                </p>
                <p className="font-sans text-xs font-medium tabular-nums text-foreground">
                  {t("historyScore", {
                    previous,
                    next,
                    signedDelta: signedDeltaPointsLabel(entry.delta),
                  })}
                </p>
              </div>
              <p className="whitespace-pre-wrap font-sans text-sm text-foreground">
                {entry.feedback}
              </p>
              {entry.softSkills.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {entry.softSkills.map((skill) => (
                    <li
                      key={`${entry.id}-soft-${skill.softSkillId}`}
                      className="rounded-md border border-border bg-background px-2 py-0.5 font-sans text-[11px] text-foreground"
                    >
                      {(skill.displayName || skill.softSkillId) + `: ${skill.score}`}
                    </li>
                  ))}
                </ul>
              ) : null}
              {entry.technicalSkills.length > 0 ? (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {entry.technicalSkills.map((skill) => (
                    <li
                      key={`${entry.id}-tech-${skill.requirementKey}`}
                      className="rounded-md border border-border bg-background px-2 py-0.5 font-sans text-[11px] text-foreground"
                    >
                      {formatRequirementKey(skill.requirementKey)}
                      {skill.expectedValue
                        ? ` (${skill.expectedValue})`
                        : ""}
                      {`: ${skill.score}`}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
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
  const [form, setForm] = useState<InterviewFeedbackForm | null>(null)
  const [softScores, setSoftScores] = useState<Record<string, number | null>>({})
  const [techScores, setTechScores] = useState<Record<string, number | null>>({})
  const [isLoadingForm, setIsLoadingForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetFormFields = useCallback((nextForm: InterviewFeedbackForm | null) => {
    setFeedback("")
    setError(null)
    if (!nextForm) {
      setSoftScores({})
      setTechScores({})
      return
    }
    const soft: Record<string, number | null> = {}
    for (const skill of nextForm.softSkills) {
      soft[skill.id] = null
    }
    const tech: Record<string, number | null> = {}
    for (const skill of nextForm.technicalSkills) {
      tech[skill.requirementKey] = null
    }
    setSoftScores(soft)
    setTechScores(tech)
  }, [])

  const loadForm = useCallback(async () => {
    if (!applicationId) return
    setIsLoadingForm(true)
    setError(null)
    try {
      const nextForm = await fetchInterviewFeedbackForm(applicationId)
      setForm(nextForm)
      resetFormFields(nextForm)
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
      setForm(null)
      setError(message)
    } finally {
      setIsLoadingForm(false)
    }
  }, [applicationId, onClose, onComplete, resetFormFields, t])

  useEffect(() => {
    if (!isOpen || !applicationId) return
    setForm(null)
    resetFormFields(null)
    void loadForm()
    // Only reload when the modal opens for an application.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open/id gate
  }, [isOpen, applicationId])

  const handleClose = useCallback(() => {
    if (isSubmitting || isLoadingForm) return
    onClose()
  }, [isSubmitting, isLoadingForm, onClose])

  const softSkillIds = useMemo(
    () => (form?.softSkills ?? []).map((skill) => skill.id),
    [form]
  )
  const technicalKeys = useMemo(
    () => (form?.technicalSkills ?? []).map((skill) => skill.requirementKey),
    [form]
  )

  const softPayload = useMemo(
    () =>
      softSkillIds.map((softSkillId) => ({
        softSkillId,
        score: softScores[softSkillId] ?? null,
      })),
    [softSkillIds, softScores]
  )
  const techPayload = useMemo(
    () =>
      technicalKeys.map((requirementKey) => ({
        requirementKey,
        score: techScores[requirementKey] ?? null,
      })),
    [technicalKeys, techScores]
  )

  const coverageOk = validateInterviewFeedbackCoverage({
    softSkillIds,
    technicalRequirementKeys: technicalKeys,
    softSkills: softPayload,
    technicalSkills: techPayload,
  })

  const canSubmit =
    Boolean(applicationId) &&
    Boolean(form) &&
    !isLoadingForm &&
    !isSubmitting &&
    feedback.trim().length > 0 &&
    coverageOk

  const handleSubmit = useCallback(async () => {
    if (!applicationId || !form || isSubmitting || isLoadingForm) return
    const trimmed = feedback.trim()
    if (!trimmed) {
      setError(t("required"))
      return
    }
    if (
      !validateInterviewFeedbackCoverage({
        softSkillIds,
        technicalRequirementKeys: technicalKeys,
        softSkills: softPayload,
        technicalSkills: techPayload,
      })
    ) {
      setError(t("scoresRequired"))
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const result = await submitInterviewFeedback(applicationId, {
        feedback: trimmed,
        softSkills: softPayload.map((item) => ({
          softSkillId: item.softSkillId,
          score: item.score as number,
        })),
        technicalSkills: techPayload.map((item) => ({
          requirementKey: item.requirementKey,
          score: item.score as number,
        })),
      })
      onComplete({
        variant: "success",
        message: buildSuccessToastMessage(t, result),
        shouldRefresh: true,
      })
      const refreshed = await fetchInterviewFeedbackForm(applicationId)
      setForm(refreshed)
      resetFormFields(refreshed)
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
  }, [
    applicationId,
    feedback,
    form,
    isLoadingForm,
    isSubmitting,
    onClose,
    onComplete,
    resetFormFields,
    softPayload,
    softSkillIds,
    t,
    techPayload,
    technicalKeys,
  ])

  if (!applicationId) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("modalTitle")}
      size="lg"
      closeOnOverlayClick={!isSubmitting && !isLoadingForm}
      overlayZIndexClass="z-[100]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting || isLoadingForm}
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
      <div className="flex flex-col gap-4">
        {candidateLabel ? (
          <p className="font-sans text-sm text-muted-foreground">{candidateLabel}</p>
        ) : null}
        <p className="font-sans text-sm text-muted-foreground">{t("modalDescription")}</p>

        {isLoadingForm ? (
          <div
            className="flex items-center gap-2 font-sans text-sm text-muted-foreground"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("loadingForm")}
          </div>
        ) : null}

        {error ? (
          <p className="font-sans text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {form && !isLoadingForm ? (
          <>
            {form.softSkills.length > 0 ? (
              <section className="flex flex-col gap-3" aria-label={t("softSkillsTitle")}>
                <h3 className="font-sans text-sm font-semibold text-foreground">
                  {t("softSkillsTitle")}
                </h3>
                {form.softSkills.map((skill) => (
                  <ScoreSlider
                    key={skill.id}
                    id={`interview-feedback-soft-${skill.id}`}
                    label={skill.displayName}
                    value={softScores[skill.id] ?? null}
                    disabled={isSubmitting}
                    onChange={(next) =>
                      setSoftScores((prev) => ({ ...prev, [skill.id]: next }))
                    }
                    unsetLabel={t("scoreUnset")}
                  />
                ))}
              </section>
            ) : null}

            {form.technicalSkills.length > 0 ? (
              <section
                className="flex flex-col gap-3"
                aria-label={t("technicalSkillsTitle")}
              >
                <h3 className="font-sans text-sm font-semibold text-foreground">
                  {t("technicalSkillsTitle")}
                </h3>
                {form.technicalSkills.map((skill) => {
                  const keyLabel = formatRequirementKey(skill.requirementKey)
                  const label = skill.expectedValue
                    ? `${keyLabel} (${skill.expectedValue})`
                    : keyLabel
                  return (
                    <ScoreSlider
                      key={skill.requirementKey}
                      id={`interview-feedback-tech-${skill.requirementKey}`}
                      label={label}
                      value={techScores[skill.requirementKey] ?? null}
                      disabled={isSubmitting}
                      onChange={(next) =>
                        setTechScores((prev) => ({
                          ...prev,
                          [skill.requirementKey]: next,
                        }))
                      }
                      unsetLabel={t("scoreUnset")}
                    />
                  )
                })}
              </section>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="interview-feedback-modal-field"
                className="font-sans text-sm font-medium"
              >
                {t("fieldLabel")}
              </label>
              <textarea
                id="interview-feedback-modal-field"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={6}
                disabled={isSubmitting}
                placeholder={t("placeholder")}
                className="resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm disabled:opacity-60"
              />
            </div>

            <FeedbackHistoryList entries={form.entries} t={t} />
          </>
        ) : null}
      </div>
    </Modal>
  )
}
