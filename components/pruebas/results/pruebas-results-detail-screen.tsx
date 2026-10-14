"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"

import { AssessmentTypeBadge } from "@/components/pruebas/shared/assessment-type-badge"
import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import { PruebasResultsScoreChart } from "@/components/pruebas/results/pruebas-results-charts"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { formatMockDate } from "@/lib/pruebas/formatters"
import {
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
} from "@/lib/pruebas/mock-service"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"
import {
  buildResultsDetail,
  scoreChartPoints,
  type ResultsDetail,
  type ResultsQuestionItem,
} from "@/lib/pruebas/results"

const STATUS_STYLES = {
  reviewed: "border-emerald-300 bg-emerald-50 text-emerald-900",
  pending: "border-amber-300 bg-amber-50 text-amber-800",
} as const

function formatAnswerDisplay(
  item: ResultsQuestionItem,
  labels: {
    noAnswer: string
    trueLabel: string
    falseLabel: string
    likert: (value: string) => string
  },
): string {
  if (item.answerDisplay == null) {
    return labels.noAnswer
  }
  if (item.question.kind === "true_false") {
    if (item.answerDisplay === "true") {
      return labels.trueLabel
    }
    if (item.answerDisplay === "false") {
      return labels.falseLabel
    }
  }
  if (item.question.kind === "likert") {
    return labels.likert(item.answerDisplay)
  }
  return item.answerDisplay
}

export function PruebasResultsDetailScreen() {
  const t = useTranslations("PruebasPortal.results")
  const locale = useLocale()
  const params = useParams<{ assignmentId: string }>()
  const assignmentId = params.assignmentId

  const [detail, setDetail] = useState<ResultsDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

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

      const next = buildResultsDetail({
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
    } catch (error) {
      setDetail(null)
      setLoadError(
        error instanceof MockServiceError && error.code === "scenario_error"
          ? t("errors.scenario_error")
          : t("errors.generic"),
      )
    } finally {
      setIsLoading(false)
    }
  }, [assignmentId, t])

  useEffect(() => {
    void load()
  }, [load])

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8"
        aria-busy="true"
        aria-live="polite"
      >
        <PortalPageHeader
          title={t("detail.titleFallback")}
          description={t("description")}
        />
        <LoadingSkeleton rows={6} />
        <span className="sr-only">{t("states.loading")}</span>
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
              href={`${PRUEBAS_HOME_HREF}/resultados`}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              {t("detail.backToList")}
            </Link>
          }
        />
      </div>
    )
  }

  const applicationHref = `/portal-rrhh/vacantes/${encodeURIComponent(detail.vacancyId)}`
  const hasScore =
    detail.outcome === "with_result" &&
    detail.result.score != null &&
    detail.result.maxScore != null

  return (
    <div
      className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8"
      data-testid="results-detail"
      data-kind={detail.kind}
      data-outcome={detail.outcome}
    >
      <PortalPageHeader
        title={t("detail.title", { name: detail.candidateName })}
        description={t("detail.subtitle", {
          vacancy: detail.vacancyTitle,
          test: detail.testTitle,
          version: detail.versionNumber,
        })}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href={`${PRUEBAS_HOME_HREF}/resultados`}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
          data-testid="results-back"
        >
          {t("detail.backToList")}
        </Link>
        <Link
          href={applicationHref}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-vo-purple/40 bg-vo-purple/10 px-4 font-sans text-sm font-medium text-emerald-900 hover:bg-vo-purple/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
          data-testid="results-view-application"
        >
          {t("detail.viewApplication")}
        </Link>
        {detail.outcome === "with_result" &&
        detail.listStatus === "pending" ? (
          <Link
            href={`${PRUEBAS_HOME_HREF}/revision/${detail.assignmentId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-4 font-sans text-sm font-medium text-amber-800 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            data-testid="results-open-review"
          >
            {t("detail.openReview")}
          </Link>
        ) : null}
        <button
          type="button"
          disabled
          title={t("detail.exportUnavailable")}
          className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-md border border-border bg-muted px-4 font-sans text-sm font-medium text-muted-foreground"
          data-testid="results-export"
        >
          {t("detail.export")}
        </button>
      </div>
      <p className="font-sans text-xs text-muted-foreground" data-testid="results-export-hint">
        {t("detail.exportUnavailable")}
      </p>

      <div className="flex flex-wrap gap-2">
        <AssessmentTypeBadge
          kind={detail.kind}
          label={t(`kind.${detail.kind}`)}
        />
        {detail.outcome === "with_result" ? (
          <span
            data-testid="results-detail-status"
            data-status={detail.listStatus}
            className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-1 font-sans text-xs font-medium ${STATUS_STYLES[detail.listStatus]}`}
          >
            {t(`status.${detail.listStatus}`)}
          </span>
        ) : (
          <span
            data-testid="results-detail-status"
            data-status="no_result"
            className="inline-flex w-fit shrink-0 items-center rounded-full border border-border bg-muted px-2.5 py-1 font-sans text-xs font-medium text-muted-foreground"
          >
            {t("status.no_result")}
          </span>
        )}
      </div>

      {detail.outcome === "no_result" ? (
        <EmptyState
          title={t("detail.noResultTitle")}
          description={t("detail.noResultDescription")}
        />
      ) : null}

      {detail.outcome === "with_result" && hasScore ? (
        <section
          className="glass-card rounded-2xl p-4 sm:p-5"
          data-testid="results-score-summary"
        >
          <h2 className="mb-2 font-display text-base font-semibold text-foreground">
            {t("detail.score")}
          </h2>
          <p className="font-display text-3xl font-semibold text-emerald-900">
            {t("detail.scoreValue", {
              score: detail.result.score!,
              max: detail.result.maxScore!,
            })}
          </p>
          <p className="mt-2 font-sans text-sm text-muted-foreground">
            {t("detail.reviewStatus")}: {t(`status.${detail.listStatus}`)}
          </p>
        </section>
      ) : null}

      <section
        className="glass-card rounded-2xl p-4 sm:p-5"
        data-testid="results-session-time"
      >
        <h2 className="mb-2 font-display text-base font-semibold text-foreground">
          {t("detail.sessionTime")}
        </h2>
        {detail.hasSession ? (
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="font-sans text-xs text-muted-foreground">
                {t("detail.sessionStarted")}
              </dt>
              <dd className="font-sans text-sm text-foreground">
                {detail.sessionStartedAt
                  ? formatMockDate(detail.sessionStartedAt, locale)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs text-muted-foreground">
                {t("detail.sessionDeadline")}
              </dt>
              <dd className="font-sans text-sm text-foreground">
                {detail.sessionDeadlineAt
                  ? formatMockDate(detail.sessionDeadlineAt, locale)
                  : "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="font-sans text-sm text-muted-foreground" role="status">
            {t("detail.sessionMissing")}
          </p>
        )}
      </section>

      <section className="glass-card rounded-2xl p-4 sm:p-5">
        <h2 className="mb-2 font-display text-base font-semibold text-foreground">
          {t("detail.instructions")}
        </h2>
        <p className="font-sans text-sm text-foreground">{detail.instructions}</p>
      </section>

      {detail.outcome === "with_result" && detail.kind === "technical" ? (
        detail.hasCategoryScores ? (
          <PruebasResultsScoreChart
            testId="results-category-chart"
            title={t("detail.categoriesTitle")}
            points={scoreChartPoints(detail.categoryScores)}
            summaryCaption={t("detail.categoriesTitle")}
            emptyMessage={t("detail.categoriesInsufficient")}
          />
        ) : (
          <section
            className="glass-card rounded-2xl p-4 sm:p-5"
            data-testid="results-categories-insufficient"
          >
            <h2 className="mb-2 font-display text-base font-semibold text-foreground">
              {t("detail.categoriesTitle")}
            </h2>
            <p className="font-sans text-sm text-muted-foreground" role="status">
              {t("detail.categoriesInsufficient")}
            </p>
          </section>
        )
      ) : null}

      {detail.outcome === "with_result" &&
      detail.kind === "psychometric" &&
      detail.hasDimensionScores ? (
        <PruebasResultsScoreChart
          testId="results-dimensions-chart"
          title={t("detail.dimensionsTitle")}
          points={scoreChartPoints(detail.dimensionScores)}
          yDomain={[0, 100]}
          footnote={t("detail.dimensionsFootnote")}
          summaryCaption={t("detail.dimensionsSummary")}
          emptyMessage={t("detail.categoriesInsufficient")}
        />
      ) : null}

      {detail.outcome === "with_result" ? (
        <section
          className="flex flex-col gap-3"
          data-testid="results-questions"
          aria-labelledby="results-questions-heading"
        >
          <h2
            id="results-questions-heading"
            className="font-display text-base font-semibold text-foreground"
          >
            {t("detail.questionsTitle")}
          </h2>
          {detail.questions.length === 0 ? (
            <p className="font-sans text-sm text-muted-foreground">—</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {detail.questions.map((item, index) => (
                <li
                  key={item.question.id}
                  className="glass-card rounded-xl border border-border p-4"
                  data-testid={`results-question-${item.question.id}`}
                >
                  <p className="font-sans text-sm font-medium text-foreground">
                    {index + 1}. {item.question.prompt}
                  </p>
                  <p className="mt-2 font-sans text-sm text-foreground">
                    <span className="text-muted-foreground">
                      {t("detail.answer")}:{" "}
                    </span>
                    {formatAnswerDisplay(item, {
                      noAnswer: t("detail.noAnswer"),
                      trueLabel: t("detail.trueFalse.true"),
                      falseLabel: t("detail.trueFalse.false"),
                      likert: (value) =>
                        t("detail.likertValue", { value }),
                    })}
                  </p>
                  {item.verdict ? (
                    <p
                      className="mt-2 font-sans text-xs font-medium text-emerald-900"
                      data-testid={`results-verdict-${item.question.id}`}
                      data-verdict={item.verdict}
                    >
                      {t(`detail.verdict.${item.verdict}`)}
                    </p>
                  ) : null}
                  {item.question.kind === "open" ? (
                    <div className="mt-3 space-y-1">
                      <p className="font-sans text-sm text-muted-foreground">
                        {t("detail.rubric")}: {item.question.rubric}
                      </p>
                      {item.review?.pointsAwarded != null ? (
                        <p className="font-sans text-sm text-foreground">
                          {t("detail.reviewPoints", {
                            points: item.review.pointsAwarded,
                            max: item.question.maxPoints,
                          })}
                        </p>
                      ) : null}
                      {item.review?.reviewerNotes ? (
                        <p className="font-sans text-sm text-foreground">
                          {t("detail.reviewNotes")}: {item.review.reviewerNotes}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  )
}
