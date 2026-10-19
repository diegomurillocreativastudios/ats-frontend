"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"

import { AssessmentTypeBadge } from "@/components/pruebas/shared/assessment-type-badge"
import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import { ListPaginationBar } from "@/components/ui/list-pagination-bar"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { ResponsiveFilters } from "@/components/ui/responsive-filters"
import { PORTAL_ASSESSMENT_KIND } from "@/lib/pruebas/assessment-kind"
import { formatMockDate } from "@/lib/pruebas/formatters"
import {
  listApplications,
  listAssignments,
  listCandidates,
  listResults,
  listTests,
  listVacancies,
  listVersions,
  MockServiceError,
} from "@/lib/pruebas/mock-service"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"
import {
  buildResultsListRows,
  filterResultsListRows,
  paginateResultsRows,
  type ResultsListFilters,
  type ResultsListStatus,
} from "@/lib/pruebas/results"
import type {
  MockApplication,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockAssignment,
  MockCandidateProfile,
  MockResult,
  MockVacancy,
} from "@/lib/pruebas/types"

const CONTROL_CLASS =
  "h-11 w-full rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"

const EMPTY_FILTERS: ResultsListFilters = {
  query: "",
  vacancyId: null,
  kind: null,
  status: null,
  assignedFrom: null,
  assignedTo: null,
}

const STATUS_OPTIONS: readonly ResultsListStatus[] = [
  "reviewed",
  "pending",
  "no_result",
]

const STATUS_STYLES: Record<ResultsListStatus, string> = {
  reviewed: "border-emerald-300 bg-emerald-50 text-emerald-900",
  pending: "border-amber-300 bg-amber-50 text-amber-800",
  no_result: "border-border bg-muted text-muted-foreground",
}

function filtersHaveValues(filters: ResultsListFilters): boolean {
  return Boolean(
    filters.query.trim() ||
      filters.vacancyId ||
      filters.kind ||
      filters.status ||
      filters.assignedFrom ||
      filters.assignedTo,
  )
}

function StatusPill({
  status,
  label,
}: {
  status: ResultsListStatus
  label: string
}) {
  return (
    <span
      data-testid="results-status-badge"
      data-status={status}
      className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-1 font-sans text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  )
}

export function PruebasResultsListScreen() {
  const t = useTranslations("PruebasPortal.results")
  const locale = useLocale()

  const [assignments, setAssignments] = useState<MockAssignment[]>([])
  const [applications, setApplications] = useState<MockApplication[]>([])
  const [candidates, setCandidates] = useState<MockCandidateProfile[]>([])
  const [vacancies, setVacancies] = useState<MockVacancy[]>([])
  const [tests, setTests] = useState<MockAssessmentTest[]>([])
  const [versions, setVersions] = useState<MockAssessmentVersion[]>([])
  const [results, setResults] = useState<MockResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isStoreEmpty, setIsStoreEmpty] = useState(false)
  const [filters, setFilters] = useState<ResultsListFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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
        nextResults,
      ] = await Promise.all([
        listAssignments(),
        listApplications(),
        listCandidates(),
        listVacancies(),
        listTests(),
        listVersions(),
        listResults(),
      ])
      setAssignments(nextAssignments)
      setApplications(nextApplications)
      setCandidates(nextCandidates)
      setVacancies(nextVacancies)
      setTests(nextTests)
      setVersions(nextVersions)
      setResults(nextResults)
      setIsStoreEmpty(nextAssignments.length === 0 && nextResults.length === 0)
    } catch (error) {
      setLoadError(
        error instanceof MockServiceError && error.code === "scenario_error"
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
      buildResultsListRows({
        assignments,
        applications,
        candidates,
        vacancies,
        tests,
        versions,
        results,
      }).filter((row) => row.kind === PORTAL_ASSESSMENT_KIND),
    [
      assignments,
      applications,
      candidates,
      vacancies,
      tests,
      versions,
      results,
    ],
  )

  const filteredRows = useMemo(
    () => filterResultsListRows(rows, filters),
    [rows, filters],
  )

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = useMemo(
    () => paginateResultsRows(filteredRows, safePage, pageSize),
    [filteredRows, safePage, pageSize],
  )

  useEffect(() => {
    setPage(1)
  }, [filters, pageSize])

  const vacancyOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const row of rows) {
      if (!seen.has(row.vacancyId)) {
        seen.set(row.vacancyId, row.vacancyTitle)
      }
    }
    return [...seen.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [rows])

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8"
        aria-busy="true"
        aria-live="polite"
      >
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

      <div className="flex flex-wrap items-center gap-3" data-testid="results-count">
        <span className="inline-flex min-h-11 items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 font-sans text-sm font-medium text-emerald-900">
          {t("count", { count: rows.length })}
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-1.5 md:col-span-2 xl:col-span-1">
            <label
              htmlFor="pruebas-results-search"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("search")}
            </label>
            <input
              id="pruebas-results-search"
              data-testid="results-filter-query"
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
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pruebas-results-vacancy"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.vacancy")}
            </label>
            <select
              id="pruebas-results-vacancy"
              data-testid="results-filter-vacancy"
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
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pruebas-results-status"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.status")}
            </label>
            <select
              id="pruebas-results-status"
              data-testid="results-filter-status"
              className={CONTROL_CLASS}
              value={filters.status ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: (event.target.value ||
                    null) as ResultsListStatus | null,
                }))
              }
            >
              <option value="">{t("filters.all")}</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pruebas-results-from"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.assignedFrom")}
            </label>
            <input
              id="pruebas-results-from"
              type="date"
              data-testid="results-filter-from"
              className={CONTROL_CLASS}
              value={filters.assignedFrom ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  assignedFrom: event.target.value || null,
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pruebas-results-to"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.assignedTo")}
            </label>
            <input
              id="pruebas-results-to"
              type="date"
              data-testid="results-filter-to"
              className={CONTROL_CLASS}
              value={filters.assignedTo ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  assignedTo: event.target.value || null,
                }))
              }
            />
          </div>
          {filtersHaveValues(filters) ? (
            <div className="flex items-end">
              <button
                type="button"
                data-testid="results-filters-clear"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                {t("filters.clear")}
              </button>
            </div>
          ) : null}
        </div>
      </ResponsiveFilters>

      {filteredRows.length === 0 ? (
        <EmptyState
          title={
            filtersHaveValues(filters)
              ? t("states.filterEmptyTitle")
              : t("states.listEmptyTitle")
          }
          description={
            filtersHaveValues(filters)
              ? t("states.filterEmptyDescription")
              : t("states.listEmptyDescription")
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
            <table className="w-full min-w-[880px] border-collapse text-left">
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
                    {t("table.kind")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.status")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.score")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.assignedAt")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr
                    key={row.assignmentId}
                    className="border-b border-border last:border-b-0"
                    data-testid="results-list-row"
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
                    <td className="px-4 py-3">
                      <AssessmentTypeBadge
                        kind={row.kind}
                        label={t(`kind.${row.kind}`)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        status={row.listStatus}
                        label={t(`status.${row.listStatus}`)}
                      />
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-foreground">
                      {row.score != null && row.maxScore != null
                        ? t("table.scoreValue", {
                            score: row.score,
                            max: row.maxScore,
                          })
                        : t("table.scoreEmpty")}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-foreground">
                      {formatMockDate(row.assignedAt, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`${PRUEBAS_HOME_HREF}/resultados/${row.assignmentId}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-vo-purple/40 bg-vo-purple/10 px-3 font-sans text-sm font-medium text-emerald-900 hover:bg-vo-purple/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                        data-testid={`results-open-${row.assignmentId}`}
                      >
                        {t("table.open")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul
            className="flex flex-col gap-3 lg:hidden"
            data-testid="results-list-cards"
          >
            {pageRows.map((row) => (
              <li
                key={row.assignmentId}
                className="glass-card flex flex-col gap-3 rounded-xl border border-border p-4"
                data-testid="results-list-row"
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
                <div className="flex flex-wrap gap-2">
                  <AssessmentTypeBadge
                    kind={row.kind}
                    label={t(`kind.${row.kind}`)}
                  />
                  <StatusPill
                    status={row.listStatus}
                    label={t(`status.${row.listStatus}`)}
                  />
                </div>
                <p className="font-sans text-sm text-foreground">
                  {t("table.score")}:{" "}
                  {row.score != null && row.maxScore != null
                    ? t("table.scoreValue", {
                        score: row.score,
                        max: row.maxScore,
                      })
                    : t("table.scoreEmpty")}
                </p>
                <Link
                  href={`${PRUEBAS_HOME_HREF}/resultados/${row.assignmentId}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-vo-purple/40 bg-vo-purple/10 px-4 font-sans text-sm font-medium text-emerald-900 hover:bg-vo-purple/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                  data-testid={`results-open-${row.assignmentId}`}
                >
                  {t("table.open")}
                </Link>
              </li>
            ))}
          </ul>

          <ListPaginationBar
            page={safePage}
            pageSize={pageSize}
            totalCount={filteredRows.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
            labels={{
              perPage: t("pagination.perPage"),
              pageSizeAria: t("pagination.pageSizeAria"),
              regionAria: t("pagination.regionAria"),
              summary: t("pagination.summary", {
                page: safePage,
                totalPages,
              }),
              prev: t("pagination.prev"),
              next: t("pagination.next"),
              count: t("pagination.count", { count: filteredRows.length }),
            }}
          />
        </>
      )}
    </div>
  )
}
