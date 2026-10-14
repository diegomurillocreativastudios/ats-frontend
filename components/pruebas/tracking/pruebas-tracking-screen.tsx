"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"

import { ConfirmDialog } from "@/components/pruebas/shared/confirm-dialog"
import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import { ListPaginationBar } from "@/components/ui/list-pagination-bar"
import Modal from "@/components/ui/Modal"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { ResponsiveFilters } from "@/components/ui/responsive-filters"
import Snackbar from "@/components/ui/Snackbar"
import { defaultExpiresAtYmd } from "@/lib/pruebas/assignments"
import { ASSIGNMENT_STATUSES, formatMockDate } from "@/lib/pruebas/formatters"
import { MOCK_NOW } from "@/lib/pruebas/mock-fixtures"
import {
  cancelAssignment,
  extendAssignment,
  listApplications,
  listAssignments,
  listCandidates,
  listResults,
  listSessions,
  listTests,
  listTrackingEvents,
  listVacancies,
  listVersions,
  MockServiceError,
  remindAssignment,
  retryAssignment,
} from "@/lib/pruebas/mock-service"
import {
  buildTrackingRows,
  canPerformTrackingAction,
  filterTrackingRows,
  paginateTrackingRows,
  type TrackingListFilters,
  type TrackingListRow,
} from "@/lib/pruebas/tracking"
import type {
  AssignmentStatus,
  MockApplication,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockAssignment,
  MockCandidateProfile,
  MockResult,
  MockSession,
  MockTrackingEvent,
  MockVacancy,
  TrackingAction,
  TrackingQualificationLabel,
} from "@/lib/pruebas/types"

const CONTROL_CLASS =
  "h-11 w-full rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

const EMPTY_FILTERS: TrackingListFilters = {
  query: "",
  status: null,
  qualification: null,
}

const QUALIFICATION_OPTIONS: readonly TrackingQualificationLabel[] = [
  "answers_submitted",
  "pending_review",
  "reviewed",
]

const STATUS_STYLES: Record<AssignmentStatus, string> = {
  pending: "border-border bg-muted text-foreground",
  in_progress: "border-vo-purple/40 bg-vo-purple/10 text-emerald-900",
  completed: "border-emerald-300 bg-emerald-50 text-emerald-900",
  expired: "border-amber-300 bg-amber-50 text-amber-800",
  cancelled: "border-border bg-muted text-muted-foreground",
}

const QUALIFICATION_STYLES: Record<TrackingQualificationLabel, string> = {
  answers_submitted: "border-border bg-muted text-foreground",
  pending_review: "border-amber-300 bg-amber-50 text-amber-800",
  reviewed: "border-emerald-300 bg-emerald-50 text-emerald-900",
}

type ConfirmKind = "cancel" | "extend" | null

type SnackbarState = {
  open: boolean
  variant: "success" | "error"
  message: string
}

function filtersHaveValues(filters: TrackingListFilters): boolean {
  return Boolean(
    filters.query.trim() || filters.status || filters.qualification,
  )
}

const KNOWN_ERROR_CODES = new Set([
  "not_found",
  "scenario_error",
  "action_not_allowed",
  "application_closed",
  "invalid_expires_at",
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

function AssignmentStatusPill({
  status,
  label,
}: {
  status: AssignmentStatus
  label: string
}) {
  return (
    <span
      data-testid="tracking-status-badge"
      data-status={status}
      className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-1 font-sans text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  )
}

function QualificationPill({
  label,
  text,
}: {
  label: TrackingQualificationLabel
  text: string
}) {
  return (
    <span
      data-testid="tracking-qualification-badge"
      data-qualification={label}
      className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-1 font-sans text-xs font-medium ${QUALIFICATION_STYLES[label]}`}
    >
      {text}
    </span>
  )
}

export function PruebasTrackingScreen() {
  const t = useTranslations("PruebasPortal.tracking")
  const locale = useLocale()

  const [assignments, setAssignments] = useState<MockAssignment[]>([])
  const [applications, setApplications] = useState<MockApplication[]>([])
  const [candidates, setCandidates] = useState<MockCandidateProfile[]>([])
  const [vacancies, setVacancies] = useState<MockVacancy[]>([])
  const [tests, setTests] = useState<MockAssessmentTest[]>([])
  const [versions, setVersions] = useState<MockAssessmentVersion[]>([])
  const [sessions, setSessions] = useState<MockSession[]>([])
  const [results, setResults] = useState<MockResult[]>([])
  const [trackingEvents, setTrackingEvents] = useState<MockTrackingEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isStoreEmpty, setIsStoreEmpty] = useState(false)

  const [filters, setFilters] = useState<TrackingListFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [simulateFailure, setSimulateFailure] = useState(false)
  const [extendYmd, setExtendYmd] = useState(defaultExpiresAtYmd(MOCK_NOW))
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null)
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    variant: "success",
    message: "",
  })

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
        nextSessions,
        nextResults,
        nextEvents,
      ] = await Promise.all([
        listAssignments(),
        listApplications(),
        listCandidates(),
        listVacancies(),
        listTests(),
        listVersions(),
        listSessions(),
        listResults(),
        listTrackingEvents(),
      ])
      setAssignments(nextAssignments)
      setApplications(nextApplications)
      setCandidates(nextCandidates)
      setVacancies(nextVacancies)
      setTests(nextTests)
      setVersions(nextVersions)
      setSessions(nextSessions)
      setResults(nextResults)
      setTrackingEvents(nextEvents)
      setIsStoreEmpty(nextAssignments.length === 0 && nextTests.length === 0)
    } catch (error) {
      setAssignments([])
      setIsStoreEmpty(false)
      setLoadError(resolveErrorMessage(error, t))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(
    () =>
      buildTrackingRows({
        assignments,
        applications,
        candidates,
        vacancies,
        tests,
        versions,
        sessions,
        results,
        trackingEvents,
      }),
    [
      assignments,
      applications,
      candidates,
      vacancies,
      tests,
      versions,
      sessions,
      results,
      trackingEvents,
    ],
  )

  const filtered = useMemo(
    () => filterTrackingRows(rows, filters),
    [rows, filters],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(page, totalPages)
  const pageItems = useMemo(
    () => paginateTrackingRows(filtered, safePage, pageSize),
    [filtered, safePage, pageSize],
  )

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const selectedRow = useMemo(
    () => rows.find((row) => row.assignment.id === selectedId) ?? null,
    [rows, selectedId],
  )

  const patchFilters = (patch: Partial<TrackingListFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const showToast = (variant: "success" | "error", message: string) => {
    setSnackbar({ open: true, variant, message })
  }

  const openDetail = (row: TrackingListRow) => {
    setSelectedId(row.assignment.id)
    setSimulateFailure(false)
    setExtendYmd(defaultExpiresAtYmd(MOCK_NOW))
    setConfirmKind(null)
  }

  const closeDetail = () => {
    setSelectedId(null)
    setConfirmKind(null)
    setSimulateFailure(false)
  }

  const runAction = async (action: TrackingAction) => {
    if (!selectedRow) return

    if (simulateFailure) {
      showToast("error", t("toasts.simulatedFailure"))
      return
    }

    setIsActionLoading(true)
    try {
      if (action === "remind") {
        await remindAssignment(selectedRow.assignment.id)
        showToast("success", t("toasts.reminded"))
      } else if (action === "retry") {
        await retryAssignment(selectedRow.assignment.id)
        showToast("success", t("toasts.retried"))
      }
      await load()
    } catch (error) {
      showToast("error", resolveErrorMessage(error, t))
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedRow || !confirmKind) return

    if (simulateFailure) {
      showToast("error", t("toasts.simulatedFailure"))
      setConfirmKind(null)
      return
    }

    setIsConfirmLoading(true)
    try {
      if (confirmKind === "cancel") {
        await cancelAssignment(selectedRow.assignment.id)
        showToast("success", t("toasts.cancelled"))
      } else {
        await extendAssignment(selectedRow.assignment.id, extendYmd)
        showToast("success", t("toasts.extended"))
      }
      setConfirmKind(null)
      await load()
    } catch (error) {
      showToast("error", resolveErrorMessage(error, t))
    } finally {
      setIsConfirmLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader title={t("title")} description={t("description")} />
        <LoadingSkeleton rows={5} />
        <p className="sr-only">{t("states.loading")}</p>
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
              className="inline-flex min-h-11 items-center rounded-md bg-vo-purple px-4 font-sans text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
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

  const renderActionButtons = (row: TrackingListRow) => (
    <div className="flex flex-wrap gap-2">
      {canPerformTrackingAction(row.actions, "remind") ? (
        <button
          type="button"
          data-testid="tracking-action-remind"
          disabled={isActionLoading}
          onClick={() => void runAction("remind")}
          className="inline-flex h-11 items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {t("actions.remind")}
        </button>
      ) : null}
      {canPerformTrackingAction(row.actions, "extend") ? (
        <button
          type="button"
          data-testid="tracking-action-extend"
          disabled={isActionLoading}
          onClick={() => setConfirmKind("extend")}
          className="inline-flex h-11 items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {t("actions.extend")}
        </button>
      ) : null}
      {canPerformTrackingAction(row.actions, "retry") ? (
        <button
          type="button"
          data-testid="tracking-action-retry"
          disabled={isActionLoading}
          onClick={() => void runAction("retry")}
          className="inline-flex h-11 items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {t("actions.retry")}
        </button>
      ) : null}
      {canPerformTrackingAction(row.actions, "cancel") ? (
        <button
          type="button"
          data-testid="tracking-action-cancel"
          disabled={isActionLoading}
          onClick={() => setConfirmKind("cancel")}
          className="inline-flex h-11 items-center rounded-md border border-destructive/40 bg-background px-3 font-sans text-sm font-medium text-destructive hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {t("actions.cancel")}
        </button>
      ) : null}
    </div>
  )

  return (
    <div
      className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8"
      data-testid="pruebas-tracking-screen"
    >
      <PortalPageHeader title={t("title")} description={t("description")} />

      <p
        className="rounded-xl border border-border bg-card px-4 py-3 font-sans text-sm text-muted-foreground"
        data-testid="tracking-scope-notice"
      >
        {t("scopeNotice")}
      </p>

      <ResponsiveFilters
        toggleLabel={t("filters.toggle")}
        title={t("filters.title")}
        regionLabel={t("filters.regionLabel")}
        hasActiveFilters={filtersHaveValues(filters)}
        disabled={isLoading}
        desktopClassName="w-full rounded-xl border border-border bg-card p-3 md:p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
            <label
              htmlFor="pruebas-tracking-search"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("search")}
            </label>
            <input
              id="pruebas-tracking-search"
              type="search"
              className={CONTROL_CLASS}
              placeholder={t("searchPlaceholder")}
              value={filters.query}
              onChange={(event) => patchFilters({ query: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pruebas-tracking-status"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.status")}
            </label>
            <select
              id="pruebas-tracking-status"
              data-testid="tracking-filter-status"
              className={CONTROL_CLASS}
              value={filters.status ?? ""}
              onChange={(event) =>
                patchFilters({
                  status: (event.target.value ||
                    null) as AssignmentStatus | null,
                })
              }
            >
              <option value="">{t("filters.all")}</option>
              {ASSIGNMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pruebas-tracking-qualification"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.qualification")}
            </label>
            <select
              id="pruebas-tracking-qualification"
              data-testid="tracking-filter-qualification"
              className={CONTROL_CLASS}
              value={filters.qualification ?? ""}
              onChange={(event) =>
                patchFilters({
                  qualification: (event.target.value ||
                    null) as TrackingQualificationLabel | null,
                })
              }
            >
              <option value="">{t("filters.all")}</option>
              {QUALIFICATION_OPTIONS.map((label) => (
                <option key={label} value={label}>
                  {t(`qualification.${label}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filtersHaveValues(filters) ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex min-h-11 items-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              {t("filters.clear")}
            </button>
          </div>
        ) : null}
      </ResponsiveFilters>

      {filtered.length === 0 ? (
        <EmptyState
          title={t("states.filterEmptyTitle")}
          description={t("states.filterEmptyDescription")}
          action={
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex min-h-11 items-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              {t("filters.clear")}
            </button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
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
                    {t("table.status")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.expiresAt")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => (
                  <tr
                    key={row.assignment.id}
                    className="border-b border-border last:border-b-0"
                    data-testid="tracking-row"
                    data-assignment-id={row.assignment.id}
                    data-status={row.status}
                  >
                    <td className="px-4 py-3 font-sans text-sm font-medium text-foreground">
                      {row.candidateName}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-foreground">
                      {row.vacancyTitle}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-foreground">
                      {row.versionLabel}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <AssignmentStatusPill
                          status={row.status}
                          label={t(`status.${row.status}`)}
                        />
                        {row.qualification ? (
                          <QualificationPill
                            label={row.qualification}
                            text={t(`qualification.${row.qualification}`)}
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-muted-foreground">
                      {formatMockDate(row.expiresAt, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        data-testid={`tracking-open-${row.assignment.id}`}
                        onClick={() => openDetail(row)}
                        className="inline-flex h-11 items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                      >
                        {t("table.open")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul
            className="grid grid-cols-1 gap-3 lg:hidden"
            data-testid="tracking-cards"
          >
            {pageItems.map((row) => (
              <li key={row.assignment.id}>
                <article
                  className="glass-card flex flex-col gap-3 rounded-2xl p-4"
                  data-testid="tracking-card"
                  data-assignment-id={row.assignment.id}
                  data-status={row.status}
                >
                  <div className="flex flex-col gap-1">
                    <p className="font-sans text-sm font-medium text-foreground">
                      {row.candidateName}
                    </p>
                    <p className="font-sans text-sm text-muted-foreground">
                      {row.vacancyTitle}
                    </p>
                    <p className="font-sans text-sm text-muted-foreground">
                      {row.versionLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AssignmentStatusPill
                      status={row.status}
                      label={t(`status.${row.status}`)}
                    />
                    {row.qualification ? (
                      <QualificationPill
                        label={row.qualification}
                        text={t(`qualification.${row.qualification}`)}
                      />
                    ) : null}
                  </div>
                  <p className="font-sans text-xs text-muted-foreground">
                    {t("table.expiresAt")}: {formatMockDate(row.expiresAt, locale)}
                  </p>
                  <button
                    type="button"
                    data-testid={`tracking-open-${row.assignment.id}`}
                    onClick={() => openDetail(row)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                  >
                    {t("table.open")}
                  </button>
                </article>
              </li>
            ))}
          </ul>

          <ListPaginationBar
            page={safePage}
            pageSize={pageSize}
            totalCount={filtered.length}
            loading={isLoading}
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
              count: t("pagination.count", { count: filtered.length }),
            }}
          />
        </>
      )}

      <Modal
        isOpen={selectedRow !== null}
        onClose={closeDetail}
        title={
          selectedRow
            ? t("detail.title", { name: selectedRow.candidateName })
            : t("detail.titleFallback")
        }
        size="lg"
        footer={
          selectedRow ? (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {renderActionButtons(selectedRow)}
              <button
                type="button"
                onClick={closeDetail}
                className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
              >
                {t("detail.close")}
              </button>
            </div>
          ) : undefined
        }
      >
        {selectedRow ? (
          <div className="flex flex-col gap-5" data-testid="tracking-detail">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("detail.vacancy")}
                </dt>
                <dd className="font-sans text-sm text-foreground">
                  {selectedRow.vacancyTitle}
                </dd>
              </div>
              <div>
                <dt className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("detail.version")}
                </dt>
                <dd className="font-sans text-sm text-foreground">
                  {selectedRow.versionLabel}
                </dd>
              </div>
              <div>
                <dt className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("detail.assignedAt")}
                </dt>
                <dd className="font-sans text-sm text-foreground">
                  {formatMockDate(selectedRow.assignedAt, locale)}
                </dd>
              </div>
              <div>
                <dt className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("detail.expiresAt")}
                </dt>
                <dd className="font-sans text-sm text-foreground">
                  {formatMockDate(selectedRow.expiresAt, locale)}
                </dd>
              </div>
              <div>
                <dt className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("detail.attempts")}
                </dt>
                <dd className="font-sans text-sm text-foreground">
                  {t("detail.attemptsValue", {
                    used: selectedRow.attemptsUsed,
                    allowed: selectedRow.allowedAttempts,
                  })}
                </dd>
              </div>
              <div>
                <dt className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("detail.status")}
                </dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  <AssignmentStatusPill
                    status={selectedRow.status}
                    label={t(`status.${selectedRow.status}`)}
                  />
                  {selectedRow.qualification ? (
                    <QualificationPill
                      label={selectedRow.qualification}
                      text={t(`qualification.${selectedRow.qualification}`)}
                    />
                  ) : null}
                </dd>
              </div>
            </dl>

            {selectedRow.isApplicationClosed ? (
              <p
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 font-sans text-sm text-amber-800"
                data-testid="tracking-application-closed"
              >
                {selectedRow.applicationClosedReason === "final"
                  ? t("detail.applicationFinal")
                  : t("detail.applicationInactive")}
              </p>
            ) : null}

            {canPerformTrackingAction(selectedRow.actions, "extend") ? (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="tracking-extend-date"
                  className="font-sans text-sm font-medium text-foreground"
                >
                  {t("detail.extendDate")}
                </label>
                <input
                  id="tracking-extend-date"
                  type="date"
                  data-testid="tracking-extend-date"
                  className={CONTROL_CLASS}
                  value={extendYmd}
                  onChange={(event) => setExtendYmd(event.target.value)}
                />
                <p className="font-sans text-xs text-muted-foreground">
                  {t("detail.extendHint")}
                </p>
              </div>
            ) : null}

            <label className="flex min-h-11 items-center gap-3 font-sans text-sm text-foreground">
              <input
                type="checkbox"
                data-testid="tracking-simulate-failure"
                checked={simulateFailure}
                onChange={(event) => setSimulateFailure(event.target.checked)}
                className="size-4 rounded border-border text-vo-purple focus:ring-vo-purple"
              />
              {t("detail.simulateFailure")}
            </label>

            <section aria-labelledby="tracking-timeline-title">
              <h3
                id="tracking-timeline-title"
                className="mb-2 font-display text-base font-semibold text-foreground"
              >
                {t("timeline.title")}
              </h3>
              {selectedRow.events.length === 0 ? (
                <p className="font-sans text-sm text-muted-foreground">
                  {t("timeline.empty")}
                </p>
              ) : (
                <ol
                  className="flex flex-col gap-2"
                  data-testid="tracking-timeline"
                >
                  {selectedRow.events.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-lg border border-border bg-background px-3 py-2"
                      data-testid="tracking-timeline-event"
                      data-kind={event.kind}
                    >
                      <p className="font-sans text-sm font-medium text-foreground">
                        {t(`timeline.kind.${event.kind}`)}
                      </p>
                      <p className="font-sans text-xs text-muted-foreground">
                        {formatMockDate(event.at, locale)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        isOpen={confirmKind !== null}
        onClose={() => setConfirmKind(null)}
        title={
          confirmKind === "cancel"
            ? t("confirm.cancelTitle")
            : t("confirm.extendTitle")
        }
        description={
          confirmKind === "cancel"
            ? t("confirm.cancelDescription", {
                name: selectedRow?.candidateName ?? "",
              })
            : t("confirm.extendDescription", {
                name: selectedRow?.candidateName ?? "",
                date: extendYmd,
              })
        }
        confirmLabel={
          confirmKind === "cancel"
            ? t("confirm.cancelConfirm")
            : t("confirm.extendConfirm")
        }
        cancelLabel={t("confirm.dismiss")}
        onConfirm={() => void handleConfirm()}
        isConfirmLoading={isConfirmLoading}
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
