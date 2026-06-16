"use client"

import { useTranslations } from "next-intl"
import type { ScoreSummary, StageCountRow } from "@/lib/rrhh/vacancy-pipeline-stats"

export interface VacancyResultadosKpisStripProps {
  totalApplicants: number
  scoreSummary: ScoreSummary
  byStage: StageCountRow[]
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(1)} %`
}

function aggregateStageSignals(byStage: StageCountRow[]) {
  let inInterview = 0
  let hired = 0
  let rejected = 0
  for (const row of byStage) {
    const n = row.count
    const s = row.stageName.toLowerCase()
    if (s.includes("interview") || s.includes("entrevista")) inInterview += n
    if (s.includes("hired") || s.includes("contratad") || s.includes("contratado")) hired += n
    if (
      s.includes("reject") ||
      s.includes("rechaz") ||
      s.includes("descart") ||
      s.includes("no contrat")
    ) {
      rejected += n
    }
  }
  return { inInterview, hired, rejected }
}

export function VacancyResultadosKpisStrip({
  totalApplicants,
  scoreSummary,
  byStage,
}: VacancyResultadosKpisStripProps) {
  const t = useTranslations("RecruiterPortal.vacancies.results.kpis")
  const signals = aggregateStageSignals(byStage)
  const items: { label: string; value: string; hint?: string }[] = [
    { label: t("applicants"), value: String(totalApplicants) },
    {
      label: t("scored"),
      value: String(scoreSummary.count),
      hint: t("scoredHint"),
    },
    { label: t("averageMatch"), value: formatPercent(scoreSummary.meanPercent) },
    { label: t("bestMatch"), value: formatPercent(scoreSummary.maxPercent) },
    { label: t("inInterviewApprox"), value: String(signals.inInterview) },
  ]
  if (signals.hired > 0 || signals.rejected > 0) {
    items.push({
      label: t("hiredRejectedApprox"),
      value: `${signals.hired} / ${signals.rejected}`,
      hint: t("hiredRejectedHint"),
    })
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
      aria-labelledby="vacancy-resultados-kpis-heading"
    >
      <h2
        id="vacancy-resultados-kpis-heading"
        className="mb-3 font-sans text-sm font-semibold text-foreground"
      >
        {t("heading")}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <li
            key={item.label}
            className="rounded-lg border border-border/60 bg-muted/30 px-3 py-3"
          >
            <p className="font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 font-sans text-xl font-semibold tabular-nums text-foreground">
              {item.value}
            </p>
            {item.hint ? (
              <p className="mt-1 font-sans text-[11px] text-muted-foreground">{item.hint}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
