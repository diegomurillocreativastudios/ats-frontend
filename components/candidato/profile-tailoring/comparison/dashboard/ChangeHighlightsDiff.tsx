"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react"
import type { ProfileChangeHighlight } from "@/lib/candidate-profile-version"
import {
  formatChangeDisplayValue,
  formatChangeFieldName,
} from "@/lib/profile-comparison-helpers"
import { useChangeDisplayLabels } from "@/components/candidato/profile-tailoring/comparison/use-change-display-labels"

interface ChangeHighlightsDiffProps {
  changeHighlights: ProfileChangeHighlight[]
}

const TRUNCATE_LENGTH = 220

function DiffText({ text, expanded, onToggle, showToggleLabel }: {
  text: string
  expanded: boolean
  onToggle: () => void
  showToggleLabel: { more: string; less: string }
}) {
  const needsTruncate = text.length > TRUNCATE_LENGTH
  const display = needsTruncate && !expanded ? `${text.slice(0, TRUNCATE_LENGTH)}…` : text

  return (
    <div>
      <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">{display}</p>
      {needsTruncate ? (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1.5 inline-flex items-center gap-1 font-sans text-xs font-medium text-vo-purple hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              {showToggleLabel.less}
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              {showToggleLabel.more}
            </>
          )}
        </button>
      ) : null}
    </div>
  )
}

function ChangeDiffCard({ item }: { item: ProfileChangeHighlight }) {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison.dashboard")
  const { displayLabels, fieldLabels } = useChangeDisplayLabels()
  const [beforeExpanded, setBeforeExpanded] = useState(false)
  const [afterExpanded, setAfterExpanded] = useState(false)

  const beforeText = formatChangeDisplayValue(item.before, item.field, displayLabels)
  const afterText = formatChangeDisplayValue(item.after, item.field, displayLabels)

  return (
    <article className="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm">
      <div className="border-b border-border/60 bg-muted/15 px-4 py-3">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {formatChangeFieldName(item.field, fieldLabels)}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
        <div className="border-b border-border/50 p-4 md:border-b-0 md:border-r">
          <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
            {t("beforeLabel")}
          </p>
          <DiffText
            text={beforeText}
            expanded={beforeExpanded}
            onToggle={() => setBeforeExpanded((prev) => !prev)}
            showToggleLabel={{ more: t("showMore"), less: t("showLess") }}
          />
        </div>
        <div className="p-4">
          <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
            {t("afterLabel")}
          </p>
          <DiffText
            text={afterText}
            expanded={afterExpanded}
            onToggle={() => setAfterExpanded((prev) => !prev)}
            showToggleLabel={{ more: t("showMore"), less: t("showLess") }}
          />
        </div>
      </div>
      {item.reason?.trim() ? (
        <div className="border-t border-border/60 bg-sky-500/5 px-4 py-3">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("reasonLabel")}
          </p>
          <p className="mt-1 font-sans text-sm leading-relaxed text-foreground/90">{item.reason}</p>
        </div>
      ) : null}
    </article>
  )
}

export function ChangeHighlightsDiff({ changeHighlights }: ChangeHighlightsDiffProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison.dashboard")

  if (changeHighlights.length === 0) return null

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm"
      aria-label={t("changesTitle")}
    >
      <div className="flex items-center gap-2 border-b border-border/70 bg-ats-arena/20 px-4 py-3.5 md:px-5">
        <ArrowRight className="h-4 w-4 text-vo-purple" aria-hidden />
        <h3 className="font-display text-base font-semibold text-foreground">{t("changesTitle")}</h3>
        <span className="ml-auto rounded-full border border-border/70 bg-white px-2 py-0.5 font-sans text-[11px] font-medium text-muted-foreground">
          {changeHighlights.length}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-4 md:p-5">
        {changeHighlights.map((item) => (
          <ChangeDiffCard key={`${item.field}-${item.before}-${item.after}`} item={item} />
        ))}
      </div>
    </section>
  )
}
