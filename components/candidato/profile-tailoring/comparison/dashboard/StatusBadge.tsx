"use client"

import type { ReactNode } from "react"

type StatusTone = "current" | "adapted" | "warning" | "info" | "neutral"

interface StatusBadgeProps {
  children: ReactNode
  tone?: StatusTone
  className?: string
}

const TONE_CLASSES: Record<StatusTone, string> = {
  current: "border-gray-400/40 bg-gray-100 text-gray-700 dark:text-gray-200",
  adapted: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  warning: "border-amber-500/35 bg-amber-500/12 text-amber-800 dark:text-amber-200",
  info: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
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
