"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  Briefcase,
  CalendarClock,
  ClipboardCheck,
  Hourglass,
  type LucideIcon,
} from "lucide-react"
import {
  DASHBOARD_UPCOMING_INTERVIEW_DAYS,
  type DashboardMetric,
  type DashboardMetricKey,
} from "@/lib/rrhh/recruiter-dashboard"

interface DashboardMetricCardsProps {
  metrics: DashboardMetric[]
  isLoading: boolean
}

export function DashboardMetricCards({
  metrics,
  isLoading,
}: DashboardMetricCardsProps) {
  const t = useTranslations("RecruiterPortal.dashboard")

  if (isLoading && metrics.length === 0) {
    return (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-busy="true"
      >
        {METRIC_ORDER.map((key) => (
          <div
            key={key}
            className="h-32 animate-pulse rounded-xl border border-border bg-muted/60 motion-reduce:animate-none"
          />
        ))}
        <span className="sr-only">{t("loading")}</span>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <li key={metric.key}>
          <DashboardMetricCard metric={metric} />
        </li>
      ))}
    </ul>
  )
}

function DashboardMetricCard({ metric }: { metric: DashboardMetric }) {
  const t = useTranslations("RecruiterPortal.dashboard")
  const Icon = METRIC_ICONS[metric.key]
  const label = t(`metrics.${metric.key}`)
  const hasValue = metric.value != null
  const valueText = hasValue ? String(metric.value) : t("valueUnavailable")

  return (
    <Link
      href={metric.href}
      aria-label={t("metricLinkAria", { label, value: valueText })}
      className="group flex h-full min-h-32 flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-vo-purple/40 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-sans text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vo-purple/10"
          aria-hidden
        >
          <Icon className="h-4 w-4 text-vo-purple" />
        </span>
      </div>
      <div>
        <p className="font-sans text-3xl font-bold leading-none tracking-tight text-foreground">
          {hasValue ? metric.value : "—"}
        </p>
        <MetricStateNote metric={metric} />
      </div>
    </Link>
  )
}

function MetricStateNote({ metric }: { metric: DashboardMetric }) {
  const t = useTranslations("RecruiterPortal.dashboard")
  if (metric.sourceState === "ready") {
    return metric.key === "upcomingInterviews" ? (
      <p className="mt-2 font-sans text-xs text-muted-foreground">
        {t("metricUpcomingWindow", { days: DASHBOARD_UPCOMING_INTERVIEW_DAYS })}
      </p>
    ) : null
  }
  const noteKey = METRIC_STATE_NOTES[metric.sourceState]
  return (
    <p
      className={`mt-2 font-sans text-xs ${
        metric.sourceState === "error" ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {t(noteKey)}
    </p>
  )
}

const METRIC_ORDER: DashboardMetricKey[] = [
  "activeVacancies",
  "upcomingInterviews",
  "staleCandidates",
  "pendingEvaluations",
]

const METRIC_ICONS: Record<DashboardMetricKey, LucideIcon> = {
  activeVacancies: Briefcase,
  upcomingInterviews: CalendarClock,
  staleCandidates: Hourglass,
  pendingEvaluations: ClipboardCheck,
}

const METRIC_STATE_NOTES = {
  partial: "metricPartial",
  unavailable: "metricUnavailable",
  error: "metricError",
} as const
