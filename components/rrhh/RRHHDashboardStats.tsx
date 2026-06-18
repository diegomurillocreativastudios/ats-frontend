"use client"

import { Users, Briefcase, Calendar, UserCheck } from "lucide-react"
import { useTranslations } from "next-intl"

export default function RRHHDashboardStats({
  compact = false,
  responsiveGrid = false,
}) {
  const t = useTranslations("RecruiterPortal.dashboard")

  const statConfig = [
    {
      value: "245",
      labelKey: "activeCandidates" as const,
      icon: Users,
      iconBg: "bg-[#F3E8FF]",
      iconColor: "text-vo-purple",
    },
    {
      value: "12",
      labelKey: "openVacancies" as const,
      icon: Briefcase,
      iconBg: "bg-[#F3E8FF]",
      iconColor: "text-vo-purple",
    },
    {
      value: "8",
      labelKey: "interviewsToday" as const,
      icon: Calendar,
      iconBg: "bg-[#F3E8FF]",
      iconColor: "text-vo-purple",
    },
    {
      value: "23",
      labelKey: "hiresThisMonth" as const,
      icon: UserCheck,
      iconBg: "bg-[#F3E8FF]",
      iconColor: "text-vo-purple",
    },
  ]

  const gridClass = responsiveGrid
    ? "grid-cols-2 md:grid-cols-4"
    : "sm:grid-cols-2 lg:grid-cols-4"

  return (
    <div
      className={`grid w-full gap-4 ${gridClass} ${compact ? "gap-3" : "gap-4 md:gap-4"}`}
      aria-label={t("statsAria")}
    >
      {statConfig.map((stat) => {
        const Icon = stat.icon
        const label = t(stat.labelKey)
        return (
          <div
            key={stat.labelKey}
            className={`rounded-lg border border-border bg-card flex flex-col gap-2 ${
              compact ? "p-3" : "p-4 md:p-4 lg:p-6"
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg md:h-8 md:w-8 ${
                compact ? "h-8 w-8" : "h-10 w-10 lg:h-10 lg:w-10"
              } ${stat.iconBg}`}
            >
              <Icon
                className={`${stat.iconColor} ${compact ? "h-4 w-4" : "h-5 w-5"}`}
                aria-hidden
              />
            </div>
            <span
              className={`font-sans font-bold text-foreground ${
                compact ? "text-xl" : "text-2xl lg:text-[28px]"
              }`}
            >
              {stat.value}
            </span>
            <span className="font-sans text-xs text-muted-foreground md:text-sm">
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
