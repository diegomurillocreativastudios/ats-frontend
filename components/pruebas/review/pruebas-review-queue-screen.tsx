"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"

import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { ResponsiveFilters } from "@/components/ui/responsive-filters"
import { formatMockDate } from "@/lib/pruebas/formatters"
import {
  buildReviewQueueRows,
  filterReviewQueueRows,
  type ReviewQueueFilters,
} from "@/lib/pruebas/review"
import {
  listApplications,
  listAssignments,
  listCandidates,
  listQuestions,
  listResults,
  listSessions,
  listTests,
  listVacancies,
  listVersions,
  MockServiceError,
} from "@/lib/pruebas/mock-service"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"
import type {
  MockApplication,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockAssignment,
  MockCandidateProfile,
  MockQuestion,
  MockResult,
  MockSession,
  MockVacancy,
} from "@/lib/pruebas/types"

const CONTROL_CLASS =
  "h-11 w-full rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"

const EMPTY_FILTERS: ReviewQueueFilters = {
  query: "",
  vacancyId: null,
}

function filtersHaveValues(filters: ReviewQueueFilters): boolean {
  return Boolean(filters.query.trim() || filters.vacancyId)
}

export function PruebasReviewQueueScreen() {
  const t = useTranslations("PruebasPortal.review")
  const locale = useLocale()

  const [assignments, setAssignments] = useState<MockAssignment[]>([])
  const [applications, setApplications] = useState<MockApplication[]>([])
  const [candidates, setCandidates] = useState<MockCandidateProfile[]>([])
  const [vacancies, setVacancies] = useState<MockVacancy[]>([])
  const [tests, setTests] = useState<MockAssessmentTest[]>([])
  const [versions, setVersions] = useState<MockAssessmentVersion[]>([])
  const [questions, setQuestions] = useState<MockQuestion[]>([])
  const [results, setResults] = useState<MockResult[]>([])
  const [sessions, setSessions] = useState<MockSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isStoreEmpty, setIsStoreEmpty] = useState(false)
  const [filters, setFilters] = useState<ReviewQueueFilters>(EMPTY_FILTERS)

  const load = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const [
        nextAssignments,
        nextApplications,
        nextCandidates,
        nextVacancies,
        nextTests,
        nextVersions,
        nextQuestions,
        nextResults,
        nextSessions,
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
      ])
      setAssignments(nextAssignments)
      setApplications(nextApplications)
      setCandidates(nextCandidates)
      setVacancies(nextVacancies)
      setTests(nextTests)
      setVersions(nextVersions)
      setQuestions(nextQuestions)
      setResults(nextResults)
      setSessions(nextSessions)
      setIsStoreEmpty(nextAssignments.length === 0 && nextTests.length === 0)
    } catch (error) {
      setAssignments([])
      setIsStoreEmpty(false)
      setLoadError(
        error instanceof MockServiceError
          ? t("errors.scenario_error")
          : t("errors.generic"),
      )
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(
    () =>
      buildReviewQueueRows({
        assignments,
        applications,
        candidates,
        vacancies,
        tests,
        versions,
        questions,
        results,
        sessions,
      }),
    [
      assignments,
      applications,
      candidates,
      vacancies,
      tests,
      versions,
      questions,
      results,
      sessions,
    ],
  )

  const filteredRows = useMemo(
    () => filterReviewQueueRows(rows, filters),
    [rows, filters],
  )

  const vacancyOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of rows) {
      map.set(row.vacancyId, row.vacancyTitle)
    }
    return [...map.entries()].map(([id, title]) => ({ id, title }))
  }, [rows])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader title={t("title")} description={t("description")} />
        <LoadingSkeleton rows={5} />
        <span className="sr-only">{t("states.loading")}</span>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader title={t("title")} description={t("description")} />
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

  if (isStoreEmpty) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader title={t("title")} description={t("description")} />
        <EmptyState
          title={t("states.emptyTitle")}
          description={t("states.emptyDescription")}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <PortalPageHeader title={t("title")} description={t("description")} />

      <p
        className="rounded-lg border border-vo-purple/30 bg-vo-purple/10 px-3 py-2 font-sans text-sm text-emerald-900"
        data-testid="review-scope-notice"
      >
        {t("scopeNotice")}
      </p>

      <div
        className="flex flex-wrap items-center gap-3"
        data-testid="review-pending-count"
      >
        <span className="inline-flex min-h-11 items-center rounded-full border border-amber-300 bg-amber-50 px-3 font-sans text-sm font-medium text-amber-800">
          {t("pendingCount", { count: rows.length })}
        </span>
        {filtersHaveValues(filters) ? (
          <span className="font-sans text-sm text-muted-foreground">
            {t("filteredCount", { count: filteredRows.length })}
          </span>
        ) : null}
      </div>

      <ResponsiveFilters
        title={t("filters.title")}
        toggleLabel={t("filters.toggle")}
        regionLabel={t("filters.regionLabel")}
        hasActiveFilters={filtersHaveValues(filters)}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label
              htmlFor="pruebas-review-search"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("search")}
            </label>
            <input
              id="pruebas-review-search"
              data-testid="review-filter-query"
              className={CONTROL_CLASS}
              value={filters.query}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  query: event.target.value,
                }))
              }
              placeholder={t("searchPlaceholder")}
            />
          </div>
          <div className="flex w-full flex-col gap-1.5 md:w-64">
            <label
              htmlFor="pruebas-review-vacancy"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.vacancy")}
            </label>
            <select
              id="pruebas-review-vacancy"
              data-testid="review-filter-vacancy"
              className={CONTROL_CLASS}
              value={filters.vacancyId ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  vacancyId: event.target.value || null,
                }))
              }
            >
              <option value="">{t("filters.all")}</option>
              {vacancyOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          </div>
          {filtersHaveValues(filters) ? (
            <button
              type="button"
              data-testid="review-filters-clear"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              {t("filters.clear")}
            </button>
          ) : null}
        </div>
      </ResponsiveFilters>

      {filteredRows.length === 0 ? (
        <EmptyState
          title={
            filtersHaveValues(filters)
              ? t("states.filterEmptyTitle")
              : t("states.queueEmptyTitle")
          }
          description={
            filtersHaveValues(filters)
              ? t("states.filterEmptyDescription")
              : t("states.queueEmptyDescription")
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.candidate")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.vacancy")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.version")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.openQuestions")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.completedAt")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.assignmentId}
                    className="border-b border-border last:border-b-0"
                    data-testid="review-queue-row"
                    data-assignment-id={row.assignmentId}
                  >
                    <td className="px-4 py-3">
                      <p className="font-sans text-sm font-medium text-foreground">
                        {row.candidateName}
                      </p>
                      <p className="font-sans text-xs text-muted-foreground">
                        {row.candidateEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-foreground">
                      {row.vacancyTitle}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-foreground">
                      {row.versionLabel}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-foreground">
                      {row.openQuestionCount}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-foreground">
                      {row.completedAt
                        ? formatMockDate(row.completedAt, locale)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`${PRUEBAS_HOME_HREF}/revision/${row.assignmentId}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-vo-purple/40 bg-vo-purple/10 px-3 font-sans text-sm font-medium text-emerald-900 hover:bg-vo-purple/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                        data-testid={`review-open-${row.assignmentId}`}
                      >
                        {t("table.open")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 lg:hidden" data-testid="review-queue-cards">
            {filteredRows.map((row) => (
              <li
                key={row.assignmentId}
                className="glass-card flex flex-col gap-3 rounded-xl border border-border p-4"
                data-testid="review-queue-row"
                data-assignment-id={row.assignmentId}
              >
                <div>
                  <p className="font-display text-base font-semibold text-foreground">
                    {row.candidateName}
                  </p>
                  <p className="font-sans text-sm text-muted-foreground">
                    {row.vacancyTitle}
                  </p>
                  <p className="mt-1 font-sans text-xs text-muted-foreground">
                    {row.versionLabel}
                  </p>
                </div>
                <p className="font-sans text-sm text-foreground">
                  {t("table.openQuestions")}: {row.openQuestionCount}
                </p>
                <Link
                  href={`${PRUEBAS_HOME_HREF}/revision/${row.assignmentId}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-vo-purple/40 bg-vo-purple/10 px-4 font-sans text-sm font-medium text-emerald-900 hover:bg-vo-purple/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                  data-testid={`review-open-${row.assignmentId}`}
                >
                  {t("table.open")}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
