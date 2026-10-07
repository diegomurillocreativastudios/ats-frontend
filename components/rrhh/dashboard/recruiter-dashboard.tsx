"use client"

import { useMemo, type ReactNode } from "react"
import { useFormatter, useTranslations } from "next-intl"
import { RefreshCw } from "lucide-react"
import { RrhhPortalShell } from "@/components/rrhh/rrhh-portal-shell"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { DashboardMetricCards } from "@/components/rrhh/dashboard/dashboard-metric-cards"
import { DashboardReminderList } from "@/components/rrhh/dashboard/dashboard-reminder-list"
import { DashboardShortcuts } from "@/components/rrhh/dashboard/dashboard-shortcuts"
import { DashboardUnavailableList } from "@/components/rrhh/dashboard/dashboard-unavailable-list"
import { DashboardVacanciesPanel } from "@/components/rrhh/dashboard/dashboard-vacancies-panel"
import { useRecruiterDashboard } from "@/hooks/use-recruiter-dashboard"
import { useRecruiterVacancyDashboard } from "@/hooks/use-recruiter-vacancy-dashboard"
import {
  isActionableReminder,
  isVacancyDashboardReminder,
  RECRUITER_DASHBOARD_LINKS,
  sortDashboardReminders,
  type DashboardMetric,
  type DashboardMetricKey,
  type DashboardReminderKey,
} from "@/lib/rrhh/recruiter-dashboard"
import type { VacancyDashboardSnapshot } from "@/lib/rrhh/recruiter-vacancy-dashboard"

export function RecruiterDashboard() {
  const t = useTranslations("RecruiterPortal.dashboard")
  const format = useFormatter()
  const { data, isLoading, error, reload } = useRecruiterDashboard()
  const {
    data: vacancySnapshot,
    isLoading: isVacancyLoading,
    error: vacancyError,
    reload: reloadVacancies,
  } = useRecruiterVacancyDashboard()

  const { actionable, unavailable } = useMemo(() => {
    const reminders = data?.reminders ?? []
    const getLabel = (key: DashboardReminderKey) =>
      t(`reminders.${key}.title`)
    return {
      actionable: sortDashboardReminders(
        reminders.filter(isActionableReminder),
        getLabel
      ),
      unavailable: sortDashboardReminders(
        reminders.filter((reminder) => reminder.sourceState === "unavailable"),
        getLabel
      ),
    }
  }, [data, t])

  const candidateActionable = actionable.filter(
    (reminder) => !isVacancyDashboardReminder(reminder.key)
  )
  const candidateUnavailable = unavailable.filter(
    (reminder) => !isVacancyDashboardReminder(reminder.key)
  )
  const vacancyActionable = actionable.filter((reminder) =>
    isVacancyDashboardReminder(reminder.key)
  )
  const vacancyUnavailable = unavailable.filter((reminder) =>
    isVacancyDashboardReminder(reminder.key)
  )
  const candidateMetrics = (data?.metrics ?? []).filter(
    (metric) => metric.key !== "activeVacancies"
  )
  const activeMetric = buildActiveVacanciesMetric({
    snapshot: vacancySnapshot,
    isLoading: isVacancyLoading,
    error: vacancyError,
  })

  const handleReload = () => {
    void reload()
    void reloadVacancies()
  }

  const handleVacancyRetry = () => {
    void reloadVacancies()
  }

  const updatedText = data
    ? t("updatedAt", {
        time: format.dateTime(new Date(data.generatedAt), {
          timeStyle: "short",
        }),
      })
    : null

  const showFullError = !!error && !data

  return (
    <RrhhPortalShell breadcrumbLabel={t("breadcrumb")}>
      <div className="flex min-w-0 flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          title={t("title")}
          description={t("description")}
          layout="split"
          className="pb-4"
          actions={
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <button
                type="button"
                onClick={handleReload}
                disabled={isLoading || isVacancyLoading}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading || isVacancyLoading ? "animate-spin motion-reduce:animate-none" : ""}`}
                  aria-hidden
                />
                {isLoading || isVacancyLoading ? t("refreshing") : t("refresh")}
              </button>
              {updatedText ? (
                <span className="font-sans text-xs text-muted-foreground">
                  {updatedText}
                </span>
              ) : null}
            </div>
          }
        />

        <DashboardContainer
          id="rrhh-dashboard-vacancies"
          title={t("containers.vacancies")}
          description={t("vacancies.description")}
        >
          <DashboardVacanciesPanel
            activeMetric={activeMetric}
            isActiveLoading={isLoading && !data}
            snapshot={vacancySnapshot}
            isLoading={isVacancyLoading}
            error={vacancyError}
            actionableReminders={vacancyActionable}
            unavailableReminders={vacancyUnavailable}
            onRetry={handleVacancyRetry}
          />
        </DashboardContainer>

        <DashboardContainer id="rrhh-dashboard-candidates" title={t("containers.candidates")}>
          {showFullError ? (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="font-sans text-sm text-destructive">
                <p className="font-semibold">{t("panelError.title")}</p>
                <p>{t("panelError.description")}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void reload()
                }}
                disabled={isLoading}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-vo-purple px-4 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("panelError.retry")}
              </button>
            </div>
          ) : (
            <>
              <DashboardSection id="rrhh-dashboard-metrics" title={t("metricsTitle")}>
                <DashboardMetricCards
                  metrics={candidateMetrics}
                  isLoading={isLoading && !data}
                  skeletonKeys={CANDIDATE_METRIC_KEYS}
                />
              </DashboardSection>

              <DashboardSection
                id="rrhh-dashboard-reminders"
                title={t("remindersTitle")}
                description={t("remindersDescription")}
              >
                <DashboardReminderList
                  reminders={candidateActionable}
                  isLoading={isLoading && !data}
                />
              </DashboardSection>

              {candidateUnavailable.length > 0 ? (
                <DashboardSection
                  id="rrhh-dashboard-unavailable"
                  title={t("unavailableTitle")}
                  description={t("unavailableDescription")}
                >
                  <DashboardUnavailableList reminders={candidateUnavailable} />
                </DashboardSection>
              ) : null}
            </>
          )}
        </DashboardContainer>

        <DashboardSection id="rrhh-dashboard-shortcuts" title={t("shortcutsTitle")}>
          <DashboardShortcuts />
        </DashboardSection>
      </div>
    </RrhhPortalShell>
  )
}

interface DashboardSectionProps {
  id: string
  title: string
  description?: string
  children: ReactNode
}

function DashboardSection({ id, title, description, children }: DashboardSectionProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div>
        <h2 id={id} className="font-sans text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 font-sans text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function DashboardContainer({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-6 rounded-xl border border-border p-4 md:p-6"
    >
      <div>
        <h2 id={id} className="font-sans text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 font-sans text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

const CANDIDATE_METRIC_KEYS: readonly DashboardMetricKey[] = [
  "upcomingInterviews",
  "staleCandidates",
  "pendingEvaluations",
]

function buildActiveVacanciesMetric({
  snapshot,
  isLoading,
  error,
}: {
  snapshot: VacancyDashboardSnapshot | null
  isLoading: boolean
  error: string | null
}): DashboardMetric | null {
  if (isLoading && !snapshot) return null
  if (!snapshot) {
    return {
      key: "activeVacancies",
      value: null,
      sourceState: error ? "error" : "unavailable",
      href: RECRUITER_DASHBOARD_LINKS.vacanciesActivas,
    }
  }
  return {
    key: "activeVacancies",
    value: snapshot.activeVacancies,
    sourceState: snapshot.listPartial ? "partial" : "ready",
    href: RECRUITER_DASHBOARD_LINKS.vacanciesActivas,
  }
}
