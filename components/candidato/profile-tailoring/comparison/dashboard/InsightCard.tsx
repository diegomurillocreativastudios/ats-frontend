"use client"

import type { LucideIcon } from "lucide-react"

interface InsightCardProps {
  icon: LucideIcon
  title: string
  value: string
  tone?: "default" | "warning" | "success" | "info"
}

const TONE_CLASSES = {
  default: "border-border/70 bg-white",
  warning: "border-amber-500/25 bg-amber-500/5",
  success: "border-emerald-500/25 bg-emerald-500/5",
  info: "border-sky-500/25 bg-sky-500/5",
} as const

const ICON_CLASSES = {
  default: "bg-muted text-muted-foreground",
  warning: "bg-amber-500/12 text-amber-600",
  success: "bg-emerald-500/12 text-emerald-600",
  info: "bg-sky-500/12 text-sky-600",
} as const

export function InsightCard({ icon: Icon, title, value, tone = "default" }: InsightCardProps) {
  return (
    <article
      className={`rounded-xl border px-3.5 py-3 motion-safe:transition-shadow hover:shadow-sm ${TONE_CLASSES[tone]}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ICON_CLASSES[tone]}`}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 font-sans text-sm font-medium leading-snug text-foreground">{value}</p>
        </div>
      </div>
    </article>
  )
}
