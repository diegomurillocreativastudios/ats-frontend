"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import {
  ClipboardList,
  FileBarChart,
  Link2,
  UserPlus,
} from "lucide-react"
import { PruebasDashboardCharts } from "@/components/pruebas/dashboard/pruebas-dashboard-charts"
import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { ResponsiveFilters } from "@/components/ui/responsive-filters"
import type {
  DashboardFilters,
  DashboardSnapshot,
} from "@/lib/pruebas/dashboard"
import { formatMockDate } from "@/lib/pruebas/formatters"
import {
  getDashboard,
  MockServiceError,
} from "@/lib/pruebas/mock-service"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"
import type { AssessmentKind, AssignmentStatus } from "@/lib/pruebas/types"

const CONTROL_CLASS =
  "h-11 w-full rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

const EMPTY_FILTERS: DashboardFilters = {
  companyId: null,
  vacancyId: null,
  kind: null,
  assignmentStatus: null,
  assignedFrom: null,
  assignedTo: null,
}

type MetricKey = keyof DashboardSnapshot["counts"]

const METRIC_KEYS: MetricKey[] = [
  "assigned",
  "pending",
  "inProgress",
  "completed",
  "expired",
  "pendingReview",
]

const SHORTCUTS = [
  {
    key: "evaluations" as const,
    href: `${PRUEBAS_HOME_HREF}/evaluaciones`,
    icon: ClipboardList,
  },
  {
    key: "links" as const,
    href: `${PRUEBAS_HOME_HREF}/vinculaciones`,
    icon: Link2,
  },
  {
    key: "assignments" as const,
    href: `${PRUEBAS_HOME_HREF}/asignaciones`,
    icon: UserPlus,
  },
  {
    key: "results" as const,
    href: `${PRUEBAS_HOME_HREF}/resultados`,
    icon: FileBarChart,
  },
]

function filtersHaveValues(filters: DashboardFilters): boolean {
  return Boolean(
    filters.companyId ||
      filters.vacancyId ||
      filters.kind ||
      filters.assignmentStatus ||
      filters.assignedFrom ||
      filters.assignedTo,
  )
}

export function PruebasDashboard() {
  const t = useTranslations("PruebasPortal.dashboard")
  const locale = useLocale()
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS)
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const load = useCallback(async (nextFilters: DashboardFilters) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getDashboard(nextFilters)
      setSnapshot(data)
    } catch (cause) {
      setSnapshot(null)
      if (cause instanceof MockServiceError) {
        setError(cause.code)
      } else {
        setError("unknown")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(filters)
  }, [filters, load, reloadToken])

  const vacancyOptions = useMemo(() => {
    const all = snapshot?.filterOptions.vacancies ?? []
    if (!filters.companyId) return all
    return all.filter((item) => item.companyId === filters.companyId)
  }, [filters.companyId, snapshot?.filterOptions.vacancies])

  const patchFilters = (patch: Partial<DashboardFilters>) => {
    setFilters((previous) => {
      const next = { ...previous, ...patch }
      if (patch.companyId !== undefined && patch.companyId !== previous.companyId) {
        next.vacancyId = null
      }
      return next
    })
  }

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS)
  }

  const handleRetry = () => {
    setReloadToken((value) => value + 1)
  }

  if (isLoading && !snapshot && !error) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-dashboard"
          title={t("title")}
          description={t("description")}
        />
        <LoadingSkeleton variant="card" rows={6} />
        <span className="sr-only">{t("states.loading")}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-dashboard"
          title={t("title")}
          description={t("description")}
        />
        <ErrorState
          title={t("states.errorTitle")}
          description={t("states.errorDescription")}
          action={
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex min-h-11 items-center rounded-md bg-vo-purple px-4 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              {t("states.retry")}
            </button>
          }
        />
      </div>
    )
  }

  if (snapshot?.isStoreEmpty) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-dashboard"
          title={t("title")}
          description={t("description")}
        />
        <EmptyState
          title={t("states.emptyTitle")}
          description={t("states.emptyDescription")}
        />
      </div>
    )
  }

  if (!snapshot) {
    return null
  }

  const counts = snapshot.counts

  return (
    <div className="flex flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
      <PortalPageHeader
        id="pruebas-dashboard"
        title={t("title")}
        description={t("description")}
      />

      <ResponsiveFilters
        toggleLabel={t("filters.toggle")}
        title={t("filters.title")}
        regionLabel={t("filters.regionLabel")}
        hasActiveFilters={filtersHaveValues(filters)}
        disabled={isLoading}
        desktopClassName="w-full rounded-xl border border-border bg-card p-3 md:p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <FilterField id="pruebas-filter-company" label={t("filters.company")}>
            <select
              id="pruebas-filter-company"
              className={CONTROL_CLASS}
              value={filters.companyId ?? ""}
              onChange={(event) =>
                patchFilters({ companyId: event.target.value || null })
              }
            >
              <option value="">{t("filters.all")}</option>
              {snapshot.filterOptions.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField id="pruebas-filter-vacancy" label={t("filters.vacancy")}>
            <select
              id="pruebas-filter-vacancy"
              className={CONTROL_CLASS}
              value={filters.vacancyId ?? ""}
              onChange={(event) =>
                patchFilters({ vacancyId: event.target.value || null })
              }
            >
              <option value="">{t("filters.all")}</option>
              {vacancyOptions.map((vacancy) => (
                <option key={vacancy.id} value={vacancy.id}>
                  {vacancy.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField id="pruebas-filter-kind" label={t("filters.kind")}>
            <select
              id="pruebas-filter-kind"
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
          </FilterField>

          <FilterField id="pruebas-filter-status" label={t("filters.status")}>
            <select
              id="pruebas-filter-status"
              className={CONTROL_CLASS}
              value={filters.assignmentStatus ?? ""}
              onChange={(event) =>
                patchFilters({
                  assignmentStatus: (event.target.value ||
                    null) as AssignmentStatus | null,
                })
              }
            >
              <option value="">{t("filters.all")}</option>
              <option value="pending">{t("filters.statusPending")}</option>
              <option value="in_progress">
                {t("filters.statusInProgress")}
              </option>
              <option value="completed">{t("filters.statusCompleted")}</option>
              <option value="expired">{t("filters.statusExpired")}</option>
              <option value="cancelled">{t("filters.statusCancelled")}</option>
            </select>
          </FilterField>

          <FilterField
            id="pruebas-filter-from"
            label={t("filters.assignedFrom")}
          >
            <input
              id="pruebas-filter-from"
              type="date"
              className={CONTROL_CLASS}
              value={filters.assignedFrom ?? ""}
              onChange={(event) =>
                patchFilters({ assignedFrom: event.target.value || null })
              }
            />
          </FilterField>

          <FilterField id="pruebas-filter-to" label={t("filters.assignedTo")}>
            <input
              id="pruebas-filter-to"
              type="date"
              className={CONTROL_CLASS}
              value={filters.assignedTo ?? ""}
              onChange={(event) =>
                patchFilters({ assignedTo: event.target.value || null })
              }
            />
          </FilterField>
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

      {snapshot.isFilterEmpty ? (
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
      ) : null}

      <ul
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label={t("metricsAria")}
      >
        {METRIC_KEYS.map((key) => (
          <li key={key}>
            <article className="glass-card flex h-full min-h-28 flex-col justify-between rounded-2xl p-4">
              <span className="font-sans text-sm font-medium text-muted-foreground">
                {t(`metrics.${key}`)}
              </span>
              <span className="font-display text-3xl font-semibold text-foreground">
                {counts[key]}
              </span>
            </article>
          </li>
        ))}
      </ul>

      <section aria-labelledby="pruebas-dashboard-shortcuts-heading">
        <h2
          id="pruebas-dashboard-shortcuts-heading"
          className="mb-3 font-display text-base font-semibold text-foreground"
        >
          {t("shortcuts.title")}
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SHORTCUTS.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="glass-card flex min-h-11 items-center gap-3 rounded-2xl p-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                >
                  <Icon className="h-5 w-5 text-vo-purple" aria-hidden />
                  {t(`shortcuts.${item.key}`)}
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <PruebasDashboardCharts
        activitySeries={snapshot.activitySeries}
        statusDistribution={snapshot.statusDistribution}
      />

      <section
        className="grid gap-4 lg:grid-cols-2"
        aria-labelledby="pruebas-dashboard-attention-heading"
      >
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <h2
            id="pruebas-dashboard-attention-heading"
            className="mb-1 font-display text-base font-semibold text-foreground"
          >
            {t("attention.title")}
          </h2>
          <h3 className="mb-3 font-sans text-sm font-semibold text-foreground">
            {t("attention.dueSoonTitle")}
          </h3>
          {snapshot.dueSoon.length === 0 ? (
            <p className="font-sans text-sm text-muted-foreground" role="status">
              {t("attention.dueSoonEmpty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {snapshot.dueSoon.map((item) => (
                <li key={item.assignmentId}>
                  <Link
                    href={item.href}
                    className="flex min-h-11 flex-col gap-1 rounded-xl border border-border bg-background px-3 py-3 transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                  >
                    <span className="font-sans text-sm font-medium text-foreground">
                      {item.candidateName}
                    </span>
                    <span className="font-sans text-xs text-muted-foreground">
                      {item.vacancyTitle} · {item.testTitle}
                    </span>
                    <span className="font-sans text-xs text-muted-foreground">
                      {t("attention.expiresLabel", {
                        date: new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                        }).format(new Date(item.expiresAt)),
                      })}
                    </span>
                    <span className="font-sans text-xs font-medium text-emerald-800">
                      {t("attention.openTracking")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mb-3 mt-6 font-sans text-sm font-semibold text-foreground">
            {t("attention.reviewTitle")}
          </h3>
          {snapshot.pendingReviews.length === 0 ? (
            <p className="font-sans text-sm text-muted-foreground" role="status">
              {t("attention.reviewEmpty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {snapshot.pendingReviews.map((item) => (
                <li key={item.assignmentId}>
                  <Link
                    href={item.href}
                    className="flex min-h-11 flex-col gap-1 rounded-xl border border-border bg-background px-3 py-3 transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                  >
                    <span className="font-sans text-sm font-medium text-foreground">
                      {item.candidateName}
                    </span>
                    <span className="font-sans text-xs text-muted-foreground">
                      {item.vacancyTitle} · {item.testTitle}
                    </span>
                    <span className="font-sans text-xs font-medium text-emerald-800">
                      {t("attention.openReview")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-foreground">
            {t("activity.title")}
          </h2>
          {snapshot.recentActivity.length === 0 ? (
            <p className="font-sans text-sm text-muted-foreground" role="status">
              {t("activity.empty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {snapshot.recentActivity.map((item) => (
                <li key={item.assignmentId}>
                  <Link
                    href={item.href}
                    className="flex min-h-11 flex-col gap-1 rounded-xl border border-border bg-background px-3 py-3 transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                  >
                    <span className="font-sans text-sm font-medium text-foreground">
                      {item.candidateName}
                    </span>
                    <span className="font-sans text-xs text-muted-foreground">
                      {item.testTitle} · {item.vacancyTitle}
                    </span>
                    <span className="font-sans text-xs text-muted-foreground">
                      {t("activity.assignedLabel", {
                        date: formatMockDate(item.assignedAt, locale),
                      })}
                    </span>
                    <span className="font-sans text-xs font-medium text-emerald-800">
                      {t("activity.openItem")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function FilterField({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-sans text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  )
}
