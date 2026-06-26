"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import type { LucideIcon } from "lucide-react"
import {
  AlertCircle,
  Briefcase,
  Building2,
  ClipboardCheck,
  Megaphone,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react"
import type { ReportsRecruiterSummary } from "@/lib/api/recruiter-reports"

interface ReporteResumenDashboardProps {
  summary: ReportsRecruiterSummary
}

function formatInt(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "0"
  return String(Math.round(n))
}

function formatPercentOneDecimal(n: number | undefined | null): string {
  if (n == null || Number.isNaN(Number(n))) return "—"
  return `${Number(n).toFixed(1)}%`
}

function pickNumber(
  s: ReportsRecruiterSummary,
  ...keys: (keyof ReportsRecruiterSummary)[]
): number {
  for (const k of keys) {
    const v = s[k]
    if (typeof v === "number" && !Number.isNaN(v)) return v
  }
  return 0
}

function pickTopSource(s: ReportsRecruiterSummary): string | null {
  const a = s.topRecruitmentSource
  const b = s.mainRecruitmentSource
  const c = s.mainSourceLabel
  const t = [a, b, c].find((x) => x != null && String(x).trim() !== "")
  return t != null ? String(t).trim() : null
}

function buildInsights(s: ReportsRecruiterSummary): string[] {
  const totalVac = pickNumber(s, "totalVacancies")
  const openVac = pickNumber(s, "openVacancies")
  const closedVac = pickNumber(s, "closedVacancies")
  const match = s.averagePreliminaryMatchScore
  const inInt = pickNumber(s, "candidatesInInterview")
  const hired = pickNumber(s, "candidatesHired", "hiredCount", "totalHires")
  const totalCand = pickNumber(s, "totalCandidates")
  const totalClients = pickNumber(s, "totalClients")
  const items: string[] = []

  if (totalVac > 0 && openVac === totalVac) {
    items.push("Todas las vacantes registradas se encuentran abiertas.")
  }

  if (match != null && !Number.isNaN(match) && match >= 75) {
    items.push(
      `El emparejamiento preliminar promedio es alto: ${formatPercentOneDecimal(match).replace("—", "")}.`
    )
  }

  if (inInt === 0 && hired === 0) {
    items.push(
      totalCand > 0
        ? "Aún no hay candidatos en entrevista ni contratados."
        : "No hay candidatos registrados en el periodo seleccionado."
    )
  }

  if (items.length < 3 && totalVac > 0 && closedVac === totalVac && openVac === 0) {
    items.push("Todas las vacantes del periodo están cerradas.")
  }

  if (
    items.length < 3 &&
    totalVac > 0 &&
    s.averageVacancyProgressPercent != null &&
    !Number.isNaN(s.averageVacancyProgressPercent) &&
    s.averageVacancyProgressPercent < 35
  ) {
    items.push(
      "El avance promedio de las vacantes es bajo; conviene revisar embudos y seguimiento."
    )
  }

  const techDone = pickNumber(
    s,
    "technicalEvaluationsCompleted",
    "technicalEvaluationsCount"
  )
  if (items.length < 3 && techDone > 0) {
    const rate = s.technicalEvaluationPassRate ?? s.technicalEvaluationApprovalRate
    if (typeof rate === "number" && !Number.isNaN(rate)) {
      items.push(
        `Hay ${formatInt(techDone)} evaluación(es) técnica(s) completada(s); tasa de aprobación aproximada ${formatPercentOneDecimal(rate)}.`
      )
    } else {
      items.push(
        `Hay ${formatInt(techDone)} evaluación(es) técnica(s) completada(s) en el periodo.`
      )
    }
  }

  if (items.length < 3 && totalVac > 0 && closedVac > 0 && openVac < totalVac) {
    items.push(
      `${formatInt(closedVac)} vacante(s) cerrada(s) y ${formatInt(openVac)} abierta(s) en el periodo.`
    )
  }

  const filler: string[] = []
  if (totalVac > 0) {
    filler.push(`Se registraron ${formatInt(totalVac)} vacante(s) en el periodo.`)
  }
  if (totalCand > 0) {
    filler.push(`Hay ${formatInt(totalCand)} candidato(s) considerados en el periodo.`)
  }
  if (totalClients > 0) {
    filler.push(`${formatInt(totalClients)} cliente(s) con actividad en los filtros actuales.`)
  }
  for (const line of filler) {
    if (items.length >= 3) break
    if (!items.includes(line)) items.push(line)
  }

  const tail = [
    "Ajusta el rango de fechas o el cliente para contrastar periodos.",
    "Los indicadores se recalculan al aplicar filtros.",
    "Explora los reportes detallados para profundizar en vacantes y candidatos.",
  ]
  for (const line of tail) {
    if (items.length >= 3) break
    if (!items.includes(line)) items.push(line)
  }

  return items.slice(0, 3)
}

function ExecutiveKpiCard({
  icon: Icon,
  title,
  value,
  subtitle,
}: {
  icon: LucideIcon
  title: string
  value: string
  subtitle: string
}) {
  return (
    <article
      className="group flex flex-col rounded-xl border border-vo-purple/15 bg-card p-5 shadow-sm transition-all hover:border-vo-purple/30 hover:shadow-md"
      aria-label={title}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-vo-purple">
          {title}
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-vo-purple/10 text-vo-purple transition-colors group-hover:bg-vo-purple/15">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <p className="font-sans text-3xl font-bold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-2 font-sans text-xs leading-relaxed text-muted-foreground">
        {subtitle}
      </p>
    </article>
  )
}

function SectionCard({
  title,
  description,
  headingId,
  children,
  className = "",
}: {
  title: string
  description?: string
  headingId: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6 ${className}`}
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="font-sans text-base font-semibold text-foreground"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-1 font-sans text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4 min-h-0 flex-1">{children}</div>
    </section>
  )
}

function StackedVacancyBar({
  open,
  closed,
  total,
}: {
  open: number
  closed: number
  total: number
}) {
  if (total <= 0) {
    return (
      <p className="font-sans text-sm text-muted-foreground">
        No hay vacantes registradas en el periodo seleccionado.
      </p>
    )
  }

  if (open === 0 && closed === 0) {
    return (
      <p className="font-sans text-sm text-muted-foreground">
        Hay {formatInt(total)} vacante(s) en el periodo, pero el desglose abierto/cerrado no está
        disponible.
      </p>
    )
  }

  const openPct = (open / total) * 100
  const closedPct = (closed / total) * 100
  const openLabel = `${openPct.toFixed(1)}%`
  const closedLabel = `${closedPct.toFixed(1)}%`

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex h-4 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Vacantes abiertas ${open} de ${total}, cerradas ${closed}`}
      >
        {open > 0 ? (
          <div
            className="h-full bg-vo-purple transition-all"
            style={{ width: `${openPct}%` }}
          />
        ) : null}
        {closed > 0 ? (
          <div
            className="h-full bg-slate-500"
            style={{ width: `${closedPct}%` }}
          />
        ) : null}
      </div>
      <ul className="flex flex-col gap-2 font-sans text-sm sm:flex-row sm:flex-wrap sm:gap-6">
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-vo-purple" aria-hidden />
          <span className="text-foreground">
            Abiertas: <strong className="tabular-nums">{formatInt(open)}</strong>
            <span className="text-muted-foreground"> ({openLabel})</span>
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-500"
            aria-hidden
          />
          <span className="text-foreground">
            Cerradas: <strong className="tabular-nums">{formatInt(closed)}</strong>
            <span className="text-muted-foreground"> ({closedLabel})</span>
          </span>
        </li>
      </ul>
      {closed === 0 && open > 0 ? (
        <p className="rounded-lg border border-vo-purple/20 bg-vo-purple/5 px-3 py-2 font-sans text-xs text-foreground">
          El 100% de las vacantes del periodo siguen abiertas; aún no hay cierres
          registrados.
        </p>
      ) : null}
      {open === 0 && closed > 0 ? (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 font-sans text-xs text-foreground">
          Todas las vacantes del periodo figuran como cerradas.
        </p>
      ) : null}
    </div>
  )
}

function HorizontalGauge({
  value,
  max,
  barClassName,
  trackClassName = "bg-muted",
}: {
  value: number
  max: number
  barClassName: string
  trackClassName?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className={`h-3 w-full overflow-hidden rounded-full ${trackClassName}`}>
      <div
        className={`h-full rounded-full ${barClassName}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function CandidateFlowRow({
  label,
  count,
  total,
  icon: Icon,
  percentLabel,
  emptyPeriodLabel,
}: {
  label: string
  count: number
  total: number
  icon: LucideIcon
  percentLabel: (pct: number) => string
  emptyPeriodLabel: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-sans text-sm text-foreground">
          <Icon className="h-4 w-4 shrink-0 text-vo-purple" aria-hidden />
          {label}
        </span>
        <span className="font-sans text-sm font-semibold tabular-nums text-foreground">
          {formatInt(count)}
        </span>
      </div>
      <HorizontalGauge
        value={count}
        max={Math.max(total, 1)}
        barClassName="bg-vo-purple/70"
      />
      <span className="font-sans text-[11px] text-muted-foreground">
        {total > 0 ? percentLabel(pct) : emptyPeriodLabel}
      </span>
    </div>
  )
}

export function ReporteResumenDashboardSkeleton() {
  const t = useTranslations("RecruiterPortal.reports.summary.dashboard")
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label={t("loading")}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-xl border border-border bg-muted/40"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-xl border border-border bg-muted/40" />
        <div className="h-56 animate-pulse rounded-xl border border-border bg-muted/40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-xl border border-border bg-muted/40" />
        <div className="h-64 animate-pulse rounded-xl border border-border bg-muted/40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-52 animate-pulse rounded-xl border border-border bg-muted/40" />
        <div className="h-52 animate-pulse rounded-xl border border-border bg-muted/40" />
      </div>
      <div className="h-28 animate-pulse rounded-xl border border-border bg-muted/40" />
    </div>
  )
}

export function ReporteResumenEmptyState() {
  const t = useTranslations("RecruiterPortal.reports.summary")
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 px-6 py-14 text-center"
      role="status"
    >
      <Sparkles className="mb-3 h-10 w-10 text-vo-purple/50" aria-hidden />
      <p className="font-sans text-base font-medium text-foreground">
        {t("emptyStates.noData")}
      </p>
      <p className="mt-2 max-w-md font-sans text-sm text-muted-foreground">
        No se recibieron indicadores con los filtros actuales. Prueba ampliando el rango de
        fechas o seleccionando otro cliente.
      </p>
    </div>
  )
}

export function ReporteResumenErrorState({ message }: { message: string }) {
  const t = useTranslations("RecruiterPortal.reports.summary.dashboard")
  return (
    <div
      className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-4"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
      <div>
        <p className="font-sans text-sm font-semibold text-destructive">
          {t("loadFailed")}
        </p>
        <p className="mt-1 font-sans text-sm text-destructive/90">{message}</p>
      </div>
    </div>
  )
}

export function ReporteResumenDashboard({ summary }: ReporteResumenDashboardProps) {
  const t = useTranslations("RecruiterPortal.reports.summary.dashboard")
  const totalClients = pickNumber(summary, "totalClients")
  const totalVacancies = pickNumber(summary, "totalVacancies")
  const openVacancies = pickNumber(summary, "openVacancies")
  const closedVacancies = pickNumber(summary, "closedVacancies")
  const totalCandidates = pickNumber(summary, "totalCandidates")
  const candidatesHired = pickNumber(
    summary,
    "candidatesHired",
    "hiredCount",
    "totalHires"
  )
  const avgProgress = summary.averageVacancyProgressPercent
  const matchScore = summary.averagePreliminaryMatchScore
  const inInterview = pickNumber(summary, "candidatesInInterview")
  const techCompleted = pickNumber(
    summary,
    "technicalEvaluationsCompleted",
    "technicalEvaluationsCount"
  )
  const passRate = summary.technicalEvaluationPassRate ?? summary.technicalEvaluationApprovalRate
  const topSource = pickTopSource(summary)
  const insights = buildInsights(summary)

  const hasScalarPayload = Object.keys(summary).some((k) => {
    const v = summary[k]
    if (v == null || v === "") return false
    if (typeof v === "object") return false
    return true
  })

  if (!hasScalarPayload) {
    return <ReporteResumenEmptyState />
  }

  const progressValue =
    avgProgress != null && !Number.isNaN(avgProgress) ? Number(avgProgress) : null
  const matchValue =
    matchScore != null && !Number.isNaN(matchScore) ? Number(matchScore) : null

  return (
    <div className="flex flex-col gap-6">
      <div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        aria-label={t("kpisAria")}
      >
        <ExecutiveKpiCard
          icon={Building2}
          title={t("clients")}
          value={formatInt(totalClients)}
          subtitle={t("clientsRegistered")}
        />
        <ExecutiveKpiCard
          icon={Briefcase}
          title={t("vacancies")}
          value={formatInt(totalVacancies)}
          subtitle={t("vacanciesCreated")}
        />
        <ExecutiveKpiCard
          icon={TrendingUp}
          title={t("openVacancies")}
          value={formatInt(openVacancies)}
          subtitle={t("activeProcessesSubtitle")}
        />
        <ExecutiveKpiCard
          icon={Users}
          title={t("candidates")}
          value={formatInt(totalCandidates)}
          subtitle={t("candidatesRegistered")}
        />
        <ExecutiveKpiCard
          icon={UserCheck}
          title={t("hired")}
          value={formatInt(candidatesHired)}
          subtitle={t("candidatesHired")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          headingId="resumen-estado-vacantes"
          title={t("vacancyStatus")}
          description={t("vacanciesDistribution")}
        >
          <StackedVacancyBar
            open={openVacancies}
            closed={closedVacancies}
            total={totalVacancies}
          />
        </SectionCard>

        <SectionCard
          headingId="resumen-progreso-vacantes"
          title={t("avgProgress")}
          description="Avance promedio general de los procesos activos."
        >
          {progressValue != null ? (
            <div className="flex flex-col gap-4">
              <p
                className={`font-sans text-4xl font-bold tabular-nums tracking-tight ${
                  progressValue < 40
                    ? "text-amber-800"
                    : progressValue < 70
                      ? "text-vo-purple"
                      : "text-emerald-800"
                }`}
              >
                {formatPercentOneDecimal(progressValue)}
              </p>
              <HorizontalGauge
                value={progressValue}
                max={100}
                barClassName={
                  progressValue < 40
                    ? "bg-gradient-to-r from-amber-400 to-amber-600"
                    : progressValue < 70
                      ? "bg-gradient-to-r from-vo-purple/80 to-vo-purple"
                      : "bg-gradient-to-r from-emerald-500 to-emerald-600"
                }
              />
              <p className="font-sans text-xs leading-relaxed text-muted-foreground">
                {progressValue < 40
                  ? "Etapa temprana: la mayoría de los procesos aún concentra trabajo por delante respecto al avance global."
                  : progressValue < 70
                    ? "Avance intermedio: hay recorrido pendiente para completar etapas clave de los procesos."
                    : "Buen avance consolidado en el conjunto de vacantes del periodo."}
              </p>
            </div>
          ) : (
            <p className="font-sans text-sm text-muted-foreground">
              Sin datos suficientes para calcular el progreso promedio.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          headingId="resumen-match"
          title={t("avgMatch")}
          description="Score promedio de coincidencia preliminar entre candidatos y vacantes."
          className={
            matchValue != null && matchValue >= 75
              ? "border-emerald-500/25 bg-linear-to-br from-emerald-500/5 via-card to-card"
              : ""
          }
        >
          {matchValue != null ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p
                  className={`font-sans text-4xl font-bold tabular-nums tracking-tight ${
                    matchValue >= 75
                      ? "text-emerald-800"
                      : "text-foreground"
                  }`}
                >
                  {formatPercentOneDecimal(matchValue)}
                </p>
                {matchValue >= 75 ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-sans text-xs font-medium text-emerald-900">
                    Alto nivel de coincidencia
                  </span>
                ) : matchValue >= 50 ? (
                  <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-1 font-sans text-xs font-medium text-muted-foreground">
                    Coincidencia moderada
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-sans text-xs font-medium text-amber-950">
                    Coincidencia baja
                  </span>
                )}
              </div>
              <HorizontalGauge
                value={matchValue}
                max={100}
                barClassName={
                  matchValue >= 75
                    ? "bg-emerald-500"
                    : matchValue >= 50
                      ? "bg-vo-purple/70"
                      : "bg-amber-500"
                }
                trackClassName={
                  matchValue >= 75 ? "bg-emerald-500/15" : "bg-muted"
                }
              />
            </div>
          ) : (
            <p className="font-sans text-sm text-muted-foreground">
              Sin datos suficientes para el match preliminar.
            </p>
          )}
        </SectionCard>

        <SectionCard
          headingId="resumen-flujo-candidatos"
          title={t("candidateFlow")}
          description="Registrados, en entrevista y contratados."
        >
          <div className="flex flex-col gap-3">
            <CandidateFlowRow
              label={t("registered")}
              count={totalCandidates}
              total={totalCandidates}
              icon={Users}
              percentLabel={(pct) => `${pct}${t("percentOfTotal")}`}
              emptyPeriodLabel={t("noCandidatesInPeriod")}
            />
            <CandidateFlowRow
              label={t("inInterview")}
              count={inInterview}
              total={totalCandidates}
              icon={ClipboardCheck}
              percentLabel={(pct) => `${pct}${t("percentOfTotal")}`}
              emptyPeriodLabel={t("noCandidatesInPeriod")}
            />
            <CandidateFlowRow
              label={t("hired")}
              count={candidatesHired}
              total={totalCandidates}
              icon={UserCheck}
              percentLabel={(pct) => `${pct}${t("percentOfTotal")}`}
              emptyPeriodLabel={t("noCandidatesInPeriod")}
            />
            {inInterview === 0 && candidatesHired === 0 ? (
              <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 font-sans text-xs text-muted-foreground">
                Actualmente no hay candidatos en entrevista ni contratados.
              </p>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          headingId="resumen-evaluaciones"
          title={t("technicalEvaluations")}
          description="Seguimiento de evaluaciones completadas y tasa de aprobación."
        >
          {techCompleted > 0 ? (
            <div className="flex flex-col gap-3">
              <p className="font-sans text-sm text-foreground">
                Completadas:{" "}
                <strong className="tabular-nums">{formatInt(techCompleted)}</strong>
              </p>
              {typeof passRate === "number" && !Number.isNaN(passRate) ? (
                <p className="font-sans text-sm text-foreground">
                  Tasa de aprobación:{" "}
                  <strong className="tabular-nums">
                    {formatPercentOneDecimal(passRate)}
                  </strong>
                </p>
              ) : (
                <p className="font-sans text-sm text-muted-foreground">
                  Sin datos suficientes para la tasa de aprobación.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6">
              <Target className="h-8 w-8 text-vo-purple/60" aria-hidden />
              <p className="font-sans text-sm font-medium text-foreground">
                Aún no hay evaluaciones técnicas completadas.
              </p>
              <p className="font-sans text-xs leading-relaxed text-muted-foreground">
                Cuando existan resultados, aquí se mostrará la tasa de aprobación.
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          headingId="resumen-fuente"
          title={t("mainSource")}
          description="Canal con mayor actividad registrada en el periodo seleccionado."
        >
          <div className="flex flex-col gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-vo-purple/10 text-vo-purple">
              <Megaphone className="h-6 w-6" aria-hidden />
            </div>
            {topSource ? (
              <p className="font-sans text-xl font-semibold leading-snug text-foreground">
                {topSource}
              </p>
            ) : (
              <p className="font-sans text-sm text-muted-foreground">
                {t("insufficientData")}
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <section
        className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
        aria-labelledby="resumen-insights"
      >
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-vo-purple" aria-hidden />
          <h2 id="resumen-insights" className="font-sans text-base font-semibold text-foreground">
            {t("periodFindings")}
          </h2>
        </div>
        <ul className="grid gap-3 md:grid-cols-3" role="list">
          {insights.map((text, idx) => (
            <li
              key={idx}
              className="rounded-lg border border-vo-purple/15 bg-vo-purple/4 px-4 py-3 font-sans text-sm leading-relaxed text-foreground"
            >
              {text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
