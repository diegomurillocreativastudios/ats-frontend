"use client"

import Link from "next/link"
import { useFormatter, useTranslations } from "next-intl"
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Info,
  type LucideIcon,
} from "lucide-react"
import type {
  DashboardReminder,
  DashboardSeverity,
} from "@/lib/rrhh/recruiter-dashboard"

interface DashboardReminderListProps {
  reminders: DashboardReminder[]
  isLoading: boolean
}

export function DashboardReminderList({
  reminders,
  isLoading,
}: DashboardReminderListProps) {
  const t = useTranslations("RecruiterPortal.dashboard")

  if (isLoading && reminders.length === 0) {
    return (
      <p className="font-sans text-sm text-muted-foreground" role="status">
        {t("loading")}
      </p>
    )
  }

  if (reminders.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-vo-purple" aria-hidden />
        <p className="font-sans text-sm text-muted-foreground">
          {t("remindersEmpty")}
        </p>
      </div>
    )
  }

  return (
    <ol className="flex flex-col gap-3">
      {reminders.map((reminder) => (
        <li key={reminder.key}>
          <DashboardReminderItem reminder={reminder} />
        </li>
      ))}
    </ol>
  )
}

function DashboardReminderItem({ reminder }: { reminder: DashboardReminder }) {
  const t = useTranslations("RecruiterPortal.dashboard")
  const severity = SEVERITY_STYLES[reminder.severity]
  const SeverityIcon = severity.icon
  const title = t(`reminders.${reminder.key}.title`)

  return (
    <article
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label={title}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${severity.iconClass}`}
          aria-hidden
        >
          <SeverityIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-sans text-sm font-semibold text-foreground">
              {title}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 font-sans text-xs font-medium ${severity.badgeClass}`}
            >
              {t(`severity.${reminder.severity}`)}
            </span>
          </div>
          <ReminderDescription reminder={reminder} />
        </div>
      </div>
      {reminder.href ? (
        <Link
          href={reminder.href}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-vo-purple px-4 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t(`reminders.${reminder.key}.action`)}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
    </article>
  )
}

function ReminderDescription({ reminder }: { reminder: DashboardReminder }) {
  const t = useTranslations("RecruiterPortal.dashboard")
  const format = useFormatter()

  if (reminder.sourceState === "error") {
    return (
      <p className="mt-1 font-sans text-sm text-destructive">{t("errorNote")}</p>
    )
  }

  const count = reminder.count ?? 0
  const days = reminder.context?.days ?? 0
  const dueText = reminder.dueAt
    ? format.dateTime(new Date(reminder.dueAt), {
        dateStyle: "medium",
        timeStyle: reminder.key === "upcomingInterviews" ? "short" : undefined,
      })
    : null

  return (
    <div className="mt-1 flex flex-col gap-1 font-sans text-sm text-muted-foreground">
      <p>{t(`reminders.${reminder.key}.description`, { count, days })}</p>
      {dueText ? (
        <p className="text-xs">
          {t(reminder.key === "upcomingInterviews" ? "nextAt" : "oldestAt", {
            date: dueText,
          })}
        </p>
      ) : null}
      {reminder.sourceState === "partial" ? (
        <p className="text-xs">
          {t("partialNote", {
            analyzed: reminder.context?.analyzed ?? 0,
            total: reminder.context?.total ?? 0,
          })}
        </p>
      ) : null}
    </div>
  )
}

const SEVERITY_STYLES: Record<
  DashboardSeverity,
  { icon: LucideIcon; iconClass: string; badgeClass: string }
> = {
  critical: {
    icon: AlertTriangle,
    iconClass: "bg-destructive/10 text-destructive",
    badgeClass: "bg-destructive/10 text-destructive",
  },
  action: {
    icon: CircleAlert,
    iconClass: "bg-vo-purple/10 text-vo-purple",
    badgeClass: "bg-vo-purple/10 text-foreground",
  },
  upcoming: {
    icon: CalendarClock,
    iconClass: "bg-muted text-foreground",
    badgeClass: "bg-muted text-foreground",
  },
  info: {
    icon: Info,
    iconClass: "bg-muted text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
  },
}
