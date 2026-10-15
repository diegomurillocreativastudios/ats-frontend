"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { EyeOff, Timer, UserRoundX, type LucideIcon } from "lucide-react"
import { DashboardMetricCard } from "@/components/rrhh/dashboard/dashboard-metric-cards"
import { DashboardReminderList } from "@/components/rrhh/dashboard/dashboard-reminder-list"
import { DashboardUnavailableList } from "@/components/rrhh/dashboard/dashboard-unavailable-list"
import type {
  DashboardMetric,
  DashboardReminder,
  DashboardVacancyAttentionRow,
} from "@/lib/rrhh/recruiter-dashboard"
import { vacancyListViewPath, type VacancyListView } from "@/lib/rrhh/vacancy-list-views"

interface DashboardVacanciesPanelProps {
  activeMetric: DashboardMetric | null
  countMetrics: {
    withoutCandidates: DashboardMetric | null
    overdue: DashboardMetric | null
    unpublished: DashboardMetric | null
  }
  vacancyAttention: DashboardVacancyAttentionRow[]
  isLoading: boolean
  actionableReminders: DashboardReminder[]
  unavailableReminders: DashboardReminder[]
}

export function DashboardVacanciesPanel({
  activeMetric,
  countMetrics,
  vacancyAttention,
  isLoading,
  actionableReminders,
  unavailableReminders,
}: DashboardVacanciesPanelProps) {
  const t = useTranslations("RecruiterPortal.dashboard")

  return (
    <div className="flex flex-col gap-6">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <li>
          {isLoading && !activeMetric ? (
            <MetricSkeleton />
          ) : activeMetric ? (
            <DashboardMetricCard metric={activeMetric} />
          ) : (
            <MetricSkeleton />
          )}
        </li>
        {COUNT_CARDS.map((card) => {
          const metric = countMetrics[card.key]
          return (
            <li key={card.key}>
              {isLoading && !metric ? (
                <MetricSkeleton />
              ) : (
                <CountCard
                  label={t(`vacancies.metrics.${card.key}`)}
                  value={metric?.value ?? null}
                  icon={card.icon}
                  href={vacancyListViewPath(card.view)}
                  note={countCardNote(metric, t)}
                  noteIsError={metric?.sourceState === "error"}
                />
              )}
            </li>
          )
        })}
      </ul>

      {isLoading || actionableReminders.length > 0 ? (
        <DashboardReminderList
          reminders={actionableReminders}
          isLoading={isLoading && actionableReminders.length === 0}
        />
      ) : null}
      {unavailableReminders.length > 0 ? (
        <DashboardUnavailableList reminders={unavailableReminders} />
      ) : null}

      {!isLoading ? <VacancyAttentionList rows={vacancyAttention} /> : null}
    </div>
  )
}

function VacancyAttentionList({ rows }: { rows: DashboardVacancyAttentionRow[] }) {
  const t = useTranslations("RecruiterPortal.dashboard")

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-sans text-sm font-semibold text-foreground">
        {t("vacancies.attentionTitle")}
      </h3>
      {rows.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground">
          {t("vacancies.attentionEmpty")}
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {rows.map((row) => {
            const title = row.title.trim() !== "" ? row.title : t("vacancies.untitled")
            return (
              <li key={row.vacancyId}>
                <article
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                  aria-label={title}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-sans text-sm font-semibold text-foreground">
                        {title}
                      </h4>
                      <span className="rounded-full bg-muted px-2 py-0.5 font-sans text-xs font-medium text-foreground">
                        {t(`vacancies.signals.${row.signal}`)}
                      </span>
                    </div>
                    <p className="mt-1 font-sans text-sm text-muted-foreground">
                      {[
                        row.clientName,
                        row.daysOpen != null
                          ? t("vacancies.daysOpen", { days: row.daysOpen })
                          : null,
                        t("vacancies.candidateCount", { count: row.candidateCount }),
                      ]
                        .filter((part) => part != null && part !== "")
                        .join(" · ")}
                    </p>
                  </div>
                  <Link
                    href={row.href}
                    aria-label={t("vacancies.openVacancyAria", { title })}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-border bg-card px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                  >
                    {t("vacancies.openVacancy")}
                  </Link>
                </article>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function CountCard({
  label,
  value,
  icon: Icon,
  href,
  note,
  noteIsError,
}: {
  label: string
  value: number | null
  icon: LucideIcon
  href: string
  note: string | null
  noteIsError: boolean
}) {
  const t = useTranslations("RecruiterPortal.dashboard")
  const hasValue = value != null
  const valueText = hasValue ? String(value) : t("valueUnavailable")

  return (
    <Link
      href={href}
      aria-label={t("metricLinkAria", { label, value: valueText })}
      className="group flex h-full min-h-32 flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-vo-purple/40 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-sans text-sm font-medium text-muted-foreground">{label}</span>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vo-purple/10"
          aria-hidden
        >
          <Icon className="h-4 w-4 text-vo-purple" />
        </span>
      </div>
      <div>
        <p className="font-sans text-3xl font-bold leading-none tracking-tight text-foreground">
          {hasValue ? value : "—"}
        </p>
        {note ? (
          <p
            className={`mt-2 font-sans text-xs ${
              noteIsError ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {note}
          </p>
        ) : null}
      </div>
    </Link>
  )
}

function MetricSkeleton() {
  return (
    <div className="h-32 animate-pulse rounded-xl border border-border bg-muted/60 motion-reduce:animate-none" />
  )
}

const COUNT_CARDS: Array<{
  key: "withoutCandidates" | "overdue" | "unpublished"
  view: VacancyListView
  icon: LucideIcon
}> = [
  { key: "withoutCandidates", view: "sin-postulaciones", icon: UserRoundX },
  { key: "overdue", view: "fuera-de-plazo", icon: Timer },
  { key: "unpublished", view: "no-publicadas", icon: EyeOff },
]

function countCardNote(
  metric: DashboardMetric | null,
  t: ReturnType<typeof useTranslations<"RecruiterPortal.dashboard">>
): string | null {
  if (!metric) return t("metricUnavailable")
  if (metric.sourceState === "ready") return null
  if (metric.sourceState === "partial") return t("metricPartial")
  if (metric.sourceState === "error") return t("metricError")
  return t("metricUnavailable")
}
