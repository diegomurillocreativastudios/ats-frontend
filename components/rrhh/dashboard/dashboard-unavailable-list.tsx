"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import type { DashboardReminder } from "@/lib/rrhh/recruiter-dashboard"

interface DashboardUnavailableListProps {
  reminders: DashboardReminder[]
}

export function DashboardUnavailableList({
  reminders,
}: DashboardUnavailableListProps) {
  const t = useTranslations("RecruiterPortal.dashboard")

  if (reminders.length === 0) return null

  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {reminders.map((reminder) => {
        const title = t(`reminders.${reminder.key}.title`)
        return (
          <li
            key={reminder.key}
            className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-card/60 p-4"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-sans text-sm font-semibold text-foreground">
                  {title}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 font-sans text-xs font-medium text-muted-foreground">
                  {t("unavailableBadge")}
                </span>
              </div>
              {reminder.context?.days ? (
                <p className="mt-1 font-sans text-xs text-muted-foreground">
                  {t("inactiveVacanciesRule", { days: reminder.context.days })}
                </p>
              ) : null}
            </div>
            {reminder.href ? (
              <Link
                href={reminder.href}
                aria-label={t("openModuleAria", { title })}
                className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-3 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t("openModule")}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
