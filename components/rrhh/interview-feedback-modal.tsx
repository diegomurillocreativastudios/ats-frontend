"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
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
import { getInitials } from "@/lib/getInitials"
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
  vacancyLabel?: string | null
  onComplete: (payload: InterviewFeedbackCompletePayload) => void
}

const SCORE_MIN = 1
const SCORE_MAX = 10
const SCORE_VALUES = Array.from(
  { length: SCORE_MAX - SCORE_MIN + 1 },
  (_, index) => SCORE_MIN + index
)

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

function countSetScores(scores: Record<string, number | null>): number {
  return Object.values(scores).filter((value) => value != null).length
}

function ScoreChips({
  id,
  label,
  value,
  disabled,
  onChange,
  expectedValue,
}: {
  id: string
  label: string
  value: number | null
  disabled: boolean
  onChange: (next: number) => void
  expectedValue?: string
}) {
  const t = useTranslations("RecruiterPortal.vacancies.matching.interviewFeedback")
  const labelId = `${id}-label`
  const expected = expectedValue?.trim() ?? ""

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            id={labelId}
            className="font-sans text-sm font-medium text-foreground"
          >
            {label}
          </p>
          {expected ? (
            <p
              className="mt-1 inline-flex rounded-md border border-border bg-muted px-2 py-0.5 font-sans text-[11px] font-medium text-foreground"
              title={t("expectedLevel", { level: expected })}
            >
              {expected}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 font-sans text-xs font-medium tabular-nums text-muted-foreground">
          {value == null ? t("notScored") : t("scoreValue", { score: value })}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-required="true"
        className="flex flex-wrap gap-1.5"
      >
        {SCORE_VALUES.map((score) => {
          const isSelected = value === score
          return (
            <label
              key={score}
              className={disabled ? "cursor-not-allowed" : "cursor-pointer"}
            >
              <input
                type="radio"
                name={id}
                value={score}
                checked={isSelected}
                disabled={disabled}
                onChange={() => onChange(score)}
                className="peer sr-only"
                aria-label={t("scoreChipAria", { skill: label, score })}
              />
              <span className="inline-flex min-h-11 min-w-11 select-none items-center justify-center rounded-md border border-border bg-background font-sans text-sm font-medium tabular-nums text-foreground transition-colors hover:bg-muted peer-checked:border-vo-purple peer-checked:bg-vo-purple peer-checked:font-semibold peer-checked:text-white peer-checked:hover:bg-vo-purple-hover peer-focus-visible:ring-2 peer-focus-visible:ring-vo-purple peer-focus-visible:ring-offset-2 peer-disabled:opacity-60">
                {score}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function FeedbackHistoryList({
  entries,
  isOpen,
  onOpenChange,
  t,
}: {
  entries: InterviewFeedbackEntry[]
  isOpen: boolean
  onOpenChange: (next: boolean) => void
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  if (entries.length === 0) return null

  return (
    <details
      className="border-t border-border pt-4"
      open={isOpen}
      onToggle={(event) => {
        onOpenChange(event.currentTarget.open)
      }}
    >
      <summary className="cursor-pointer rounded-md font-sans text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2">
        {t("historyTitle")} ({entries.length})
      </summary>
      <ul className="mt-3 flex flex-col gap-3">
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
    </details>
  )
}

export function InterviewFeedbackModal({
  isOpen,
  onClose,
  applicationId,
  candidateLabel,
  vacancyLabel,
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

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
    setIsHistoryOpen(false)
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

  const totalSkills = softSkillIds.length + technicalKeys.length
  const scoredCount = countSetScores(softScores) + countSetScores(techScores)
  const hasComment = feedback.trim().length > 0

  const canSubmit =
    Boolean(applicationId) &&
    Boolean(form) &&
    !isLoadingForm &&
    !isSubmitting &&
    hasComment &&
    coverageOk

  const progressText = useMemo(() => {
    const parts: string[] = []
    if (totalSkills > 0) {
      parts.push(t("progressSkills", { scored: scoredCount, total: totalSkills }))
    }
    parts.push(hasComment ? t("progressCommentReady") : t("progressCommentMissing"))
    return parts.join(" · ")
  }, [hasComment, scoredCount, t, totalSkills])

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
      setIsHistoryOpen(true)
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

  const trimmedCandidate = candidateLabel?.trim() ?? ""
  const trimmedVacancy = vacancyLabel?.trim() ?? ""
  const showSkills = Boolean(
    form && !isLoadingForm && (form.softSkills.length > 0 || form.technicalSkills.length > 0)
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("modalTitle")}
      size="lg"
      closeOnOverlayClick={!isSubmitting && !isLoadingForm}
      overlayZIndexClass="z-[100]"
      contentClassName="modal-surface-solid"
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {form && !isLoadingForm ? (
            <p
              id="interview-feedback-progress"
              className="font-sans text-xs text-muted-foreground"
              aria-live="polite"
            >
              {progressText}
            </p>
          ) : (
            <span className="hidden sm:block" />
          )}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting || isLoadingForm}
              className="min-h-11"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              loading={isSubmitting}
              aria-describedby={form && !isLoadingForm ? "interview-feedback-progress" : undefined}
              className="min-h-11 bg-vo-purple text-white hover:bg-vo-purple-hover"
            >
              {isSubmitting ? t("submitting") : t("submit")}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {trimmedCandidate ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vo-purple font-sans text-sm font-semibold text-white"
              aria-hidden
            >
              {getInitials(trimmedCandidate)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-sans text-sm font-semibold text-foreground">
                {trimmedCandidate}
              </p>
              {trimmedVacancy ? (
                <p className="truncate font-sans text-xs text-muted-foreground">
                  {trimmedVacancy}
                </p>
              ) : null}
            </div>
          </div>
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
            {showSkills ? (
              <p className="font-sans text-xs text-muted-foreground">{t("scaleLegend")}</p>
            ) : null}

            {form.softSkills.length > 0 ? (
              <section className="flex flex-col gap-3" aria-label={t("softSkillsTitle")}>
                <h3 className="font-sans text-sm font-semibold text-foreground">
                  {t("softSkillsTitle")}
                </h3>
                {form.softSkills.map((skill) => (
                  <ScoreChips
                    key={skill.id}
                    id={`interview-feedback-soft-${skill.id}`}
                    label={skill.displayName}
                    value={softScores[skill.id] ?? null}
                    disabled={isSubmitting}
                    onChange={(next) =>
                      setSoftScores((prev) => ({ ...prev, [skill.id]: next }))
                    }
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
                {form.technicalSkills.map((skill) => (
                  <ScoreChips
                    key={skill.requirementKey}
                    id={`interview-feedback-tech-${skill.requirementKey}`}
                    label={formatRequirementKey(skill.requirementKey)}
                    expectedValue={skill.expectedValue}
                    value={techScores[skill.requirementKey] ?? null}
                    disabled={isSubmitting}
                    onChange={(next) =>
                      setTechScores((prev) => ({
                        ...prev,
                        [skill.requirementKey]: next,
                      }))
                    }
                  />
                ))}
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
                rows={5}
                disabled={isSubmitting}
                required
                aria-invalid={Boolean(error) && !hasComment}
                placeholder={t("placeholder")}
                className="min-h-34 resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm disabled:opacity-60"
              />
            </div>

            <FeedbackHistoryList
              entries={form.entries}
              isOpen={isHistoryOpen}
              onOpenChange={setIsHistoryOpen}
              t={t}
            />
          </>
        ) : null}
      </div>
    </Modal>
  )
}
