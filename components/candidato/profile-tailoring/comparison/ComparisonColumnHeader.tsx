"use client"

import { Sparkles, User } from "lucide-react"
import type { ProfileColumnVariant } from "@/components/candidato/profile-tailoring/comparison/comparison-utils"

interface ComparisonColumnHeaderProps {
  title: string
  badge: string
  variant: ProfileColumnVariant
}

export function ComparisonColumnHeader({ title, badge, variant }: ComparisonColumnHeaderProps) {
  const Icon = variant === "original" ? User : Sparkles

  const shellClass =
    variant === "original"
      ? "border-border/80 bg-white/90"
      : "border-vo-purple/35 bg-linear-to-r from-vo-purple/[0.1] via-vo-purple/[0.04] to-white shadow-[inset_3px_0_0_rgba(110,185,64,0.45)]"

  const badgeClass =
    variant === "original"
      ? "border border-border/80 bg-muted/50 text-muted-foreground"
      : "border border-vo-purple/25 bg-vo-purple/12 text-vo-purple"

  const iconShellClass =
    variant === "original"
      ? "bg-muted text-muted-foreground"
      : "bg-vo-purple/15 text-vo-purple"

  return (
    <div
      className={`flex min-w-0 items-center gap-3 rounded-xl border px-3.5 py-3 ${shellClass}`}
    >
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconShellClass}`}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-semibold text-foreground">{title}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}>
        {badge}
      </span>
    </div>
  )
}
