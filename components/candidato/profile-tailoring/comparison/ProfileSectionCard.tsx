"use client"

import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import type { ProfileColumnVariant } from "@/components/candidato/profile-tailoring/comparison/comparison-utils"

interface ProfileSectionCardProps {
  title: string
  icon: LucideIcon
  sectionId: string
  variant: ProfileColumnVariant
  isHighlighted?: boolean
  changedLabel?: string
  children: ReactNode
}

export function ProfileSectionCard({
  title,
  icon: Icon,
  sectionId,
  variant,
  isHighlighted = false,
  changedLabel,
  children,
}: ProfileSectionCardProps) {
  const shellClass =
    variant === "original"
      ? "border-border/80 bg-white/90"
      : isHighlighted
        ? "border-vo-purple/40 bg-linear-to-r from-vo-purple/[0.12] via-vo-purple/[0.05] to-white shadow-[inset_3px_0_0_rgba(110,185,64,0.55)]"
        : "border-vo-purple/35 bg-linear-to-r from-vo-purple/[0.1] via-vo-purple/[0.04] to-white shadow-[inset_3px_0_0_rgba(110,185,64,0.45)]"

  const hoverClass =
    "motion-safe:transition-[border-color,background-color] motion-safe:duration-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-vo-purple/25 focus-within:ring-inset"

  return (
    <article
      className={`flex h-full min-w-0 flex-col rounded-xl border px-3.5 py-3 md:px-4 md:py-4 ${shellClass} ${hoverClass}`}
      aria-labelledby={sectionId}
    >
      <header className="mb-3 flex items-start justify-between gap-2 md:mb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              variant === "adapted"
                ? "bg-vo-purple/15 text-vo-purple"
                : "bg-muted text-muted-foreground"
            }`}
            aria-hidden
          >
            <Icon className="h-4 w-4" />
          </span>
          <h3
            id={sectionId}
            className="min-w-0 font-sans text-sm font-semibold text-foreground"
          >
            {title}
          </h3>
        </div>
        {isHighlighted && changedLabel ? (
          <span className="shrink-0 rounded-full border border-vo-purple/25 bg-vo-purple/12 px-2.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-vo-purple">
            {changedLabel}
          </span>
        ) : null}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </article>
  )
}
