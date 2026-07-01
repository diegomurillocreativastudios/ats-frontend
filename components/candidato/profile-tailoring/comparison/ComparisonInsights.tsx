"use client"

import { useTranslations } from "next-intl"
import { Sparkles } from "lucide-react"
import type { ProfileChangeHighlight } from "@/lib/candidate-profile-version"

interface ComparisonInsightsProps {
  adaptationSummary: string | null
  changeHighlights: ProfileChangeHighlight[]
}

export function ComparisonInsights({
  adaptationSummary,
  changeHighlights,
}: ComparisonInsightsProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison")

  return (
    <details className="group overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm motion-safe:transition-shadow hover:shadow-md">
      <summary className="cursor-pointer list-none px-4 py-3.5 font-sans text-sm font-medium text-foreground marker:content-none focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-vo-purple/12 text-vo-purple">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </span>
          {t("insightsToggle")}
        </span>
      </summary>
      <div className="space-y-4 border-t border-border/70 bg-ats-arena/20 px-4 py-4">
        {adaptationSummary ? (
          <article className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
            <h3 className="font-sans text-sm font-semibold text-foreground">
              {t("summaryTitle")}
            </h3>
            <p className="mt-2 max-w-prose whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
              {adaptationSummary}
            </p>
          </article>
        ) : null}

        {changeHighlights.length > 0 ? (
          <article className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
            <h3 className="font-sans text-sm font-semibold text-foreground">
              {t("highlightsTitle")}
            </h3>
            <ul className="mt-3 flex flex-col gap-2.5">
              {changeHighlights.map((item) => (
                <li
                  key={`${item.field}-${item.before}-${item.after}`}
                  className="rounded-xl border border-border/60 bg-muted/15 px-3.5 py-3"
                >
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.field}
                  </p>
                  <p className="mt-1.5 font-sans text-sm text-foreground">
                    <span className="text-muted-foreground line-through decoration-muted-foreground/50">
                      {item.before || "—"}
                    </span>
                    <span className="mx-2 text-muted-foreground" aria-hidden>
                      →
                    </span>
                    <span className="font-medium text-vo-purple">{item.after || "—"}</span>
                  </p>
                  {item.reason ? (
                    <p className="mt-1.5 font-sans text-xs leading-relaxed text-muted-foreground">
                      {item.reason}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </article>
        ) : null}
      </div>
    </details>
  )
}
