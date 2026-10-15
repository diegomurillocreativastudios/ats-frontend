"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  BarChart3,
  Briefcase,
  Calendar,
  CalendarClock,
  ChevronRight,
  Users,
  type LucideIcon,
} from "lucide-react"
import { RECRUITER_DASHBOARD_LINKS } from "@/lib/rrhh/recruiter-dashboard"

export function DashboardShortcuts() {
  const t = useTranslations("RecruiterPortal.dashboard")

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {SHORTCUTS.map(({ key, href, icon: Icon }) => (
        <li key={key}>
          <Link
            href={href}
            className="group flex h-full min-h-20 items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-vo-purple/40 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vo-purple/10"
              aria-hidden
            >
              <Icon className="h-4 w-4 text-vo-purple" />
            </span>
            <span className="min-w-0">
              <span className="inline-flex items-center gap-1 font-sans text-sm font-semibold text-foreground">
                {t(`shortcuts.${key}.title`)}
                <ChevronRight
                  className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block font-sans text-xs leading-5 text-muted-foreground">
                {t(`shortcuts.${key}.description`)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

const SHORTCUTS: Array<{
  key: "candidates" | "vacancies" | "interviews" | "calendar" | "reports"
  href: string
  icon: LucideIcon
}> = [
  { key: "candidates", href: RECRUITER_DASHBOARD_LINKS.candidates, icon: Users },
  { key: "vacancies", href: RECRUITER_DASHBOARD_LINKS.vacancies, icon: Briefcase },
  { key: "interviews", href: RECRUITER_DASHBOARD_LINKS.interviews, icon: Calendar },
  { key: "calendar", href: RECRUITER_DASHBOARD_LINKS.calendar, icon: CalendarClock },
  { key: "reports", href: RECRUITER_DASHBOARD_LINKS.reports, icon: BarChart3 },
]
