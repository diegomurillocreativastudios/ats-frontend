"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Plus } from "lucide-react"

import { EvaluationActionsMenu } from "@/components/pruebas/evaluations/evaluation-actions-menu"
import { AssessmentStatusBadge } from "@/components/pruebas/shared/assessment-status-badge"
import { AssessmentTypeBadge } from "@/components/pruebas/shared/assessment-type-badge"
import { ConfirmDialog } from "@/components/pruebas/shared/confirm-dialog"
import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import { ListPaginationBar } from "@/components/ui/list-pagination-bar"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { ResponsiveFilters } from "@/components/ui/responsive-filters"
import Snackbar from "@/components/ui/Snackbar"
import {
  canPerformEvaluationAction,
  filterEvaluations,
  getEvaluationActions,
  paginateEvaluations,
  type EvaluationAction,
  type EvaluationListFilters,
} from "@/lib/pruebas/evaluations"
import { formatMockDate } from "@/lib/pruebas/formatters"
import {
  archiveTest,
  duplicateTest,
  listTests,
  MockServiceError,
  publishTest,
} from "@/lib/pruebas/mock-service"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"
import type {
  AssessmentKind,
  AssessmentLifecycleStatus,
  MockAssessmentTest,
} from "@/lib/pruebas/types"

const CONTROL_CLASS =
  "h-11 w-full rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

const EMPTY_FILTERS: EvaluationListFilters = {
  query: "",
  kind: null,
  lifecycleStatus: null,
}

type ConfirmKind = "publish" | "archive" | null

type SnackbarState = {
  open: boolean
  variant: "success" | "error"
  message: string
}

function filtersHaveValues(filters: EvaluationListFilters): boolean {
  return Boolean(
    filters.query.trim() || filters.kind || filters.lifecycleStatus,
  )
}

const KNOWN_ERROR_CODES = new Set([
  "not_found",
  "test_archived",
  "no_draft",
  "scenario_error",
])

function resolveErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  if (error instanceof MockServiceError && KNOWN_ERROR_CODES.has(error.code)) {
    return t(`errors.${error.code}`)
  }
  return t("toasts.error")
}

export function PruebasEvaluationsList() {
  const t = useTranslations("PruebasPortal.evaluations")
  const locale = useLocale()

  const [tests, setTests] = useState<MockAssessmentTest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isStoreEmpty, setIsStoreEmpty] = useState(false)
  const [filters, setFilters] = useState<EvaluationListFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null)
  const [confirmTest, setConfirmTest] = useState<MockAssessmentTest | null>(
    null,
  )
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    variant: "success",
    message: "",
  })

  const load = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const rows = await listTests()
      setTests(rows)
      setIsStoreEmpty(rows.length === 0)
    } catch (error) {
      setTests([])
      setIsStoreEmpty(false)
      setLoadError(resolveErrorMessage(error, t))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(
    () => filterEvaluations(tests, filters),
    [tests, filters],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(page, totalPages)
  const pageItems = useMemo(
    () => paginateEvaluations(filtered, safePage, pageSize),
    [filtered, safePage, pageSize],
  )

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const patchFilters = (patch: Partial<EvaluationListFilters>) => {
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

  const handleMenuAction = async (
    action: EvaluationAction,
    test: MockAssessmentTest,
  ) => {
    if (action === "publish") {
      setConfirmKind("publish")
      setConfirmTest(test)
      return
    }
    if (action === "archive") {
      setConfirmKind("archive")
      setConfirmTest(test)
      return
    }
    if (action === "duplicate") {
      try {
        await duplicateTest(
          test.id,
          t("duplicateTitle", { title: test.title }),
        )
        showToast("success", t("toasts.duplicated"))
        await load()
      } catch (error) {
        showToast("error", resolveErrorMessage(error, t))
      }
    }
  }

  const handleConfirm = async () => {
    if (!confirmTest || !confirmKind) return
    setIsConfirmLoading(true)
    try {
      if (confirmKind === "publish") {
        await publishTest(confirmTest.id)
        showToast("success", t("toasts.published"))
      } else {
        await archiveTest(confirmTest.id)
        showToast("success", t("toasts.archived"))
      }
      setConfirmKind(null)
      setConfirmTest(null)
      await load()
    } catch (error) {
      showToast("error", resolveErrorMessage(error, t))
    } finally {
      setIsConfirmLoading(false)
    }
  }

  const actionLabels = {
    edit: t("actions.edit"),
    duplicate: t("actions.duplicate"),
    publish: t("actions.publish"),
    archive: t("actions.archive"),
    versions: t("actions.versions"),
  }

  if (isLoading && tests.length === 0 && !loadError) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-evaluations"
          title={t("title")}
          description={t("description")}
        />
        <p className="sr-only" role="status">
          {t("states.loading")}
        </p>
        <LoadingSkeleton rows={5} />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-evaluations"
          title={t("title")}
          description={t("description")}
        />
        <ErrorState
          title={t("states.errorTitle")}
          description={loadError || t("states.errorDescription")}
          action={
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex min-h-11 items-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
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
        <PortalPageHeader
          id="pruebas-evaluations"
          title={t("title")}
          description={t("description")}
          actions={
            <Link
              href={`${PRUEBAS_HOME_HREF}/evaluaciones/nueva`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-vo-purple px-6 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              <Plus className="size-4" aria-hidden />
              {t("create")}
            </Link>
          }
        />
        <EmptyState
          title={t("states.emptyTitle")}
          description={t("states.emptyDescription")}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <PortalPageHeader
        id="pruebas-evaluations"
        title={t("title")}
        description={t("description")}
        actions={
          <Link
            href={`${PRUEBAS_HOME_HREF}/evaluaciones/nueva`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-vo-purple px-6 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
          >
            <Plus className="size-4" aria-hidden />
            {t("create")}
          </Link>
        }
      />

      <ResponsiveFilters
        toggleLabel={t("filters.toggle")}
        title={t("filters.title")}
        regionLabel={t("filters.regionLabel")}
        hasActiveFilters={filtersHaveValues(filters)}
        disabled={isLoading}
        desktopClassName="w-full rounded-xl border border-border bg-card p-3 md:p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label
              htmlFor="pruebas-eval-search"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("search")}
            </label>
            <input
              id="pruebas-eval-search"
              type="search"
              className={CONTROL_CLASS}
              placeholder={t("searchPlaceholder")}
              value={filters.query}
              onChange={(event) => patchFilters({ query: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pruebas-eval-kind"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.kind")}
            </label>
            <select
              id="pruebas-eval-kind"
              className={CONTROL_CLASS}
              value={filters.kind ?? ""}
              onChange={(event) =>
                patchFilters({
                  kind: (event.target.value || null) as AssessmentKind | null,
                })
              }
            >
              <option value="">{t("filters.all")}</option>
              <option value="technical">{t("filters.kindTechnical")}</option>
              <option value="psychometric">
                {t("filters.kindPsychometric")}
              </option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pruebas-eval-status"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.status")}
            </label>
            <select
              id="pruebas-eval-status"
              className={CONTROL_CLASS}
              value={filters.lifecycleStatus ?? ""}
              onChange={(event) =>
                patchFilters({
                  lifecycleStatus: (event.target.value ||
                    null) as AssessmentLifecycleStatus | null,
                })
              }
            >
              <option value="">{t("filters.all")}</option>
              <option value="draft">{t("filters.statusDraft")}</option>
              <option value="published">{t("filters.statusPublished")}</option>
              <option value="archived">{t("filters.statusArchived")}</option>
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
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.title")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.kind")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.status")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.createdAt")}
                  </th>
                  <th className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((test) => {
                  const actions = getEvaluationActions(test.lifecycleStatus)
                  const detailHref = `${PRUEBAS_HOME_HREF}/evaluaciones/${test.id}`
                  return (
                    <tr
                      key={test.id}
                      className="border-b border-border last:border-b-0"
                      data-testid="evaluation-row"
                      data-lifecycle={test.lifecycleStatus}
                    >
                      <td className="px-4 py-3 font-sans text-sm font-medium text-foreground">
                        <Link
                          href={detailHref}
                          className="underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
                        >
                          {test.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <AssessmentTypeBadge
                          kind={test.kind}
                          label={t(`kind.${test.kind}`)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <AssessmentStatusBadge
                          lifecycleStatus={test.lifecycleStatus}
                          label={t(`status.${test.lifecycleStatus}`)}
                        />
                      </td>
                      <td className="px-4 py-3 font-sans text-sm text-muted-foreground">
                        {formatMockDate(test.createdAt, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={detailHref}
                            className="inline-flex h-11 items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                          >
                            {t("table.view")}
                          </Link>
                          <EvaluationActionsMenu
                            title={test.title}
                            openLabel={t("table.openActions", {
                              title: test.title,
                            })}
                            actions={actions}
                            labels={actionLabels}
                            actionLinks={{
                              edit: canPerformEvaluationAction(
                                test.lifecycleStatus,
                                "edit",
                              )
                                ? `${PRUEBAS_HOME_HREF}/evaluaciones/${test.id}/editar`
                                : undefined,
                              versions: `${PRUEBAS_HOME_HREF}/evaluaciones/${test.id}/versiones`,
                            }}
                            onAction={(action) =>
                              void handleMenuAction(action, test)
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="grid grid-cols-1 gap-3 lg:hidden" data-testid="evaluation-cards">
            {pageItems.map((test) => {
              const actions = getEvaluationActions(test.lifecycleStatus)
              const detailHref = `${PRUEBAS_HOME_HREF}/evaluaciones/${test.id}`
              return (
                <li key={test.id}>
                  <article
                    className="glass-card flex flex-col gap-3 rounded-2xl p-4"
                    data-testid="evaluation-card"
                    data-lifecycle={test.lifecycleStatus}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        href={detailHref}
                        className="font-display text-lg font-semibold text-foreground underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
                      >
                        {test.title}
                      </Link>
                      <AssessmentStatusBadge
                        lifecycleStatus={test.lifecycleStatus}
                        label={t(`status.${test.lifecycleStatus}`)}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AssessmentTypeBadge
                        kind={test.kind}
                        label={t(`kind.${test.kind}`)}
                      />
                      <span className="font-sans text-xs text-muted-foreground">
                        {formatMockDate(test.createdAt, locale)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={detailHref}
                        className="inline-flex h-11 items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                      >
                        {t("table.view")}
                      </Link>
                      <EvaluationActionsMenu
                        title={test.title}
                        openLabel={t("table.openActions", {
                          title: test.title,
                        })}
                        actions={actions}
                        labels={actionLabels}
                        actionLinks={{
                          edit: canPerformEvaluationAction(
                            test.lifecycleStatus,
                            "edit",
                          )
                            ? `${PRUEBAS_HOME_HREF}/evaluaciones/${test.id}/editar`
                            : undefined,
                          versions: `${PRUEBAS_HOME_HREF}/evaluaciones/${test.id}/versiones`,
                        }}
                        onAction={(action) =>
                          void handleMenuAction(action, test)
                        }
                      />
                    </div>
                  </article>
                </li>
              )
            })}
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

      <ConfirmDialog
        isOpen={confirmKind !== null}
        title={
          confirmKind === "archive"
            ? t("confirmArchive.title")
            : t("confirmPublish.title")
        }
        description={
          confirmKind === "archive"
            ? t("confirmArchive.description")
            : t("confirmPublish.description")
        }
        confirmLabel={
          confirmKind === "archive"
            ? t("confirmArchive.confirm")
            : t("confirmPublish.confirm")
        }
        cancelLabel={
          confirmKind === "archive"
            ? t("confirmArchive.cancel")
            : t("confirmPublish.cancel")
        }
        onConfirm={() => void handleConfirm()}
        onClose={() => {
          if (!isConfirmLoading) {
            setConfirmKind(null)
            setConfirmTest(null)
          }
        }}
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
