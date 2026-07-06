"use client"

import type { ReactNode } from "react"

type StatusTone = "current" | "adapted" | "warning" | "info" | "neutral"

interface StatusBadgeProps {
  children: ReactNode
  tone?: StatusTone
  className?: string
}

const TONE_CLASSES: Record<StatusTone, string> = {
  current: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200",
  adapted: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  warning: "border-amber-500/35 bg-amber-500/12 text-amber-800 dark:text-amber-200",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200",
  neutral: "border-border/70 bg-muted/40 text-muted-foreground",
}

export function StatusBadge({ children, tone = "neutral", className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-wide ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
