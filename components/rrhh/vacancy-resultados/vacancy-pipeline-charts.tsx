"use client"

import { useTranslations } from "next-intl"
import type {
  ComponentScoreAverages,
  ScoreBucketRow,
  ScoreSummary,
  StageCountRow,
} from "@/lib/rrhh/vacancy-pipeline-stats"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const COLOR_STAGE = "#6E3385"
const COLOR_SCORE = "#496FB3"
const COLOR_COMPONENT = "#0D9488"

export interface VacancyPipelineChartsProps {
  componentAverages: ComponentScoreAverages
  byStage: StageCountRow[]
  scoreBuckets: ScoreBucketRow[]
  scoreSummary: ScoreSummary
  totalApplicants: number
}

function buildComponentAverageRows(
  averages: ComponentScoreAverages,
  labels: {
    qualitative: string
    vector: string
    attribute: string
  }
): { name: string; pct: number }[] {
  const rows: { name: string; pct: number }[] = []
  if (averages.qualitativeMean01 != null && Number.isFinite(averages.qualitativeMean01)) {
    rows.push({
      name: labels.qualitative,
      pct: Math.round(averages.qualitativeMean01 * 1000) / 10,
    })
  }
  if (averages.vectorMean01 != null && Number.isFinite(averages.vectorMean01)) {
    rows.push({
      name: labels.vector,
      pct: Math.round(averages.vectorMean01 * 1000) / 10,
    })
  }
  if (averages.attributeMean01 != null && Number.isFinite(averages.attributeMean01)) {
    rows.push({
      name: labels.attribute,
      pct: Math.round(averages.attributeMean01 * 1000) / 10,
    })
  }
  return rows
}

export function VacancyPipelineCharts({
  componentAverages,
  byStage,
  scoreBuckets,
  scoreSummary,
  totalApplicants,
}: VacancyPipelineChartsProps) {
  const t = useTranslations("RecruiterPortal.vacancies.results.charts")
  const componentAvgRows = buildComponentAverageRows(componentAverages, {
    qualitative: t("qualitativeAvg"),
    vector: t("vectorAvg"),
    attribute: t("attributeAvg"),
  })

  if (totalApplicants === 0) {
    return (
      <p
        className="rounded-lg border border-border bg-muted/40 px-4 py-8 text-center font-sans text-sm text-muted-foreground"
        role="status"
      >
        {t("noApplicants")}
      </p>
    )
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
      aria-labelledby="vacancy-resultados-charts-heading"
    >
      <h2
        id="vacancy-resultados-charts-heading"
        className="mb-1 font-sans text-sm font-semibold text-foreground"
      >
        {t("heading")}
      </h2>
      <p className="mb-4 font-sans text-xs text-muted-foreground">{t("description")}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div
          className="rounded-lg border border-border/60 bg-muted/10 p-3"
          aria-labelledby="vacancy-resultados-stages-heading"
        >
          <h3
            id="vacancy-resultados-stages-heading"
            className="mb-1 font-sans text-xs font-semibold text-foreground"
          >
            {t("byStageHeading")}
          </h3>
          <p className="mb-2 font-sans text-[11px] text-muted-foreground">
            {t("byStageDescription")}
          </p>
          <div className="h-[220px] w-full min-h-[200px] sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byStage}
                margin={{ top: 4, right: 4, left: 0, bottom: 40 }}
                barCategoryGap="16%"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="stageName"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground, #6B7280)" }}
                  interval={0}
                  angle={-22}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground, #6B7280)" }}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: "rgba(110, 51, 133, 0.06)" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #E5E7EB",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [
                    typeof value === "number" ? value : Number(value) || 0,
                    t("tooltipApplicants"),
                  ]}
                  labelFormatter={(label) => String(label)}
                />
                <Bar
                  dataKey="count"
                  name={t("tooltipApplicants")}
                  fill={COLOR_STAGE}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="rounded-lg border border-border/60 bg-muted/10 p-3"
          aria-labelledby="vacancy-resultados-scores-heading"
        >
          <h3
            id="vacancy-resultados-scores-heading"
            className="mb-1 font-sans text-xs font-semibold text-foreground"
          >
            {t("scoreDistributionHeading")}
          </h3>
          <p className="mb-2 font-sans text-[11px] text-muted-foreground">
            {t("scoreDistributionDescription", {
              scored: scoreSummary.count,
              total: totalApplicants,
            })}
          </p>
          {scoreSummary.count === 0 ? (
            <p className="py-8 text-center font-sans text-xs text-muted-foreground" role="status">
              {t("noScoresYet")}
            </p>
          ) : (
            <div className="h-[220px] w-full min-h-[200px] sm:h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={scoreBuckets}
                  margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
                  barCategoryGap="12%"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground, #6B7280)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground, #6B7280)" }}
                    width={28}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(73, 111, 179, 0.08)" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [
                      typeof value === "number" ? value : Number(value) || 0,
                      t("tooltipApplicants"),
                    ]}
                    labelFormatter={(label) => t("tooltipRangeSuffix", { label })}
                  />
                  <Bar
                    dataKey="count"
                    name={t("tooltipApplicants")}
                    fill={COLOR_SCORE}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {componentAvgRows.length > 0 ? (
        <div
          className="mt-4 rounded-lg border border-border/60 bg-muted/10 p-3"
          aria-labelledby="vacancy-resultados-components-heading"
        >
          <h3
            id="vacancy-resultados-components-heading"
            className="mb-1 font-sans text-xs font-semibold text-foreground"
          >
            {t("componentAveragesHeading")}
          </h3>
          <p className="mb-2 font-sans text-[11px] text-muted-foreground">
            {t("componentAveragesDescription", {
              samples: componentAverages.samplesWithAnyComponent,
            })}
          </p>
          <div className="h-[200px] w-full min-h-[180px] sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={componentAvgRows}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                barCategoryGap="16%"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground, #6B7280)" }}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={148}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground, #6B7280)" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(13, 148, 136, 0.08)" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #E5E7EB",
                    fontSize: "12px",
                  }}
                  formatter={(value) => {
                    const n = typeof value === "number" ? value : Number(value)
                    return [`${Number.isFinite(n) ? n.toFixed(1) : "—"} %`, t("tooltipAverage")]
                  }}
                />
                <Bar dataKey="pct" name={t("tooltipAverage")} fill={COLOR_COMPONENT} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </section>
  )
}
