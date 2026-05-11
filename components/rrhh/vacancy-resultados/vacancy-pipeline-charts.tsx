"use client"

import type {
  ApplicantsByStageSection,
  ScoreBucketRow,
  ScoreSummary,
  StageCountRow,
} from "@/lib/rrhh/vacancy-pipeline-stats"
import { VacancyResultadosByStageTables } from "@/components/rrhh/vacancy-resultados/vacancy-resultados-by-stage-tables"
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

export interface VacancyPipelineChartsProps {
  applicantsByStage: ApplicantsByStageSection[]
  byStage: StageCountRow[]
  scoreBuckets: ScoreBucketRow[]
  scoreSummary: ScoreSummary
  totalApplicants: number
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(1)} %`
}

export function VacancyPipelineCharts({
  applicantsByStage,
  byStage,
  scoreBuckets,
  scoreSummary,
  totalApplicants,
}: VacancyPipelineChartsProps) {
  if (totalApplicants === 0) {
    return (
      <p
        className="rounded-lg border border-border bg-muted/40 px-4 py-8 text-center font-sans text-sm text-muted-foreground"
        role="status"
      >
        No hay postulantes en esta vacante todavía. Cuando haya candidatos en el tablero,
        aquí verás la distribución por etapa y puntaje.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <section
        className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6"
        aria-labelledby="vacancy-resultados-kpis-heading"
      >
        <h2
          id="vacancy-resultados-kpis-heading"
          className="mb-4 font-sans text-base font-semibold text-foreground"
        >
          Resumen
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <dt className="font-sans text-xs text-muted-foreground">Postulantes</dt>
            <dd className="font-sans text-2xl font-semibold tabular-nums text-foreground">
              {totalApplicants}
            </dd>
          </div>
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <dt className="font-sans text-xs text-muted-foreground">
              Con puntaje (mismo criterio que el tablero)
            </dt>
            <dd className="font-sans text-2xl font-semibold tabular-nums text-foreground">
              {scoreSummary.count}
            </dd>
          </div>
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <dt className="font-sans text-xs text-muted-foreground">Puntaje medio</dt>
            <dd className="font-sans text-2xl font-semibold tabular-nums text-foreground">
              {formatPercent(scoreSummary.meanPercent)}
            </dd>
          </div>
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <dt className="font-sans text-xs text-muted-foreground">Rango (min – max)</dt>
            <dd className="font-sans text-lg font-semibold tabular-nums text-foreground">
              {scoreSummary.minPercent != null && scoreSummary.maxPercent != null
                ? `${scoreSummary.minPercent.toFixed(0)} – ${scoreSummary.maxPercent.toFixed(0)} %`
                : "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-3 font-sans text-xs text-muted-foreground">
          El puntaje usa <span className="font-medium text-foreground">similitud semántica</span> o{" "}
          <span className="font-medium text-foreground">puntaje total</span> del postulante, igual
          que en las tarjetas del Kanban.
        </p>
      </section>

      <section
        className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6"
        aria-labelledby="vacancy-resultados-stages-heading"
      >
        <h2
          id="vacancy-resultados-stages-heading"
          className="mb-1 font-sans text-base font-semibold text-foreground"
        >
          Postulantes por etapa
        </h2>
        <p className="mb-4 font-sans text-sm text-muted-foreground">
          Conteo según la etapa actual de cada postulación.
        </p>
        <div className="h-[min(360px,50vh)] w-full min-h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={byStage}
              margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
              barCategoryGap="18%"
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="stageName"
                tick={{ fontSize: 11, fill: "var(--muted-foreground, #6B7280)" }}
                interval={0}
                angle={-28}
                textAnchor="end"
                height={56}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground, #6B7280)" }}
                width={36}
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
                  "Postulantes",
                ]}
                labelFormatter={(label) => String(label)}
              />
              <Bar dataKey="count" name="Postulantes" fill={COLOR_STAGE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <VacancyResultadosByStageTables applicantsByStage={applicantsByStage} />

      <section
        className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6"
        aria-labelledby="vacancy-resultados-scores-heading"
      >
        <h2
          id="vacancy-resultados-scores-heading"
          className="mb-1 font-sans text-base font-semibold text-foreground"
        >
          Distribución de puntaje (%)
        </h2>
        <p className="mb-4 font-sans text-sm text-muted-foreground">
          Solo se incluyen postulantes con puntaje numérico ({scoreSummary.count} de{" "}
          {totalApplicants}).
        </p>
        {scoreSummary.count === 0 ? (
          <p className="font-sans text-sm text-muted-foreground" role="status">
            Ningún postulante tiene puntaje en el formato esperado; el histograma aparecerá cuando
            el API envíe <code className="rounded bg-muted px-1">semanticScore</code> o{" "}
            <code className="rounded bg-muted px-1">totalScore</code>.
          </p>
        ) : (
          <div className="h-[min(320px,45vh)] w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={scoreBuckets}
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                barCategoryGap="12%"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground, #6B7280)" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground, #6B7280)" }}
                  width={36}
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
                    "Postulantes",
                  ]}
                  labelFormatter={(label) => `Rango ${label} %`}
                />
                <Bar dataKey="count" name="Postulantes" fill={COLOR_SCORE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
