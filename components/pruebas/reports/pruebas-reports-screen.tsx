"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"

import { PruebasResultsScoreChart } from "@/components/pruebas/results/pruebas-results-charts"
import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import { ListPaginationBar } from "@/components/ui/list-pagination-bar"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { ResponsiveFilters } from "@/components/ui/responsive-filters"
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
import {
  buildAssignmentStatusReportRows,
  buildPsychometricDimensionReportRows,
  buildTechnicalScoreReportRows,
  countAssignmentStatuses,
  DEFAULT_REPORT_KEY,
  listVacancyOptionsFromStore,
  paginateReportRows,
  psychometricDimensionChartPoints,
  REPORT_CATALOG_KEYS,
  statusChartPoints,
  technicalScoreChartPoints,
  type ReportKey,
  type ReportsFilters,
  type ReportsStoreSlice,
} from "@/lib/pruebas/reports"
import type { AssignmentStatus } from "@/lib/pruebas/types"

const CONTROL_CLASS =
  "h-11 w-full rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"

const EMPTY_FILTERS: ReportsFilters = {
  vacancyId: null,
  assignedFrom: null,
  assignedTo: null,
}

const STATUS_STYLES: Record<AssignmentStatus, string> = {
  pending: "border-border bg-muted text-foreground",
  in_progress: "border-vo-purple/40 bg-vo-purple/10 text-emerald-900",
  completed: "border-emerald-300 bg-emerald-50 text-emerald-900",
  expired: "border-amber-300 bg-amber-50 text-amber-800",
  cancelled: "border-border bg-muted text-muted-foreground",
}

function filtersHaveValues(filters: ReportsFilters): boolean {
  return Boolean(
    filters.vacancyId || filters.assignedFrom || filters.assignedTo,
  )
}

function StatusPill({
  status,
  label,
}: {
  status: AssignmentStatus
  label: string
}) {
  return (
    <span
      data-testid="reports-status-badge"
      data-status={status}
      className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-1 font-sans text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  )
}

export function PruebasReportsScreen() {
  const t = useTranslations("PruebasPortal.reports")
  const locale = useLocale()

  const [store, setStore] = useState<ReportsStoreSlice>({
    assignments: [],
    applications: [],
    candidates: [],
    vacancies: [],
    tests: [],
    versions: [],
    results: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isStoreEmpty, setIsStoreEmpty] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ReportKey>(DEFAULT_REPORT_KEY)
  const [filters, setFilters] = useState<ReportsFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const load = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const [
        assignments,
        applications,
        candidates,
        vacancies,
        tests,
        versions,
        results,
      ] = await Promise.all([
        listAssignments(),
        listApplications(),
        listCandidates(),
        listVacancies(),
        listTests(),
        listVersions(),
        listResults(),
      ])
      setStore({
        assignments,
        applications,
        candidates,
        vacancies,
        tests,
        versions,
        results,
      })
      setIsStoreEmpty(assignments.length === 0)
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

  const statusRows = useMemo(
    () => buildAssignmentStatusReportRows(store, filters),
    [store, filters],
  )
  const technicalRows = useMemo(
    () => buildTechnicalScoreReportRows(store, filters),
    [store, filters],
  )
  const dimensionRows = useMemo(
    () => buildPsychometricDimensionReportRows(store, filters),
    [store, filters],
  )

  const activeRows =
    selectedKey === "assignments-by-status"
      ? statusRows
      : selectedKey === "technical-scores"
        ? technicalRows
        : dimensionRows

  const totalPages = Math.max(1, Math.ceil(activeRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = useMemo(
    () => paginateReportRows(activeRows, safePage, pageSize),
    [activeRows, safePage, pageSize],
  )

  useEffect(() => {
    setPage(1)
  }, [filters, pageSize, selectedKey])

  const vacancyOptions = useMemo(
    () => listVacancyOptionsFromStore(store),
    [store],
  )

  const chartPoints = useMemo(() => {
    if (selectedKey === "assignments-by-status") {
      return statusChartPoints(countAssignmentStatuses(statusRows), (status) =>
        t(`status.${status}`),
      )
    }
    if (selectedKey === "technical-scores") {
      return technicalScoreChartPoints(technicalRows)
    }
    return psychometricDimensionChartPoints(dimensionRows)
  }, [selectedKey, statusRows, technicalRows, dimensionRows, t])

  const chartTitle =
    selectedKey === "assignments-by-status"
      ? t("charts.statusTitle")
      : selectedKey === "technical-scores"
        ? t("charts.technicalTitle")
        : t("charts.dimensionsTitle")

  const chartSummary =
    selectedKey === "assignments-by-status"
      ? t("charts.statusSummary")
      : selectedKey === "technical-scores"
        ? t("charts.technicalSummary")
        : t("charts.dimensionsSummary")

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

      <p
        className="rounded-lg border border-vo-purple/30 bg-vo-purple/10 px-3 py-2 font-sans text-sm text-emerald-900"
        data-testid="reports-scope-notice"
      >
        {t("scopeNotice")}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled
          title={t("export.unavailable")}
          className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-md border border-border bg-muted px-4 font-sans text-sm font-medium text-muted-foreground"
          data-testid="reports-export-pdf"
        >
          {t("export.pdf")}
        </button>
        <button
          type="button"
          disabled
          title={t("export.unavailable")}
          className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-md border border-border bg-muted px-4 font-sans text-sm font-medium text-muted-foreground"
          data-testid="reports-export-csv"
        >
          {t("export.csv")}
        </button>
      </div>
      <p
        className="font-sans text-xs text-muted-foreground"
        data-testid="reports-export-hint"
      >
        {t("export.unavailable")}
      </p>

      <div
        className="grid gap-3 md:grid-cols-3"
        role="listbox"
        aria-label={t("catalogAria")}
        data-testid="reports-catalog"
      >
        {REPORT_CATALOG_KEYS.map((key) => {
          const isSelected = selectedKey === key
          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-testid={`reports-catalog-${key}`}
              onClick={() => setSelectedKey(key)}
              className={`flex min-h-11 flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 ${
                isSelected
                  ? "border-vo-purple/50 bg-vo-purple/10 text-emerald-900"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <span className="font-display text-sm font-semibold">
                {t(`catalog.${key}.title`)}
              </span>
              <span className="font-sans text-xs text-muted-foreground">
                {t(`catalog.${key}.description`)}
              </span>
            </button>
          )
        })}
      </div>

      <ResponsiveFilters
        title={t("filters.title")}
        toggleLabel={t("filters.toggle")}
        regionLabel={t("filters.regionLabel")}
        hasActiveFilters={filtersHaveValues(filters)}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pruebas-reports-vacancy"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.vacancy")}
            </label>
            <select
              id="pruebas-reports-vacancy"
              data-testid="reports-filter-vacancy"
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
              htmlFor="pruebas-reports-from"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.assignedFrom")}
            </label>
            <input
              id="pruebas-reports-from"
              type="date"
              data-testid="reports-filter-from"
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
              htmlFor="pruebas-reports-to"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.assignedTo")}
            </label>
            <input
              id="pruebas-reports-to"
              type="date"
              data-testid="reports-filter-to"
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
                data-testid="reports-filters-clear"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                {t("filters.clear")}
              </button>
            </div>
          ) : null}
        </div>
      </ResponsiveFilters>

      <div
        className="flex flex-wrap items-center gap-3"
        data-testid="reports-count"
      >
        <span className="inline-flex min-h-11 items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 font-sans text-sm font-medium text-emerald-900">
          {t("count", { count: activeRows.length })}
        </span>
        {filtersHaveValues(filters) ? (
          <span className="font-sans text-sm text-muted-foreground">
            {t("filteredCount", { count: activeRows.length })}
          </span>
        ) : null}
      </div>

      <PruebasResultsScoreChart
        title={chartTitle}
        points={chartPoints}
        yDomain={
          selectedKey === "psychometric-dimensions" ? [0, 100] : undefined
        }
        footnote={
          selectedKey === "psychometric-dimensions"
            ? t("charts.dimensionsFootnote")
            : undefined
        }
        summaryCaption={chartSummary}
        emptyMessage={t("charts.empty")}
        testId={`reports-chart-${selectedKey}`}
      />

      {activeRows.length === 0 ? (
        <EmptyState
          title={t("states.filterEmptyTitle")}
          description={t("states.filterEmptyDescription")}
        />
      ) : (
        <>
          {selectedKey === "assignments-by-status" ? (
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
                        {t("table.test")}
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("table.status")}
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("table.assignedAt")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pageRows as typeof statusRows).map((row) => (
                      <tr
                        key={row.assignmentId}
                        className="border-b border-border last:border-b-0"
                        data-testid="reports-row"
                        data-assignment-id={row.assignmentId}
                      >
                        <td className="px-4 py-3 font-sans text-sm font-medium text-foreground">
                          {row.candidateName}
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-foreground">
                          {row.vacancyTitle}
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-foreground">
                          {row.testTitle}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill
                            status={row.status}
                            label={t(`status.${row.status}`)}
                          />
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-foreground">
                          {formatMockDate(row.assignedAt, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul
                className="flex flex-col gap-3 lg:hidden"
                data-testid="reports-cards"
              >
                {(pageRows as typeof statusRows).map((row) => (
                  <li
                    key={row.assignmentId}
                    className="glass-card flex flex-col gap-2 rounded-xl border border-border p-4"
                    data-testid="reports-row"
                    data-assignment-id={row.assignmentId}
                  >
                    <p className="font-display text-base font-semibold text-foreground">
                      {row.candidateName}
                    </p>
                    <p className="font-sans text-sm text-muted-foreground">
                      {row.vacancyTitle}
                    </p>
                    <p className="font-sans text-sm text-foreground">
                      {row.testTitle}
                    </p>
                    <StatusPill
                      status={row.status}
                      label={t(`status.${row.status}`)}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {selectedKey === "technical-scores" ? (
            <>
              <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("table.candidate")}
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("table.vacancy")}
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("table.score")}
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("table.maxScore")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pageRows as typeof technicalRows).map((row) => (
                      <tr
                        key={row.assignmentId}
                        className="border-b border-border last:border-b-0"
                        data-testid="reports-row"
                        data-assignment-id={row.assignmentId}
                      >
                        <td className="px-4 py-3 font-sans text-sm font-medium text-foreground">
                          {row.candidateName}
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-foreground">
                          {row.vacancyTitle}
                        </td>
                        <td
                          className="px-4 py-3 font-sans text-sm text-foreground"
                          data-testid="reports-technical-score"
                        >
                          {t("table.scoreValue", {
                            score: row.score,
                            max: row.maxScore,
                          })}
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-foreground">
                          {row.maxScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul
                className="flex flex-col gap-3 lg:hidden"
                data-testid="reports-cards"
              >
                {(pageRows as typeof technicalRows).map((row) => (
                  <li
                    key={row.assignmentId}
                    className="glass-card flex flex-col gap-2 rounded-xl border border-border p-4"
                    data-testid="reports-row"
                    data-assignment-id={row.assignmentId}
                  >
                    <p className="font-display text-base font-semibold text-foreground">
                      {row.candidateName}
                    </p>
                    <p className="font-sans text-sm text-muted-foreground">
                      {row.vacancyTitle}
                    </p>
                    <p
                      className="font-sans text-sm text-foreground"
                      data-testid="reports-technical-score"
                    >
                      {t("table.scoreValue", {
                        score: row.score,
                        max: row.maxScore,
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {selectedKey === "psychometric-dimensions" ? (
            <>
              <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("table.candidate")}
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("table.dimension")}
                      </th>
                      <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("table.score")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pageRows as typeof dimensionRows).map((row) => (
                      <tr
                        key={`${row.assignmentId}-${row.dimension}`}
                        className="border-b border-border last:border-b-0"
                        data-testid="reports-row"
                        data-dimension={row.dimension}
                      >
                        <td className="px-4 py-3 font-sans text-sm font-medium text-foreground">
                          {row.candidateName}
                        </td>
                        <td className="px-4 py-3 font-sans text-sm text-foreground">
                          {row.dimension}
                        </td>
                        <td
                          className="px-4 py-3 font-sans text-sm text-foreground"
                          data-testid="reports-dimension-score"
                        >
                          {row.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul
                className="flex flex-col gap-3 lg:hidden"
                data-testid="reports-cards"
              >
                {(pageRows as typeof dimensionRows).map((row) => (
                  <li
                    key={`${row.assignmentId}-${row.dimension}`}
                    className="glass-card flex flex-col gap-2 rounded-xl border border-border p-4"
                    data-testid="reports-row"
                    data-dimension={row.dimension}
                  >
                    <p className="font-display text-base font-semibold text-foreground">
                      {row.candidateName}
                    </p>
                    <p className="font-sans text-sm text-foreground">
                      {row.dimension}
                    </p>
                    <p
                      className="font-sans text-sm text-foreground"
                      data-testid="reports-dimension-score"
                    >
                      {row.score}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <ListPaginationBar
            page={safePage}
            pageSize={pageSize}
            totalCount={activeRows.length}
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
              count: t("pagination.count", { count: activeRows.length }),
            }}
          />
        </>
      )}
    </div>
  )
}
