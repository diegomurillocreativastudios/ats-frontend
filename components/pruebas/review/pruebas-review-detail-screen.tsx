"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"

import { ConfirmDialog } from "@/components/pruebas/shared/confirm-dialog"
import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"
import {
  buildReviewDetail,
  validateReviewDrafts,
  type ReviewDetail,
} from "@/lib/pruebas/review"
import {
  finishReview,
  listApplications,
  listAssignments,
  listCandidates,
  listQuestions,
  listResults,
  listReviews,
  listSessions,
  listTests,
  listVacancies,
  listVersions,
  MockServiceError,
  saveReviewDrafts,
} from "@/lib/pruebas/mock-service"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"

const CONTROL_CLASS =
  "h-11 w-full rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

type DraftMap = Record<string, { pointsRaw: string; notes: string }>

const KNOWN_ERROR_CODES = new Set([
  "not_found",
  "scenario_error",
  "action_not_allowed",
  "invalid_points",
])

function resolveErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  if (error instanceof MockServiceError && KNOWN_ERROR_CODES.has(error.code)) {
    return t(`errors.${error.code}`)
  }
  return t("errors.generic")
}

function draftsFromDetail(detail: ReviewDetail): DraftMap {
  const next: DraftMap = {}
  for (const item of detail.openItems) {
    next[item.question.id] = {
      pointsRaw:
        item.review?.pointsAwarded != null
          ? String(item.review.pointsAwarded)
          : "",
      notes: item.review?.reviewerNotes ?? "",
    }
  }
  return next
}

export function PruebasReviewDetailScreen() {
  const t = useTranslations("PruebasPortal.review")
  const params = useParams<{ assignmentId: string }>()
  const router = useRouter()
  const assignmentId = params.assignmentId

  const [detail, setDetail] = useState<ReviewDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [drafts, setDrafts] = useState<DraftMap>({})
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, "empty" | "invalid">
  >({})
  const [isSaving, setIsSaving] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success" as "success" | "error",
    message: "",
  })

  const load = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    setNotFound(false)
    try {
      const [
        assignments,
        applications,
        candidates,
        vacancies,
        tests,
        versions,
        questions,
        results,
        sessions,
        reviews,
      ] = await Promise.all([
        listAssignments(),
        listApplications(),
        listCandidates(),
        listVacancies(),
        listTests(),
        listVersions(),
        listQuestions(),
        listResults(),
        listSessions(),
        listReviews(assignmentId),
      ])
      const next = buildReviewDetail({
        assignmentId,
        assignments,
        applications,
        candidates,
        vacancies,
        tests,
        versions,
        questions,
        results,
        sessions,
        reviews,
      })
      if (!next) {
        setDetail(null)
        setNotFound(true)
        return
      }
      setDetail(next)
      setDrafts(draftsFromDetail(next))
      setFieldErrors({})
    } catch (error) {
      setDetail(null)
      setLoadError(resolveErrorMessage(error, t))
    } finally {
      setIsLoading(false)
    }
  }, [assignmentId, t])

  useEffect(() => {
    void load()
  }, [load])

  const validationItems = useMemo(() => {
    if (!detail) return []
    return detail.openItems.map((item) => ({
      questionId: item.question.id,
      maxPoints: item.question.maxPoints,
      pointsRaw: drafts[item.question.id]?.pointsRaw ?? "",
    }))
  }, [detail, drafts])

  const showToast = (variant: "success" | "error", message: string) => {
    setSnackbar({ open: true, variant, message })
  }

  const collectItemsOrErrors = () => {
    const errors = validateReviewDrafts(validationItems)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0 || !detail) {
      return null
    }
    return detail.openItems.map((item) => {
      const draft = drafts[item.question.id]!
      return {
        questionId: item.question.id,
        pointsAwarded: Number(draft.pointsRaw.trim()),
        reviewerNotes: draft.notes.trim() || undefined,
      }
    })
  }

  const handleSave = async () => {
    const items = collectItemsOrErrors()
    if (!items) {
      showToast("error", t("toasts.validationFailed"))
      return
    }
    setIsSaving(true)
    try {
      await saveReviewDrafts({ assignmentId, items })
      showToast("success", t("toasts.saved"))
      await load()
    } catch (error) {
      showToast("error", resolveErrorMessage(error, t))
    } finally {
      setIsSaving(false)
    }
  }

  const handleFinishConfirm = async () => {
    const items = collectItemsOrErrors()
    if (!items) {
      setConfirmFinish(false)
      showToast("error", t("toasts.validationFailed"))
      return
    }
    setIsFinishing(true)
    try {
      await finishReview({ assignmentId, items })
      showToast("success", t("toasts.finished"))
      setConfirmFinish(false)
      router.push(`${PRUEBAS_HOME_HREF}/revision`)
    } catch (error) {
      showToast("error", resolveErrorMessage(error, t))
      setConfirmFinish(false)
    } finally {
      setIsFinishing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          title={t("detail.titleFallback")}
          description={t("description")}
        />
        <LoadingSkeleton rows={6} />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          title={t("detail.titleFallback")}
          description={t("description")}
        />
        <ErrorState
          title={t("states.errorTitle")}
          description={t("states.errorDescription")}
          action={
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              {t("states.retry")}
            </button>
          }
        />
      </div>
    )
  }

  if (notFound || !detail) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          title={t("detail.titleFallback")}
          description={t("description")}
        />
        <EmptyState
          title={t("states.notFoundTitle")}
          description={t("states.notFoundDescription")}
          action={
            <Link
              href={`${PRUEBAS_HOME_HREF}/revision`}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-vo-purple/40 bg-vo-purple/10 px-4 font-sans text-sm font-medium text-emerald-900 hover:bg-vo-purple/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
              data-testid="review-back-queue"
            >
              {t("detail.backToQueue")}
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <PortalPageHeader
        title={t("detail.title", { name: detail.candidateName })}
        description={t("detail.subtitle", {
          vacancy: detail.vacancyTitle,
          test: detail.testTitle,
          version: detail.versionNumber,
        })}
      />

      <div className="flex flex-wrap gap-3">
        <Link
          href={`${PRUEBAS_HOME_HREF}/revision`}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
          data-testid="review-back-queue"
        >
          {t("detail.backToQueue")}
        </Link>
      </div>

      <section
        className="glass-card rounded-xl border border-border p-4 md:p-5"
        aria-labelledby="review-instructions-heading"
      >
        <h2
          id="review-instructions-heading"
          className="font-display text-base font-semibold text-foreground"
        >
          {t("detail.instructions")}
        </h2>
        <p className="mt-2 font-sans text-sm text-foreground">
          {detail.instructions}
        </p>
      </section>

      <ol className="flex flex-col gap-4" data-testid="review-open-items">
        {detail.openItems.map((item, index) => {
          const draft = drafts[item.question.id] ?? {
            pointsRaw: "",
            notes: "",
          }
          const error = fieldErrors[item.question.id]
          const pointsId = `review-points-${item.question.id}`
          const notesId = `review-notes-${item.question.id}`
          return (
            <li
              key={item.question.id}
              className="glass-card flex flex-col gap-4 rounded-xl border border-border p-4 md:p-5"
              data-testid="review-open-item"
              data-question-id={item.question.id}
            >
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("detail.questionLabel", { index: index + 1 })}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
                  {item.question.prompt}
                </h3>
              </div>

              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("detail.answer")}
                </p>
                <p
                  className="mt-1 whitespace-pre-wrap font-sans text-sm text-foreground"
                  data-testid={`review-answer-${item.question.id}`}
                >
                  {item.answerText ?? t("detail.noAnswer")}
                </p>
              </div>

              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("detail.rubric")}
                </p>
                <p className="mt-1 font-sans text-sm text-foreground">
                  {item.question.rubric}
                </p>
                <p className="mt-1 font-sans text-xs text-muted-foreground">
                  {t("detail.maxPoints", { max: item.question.maxPoints })}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={pointsId}
                  className="font-sans text-sm font-medium text-foreground"
                >
                  {t("detail.points")}
                </label>
                <input
                  id={pointsId}
                  type="text"
                  inputMode="numeric"
                  data-testid={`review-points-${item.question.id}`}
                  className={CONTROL_CLASS}
                  value={draft.pointsRaw}
                  aria-invalid={Boolean(error)}
                  aria-describedby={
                    error ? `${pointsId}-error` : `${pointsId}-hint`
                  }
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [item.question.id]: {
                        ...draft,
                        pointsRaw: event.target.value,
                      },
                    }))
                  }
                />
                <p
                  id={`${pointsId}-hint`}
                  className="font-sans text-xs text-muted-foreground"
                >
                  {t("detail.pointsHint", { max: item.question.maxPoints })}
                </p>
                {error ? (
                  <p
                    id={`${pointsId}-error`}
                    className="font-sans text-sm text-destructive"
                    role="alert"
                    data-testid={`review-points-error-${item.question.id}`}
                  >
                    {error === "empty"
                      ? t("validation.pointsRequired")
                      : t("validation.pointsInvalid", {
                          max: item.question.maxPoints,
                        })}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={notesId}
                  className="font-sans text-sm font-medium text-foreground"
                >
                  {t("detail.notes")}
                </label>
                <textarea
                  id={notesId}
                  data-testid={`review-notes-${item.question.id}`}
                  className={TEXTAREA_CLASS}
                  value={draft.notes}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [item.question.id]: {
                        ...draft,
                        notes: event.target.value,
                      },
                    }))
                  }
                />
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          data-testid="review-save"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving || isFinishing}
          onClick={() => void handleSave()}
        >
          {isSaving ? t("detail.saving") : t("detail.save")}
        </button>
        <button
          type="button"
          data-testid="review-finish"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-vo-purple px-4 font-sans text-sm font-medium text-white hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving || isFinishing}
          onClick={() => {
            const items = collectItemsOrErrors()
            if (!items) {
              showToast("error", t("toasts.validationFailed"))
              return
            }
            setConfirmFinish(true)
          }}
        >
          {t("detail.finish")}
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        title={t("confirm.finishTitle")}
        description={t("confirm.finishDescription", {
          name: detail.candidateName,
        })}
        confirmLabel={t("confirm.finishConfirm")}
        cancelLabel={t("confirm.dismiss")}
        onConfirm={() => void handleFinishConfirm()}
        isConfirmLoading={isFinishing}
      />

      <Snackbar
        open={snackbar.open}
        variant={snackbar.variant}
        message={snackbar.message}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
      />
    </div>
  )
}
