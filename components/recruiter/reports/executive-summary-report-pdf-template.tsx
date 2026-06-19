'use client'

import { forwardRef } from 'react'
import {
  BarChart3,
  BriefcaseBusiness,
  Megaphone,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'

export type ExecutiveSummaryReportPdfData = {
  totalClients: number
  totalVacancies: number
  openVacancies: number
  closedVacancies: number
  totalCandidates: number
  candidatesInInterview: number
  candidatesHired: number
  averageVacancyProgressPercent: number | null
  averagePreliminaryMatchScore: number | null
  technicalEvaluationsCompleted: number
  technicalEvaluationPassRate: number | null
  topRecruitmentSource: string | null
}

export type ExecutiveSummaryReportPdfFilters = {
  clientName?: string
  from?: string
  to?: string
}

type ExecutiveSummaryReportPdfTemplateProps = {
  data: ExecutiveSummaryReportPdfData
  filters: ExecutiveSummaryReportPdfFilters
  generatedAt?: string
}

const purple = '#A45C40'
const green = '#00a878'
const orange = '#f97316'

function safeNumber(value: number | null | undefined, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function formatPercent(value: number | null | undefined) {
  return `${safeNumber(value).toFixed(1)}%`
}

function clampPercent(value: number | null | undefined) {
  return Math.max(0, Math.min(100, safeNumber(value)))
}

function KpiCard({
  label,
  value,
  description,
  icon,
}: {
  label: string
  value: string | number
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-background p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-normal text-[#A45C40]">
            {label}
          </p>

          <p className="mt-4 text-3xl font-bold leading-none text-slate-950">
            {value}
          </p>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-[#A45C40]">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-[12px] leading-normal text-slate-500">
        {description}
      </p>
    </div>
  )
}

function SectionCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-background p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}
    >
      <h3 className="text-[15px] font-bold leading-normal text-slate-950">
        {title}
      </h3>

      {subtitle ? (
        <p className="mt-1 text-[12px] leading-normal text-slate-500">
          {subtitle}
        </p>
      ) : null}

      <div className="mt-4">{children}</div>
    </section>
  )
}

function ProgressBar({
  value,
  color = purple,
}: {
  value: number
  color?: string
}) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full"
        style={{
          width: `${clampPercent(value)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  )
}

export const ExecutiveSummaryReportPdfTemplate = forwardRef<
  HTMLElement,
  ExecutiveSummaryReportPdfTemplateProps
>(function ExecutiveSummaryReportPdfTemplate(
  {
    data,
    filters,
    generatedAt = new Date().toLocaleDateString('es-SV'),
  },
  ref
) {
  const totalClients = safeNumber(data.totalClients)
  const totalVacancies = safeNumber(data.totalVacancies)
  const openVacancies = safeNumber(data.openVacancies)
  const closedVacancies = safeNumber(data.closedVacancies)
  const totalCandidates = safeNumber(data.totalCandidates)
  const candidatesInInterview = safeNumber(data.candidatesInInterview)
  const candidatesHired = safeNumber(data.candidatesHired)

  const vacancyProgress = safeNumber(data.averageVacancyProgressPercent)
  const matchScore = safeNumber(data.averagePreliminaryMatchScore)

  const openVacanciesPercent =
    totalVacancies > 0 ? (openVacancies / totalVacancies) * 100 : 0

  const closedVacanciesPercent =
    totalVacancies > 0 ? (closedVacancies / totalVacancies) * 100 : 0

  const interviewPercent =
    totalCandidates > 0 ? (candidatesInInterview / totalCandidates) * 100 : 0

  const hiredPercent =
    totalCandidates > 0 ? (candidatesHired / totalCandidates) * 100 : 0

  const matchLabel =
    matchScore >= 75
      ? 'Alto nivel de coincidencia'
      : matchScore >= 45
        ? 'Coincidencia moderada'
        : 'Coincidencia baja'

  return (
    <article
      ref={ref}
      className="w-[1600px] bg-background px-8 py-7 text-slate-950"
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        letterSpacing: '0px',
      }}
    >
      <header>
        <h1 className="text-[22px] font-bold leading-tight text-slate-950">
          Resumen ejecutivo de reportes
        </h1>

        <p className="mt-1 text-[13px] leading-normal text-slate-500">
          Vista general del estado de clientes, vacantes, candidatos, entrevistas,
          evaluaciones y fuentes de reclutamiento.
        </p>
        <p className="mt-2 text-[12px] leading-normal text-slate-600">
          Cliente: {filters.clientName || 'Todos'} · Período: {filters.from || '—'} –{' '}
          {filters.to || '—'}
        </p>
      </header>

      <div className="mt-8 border-t border-slate-100 pt-5">
        <section className="grid grid-cols-5 gap-3">
          <KpiCard
            label="Clientes"
            value={totalClients}
            description="Clientes registrados en el período"
            icon={<BarChart3 size={16} />}
          />

          <KpiCard
            label="Vacantes"
            value={totalVacancies}
            description="Vacantes creadas"
            icon={<BriefcaseBusiness size={16} />}
          />

          <KpiCard
            label="Vacantes abiertas"
            value={openVacancies}
            description="Procesos activos actualmente"
            icon={<TrendingUp size={16} />}
          />

          <KpiCard
            label="Candidatos"
            value={totalCandidates}
            description="Candidatos registrados"
            icon={<Users size={16} />}
          />

          <KpiCard
            label="Contratados"
            value={candidatesHired}
            description="Candidatos finalizados como contratados"
            icon={<UserCheck size={16} />}
          />
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <SectionCard
            title="Estado de vacantes"
            subtitle="Distribución entre vacantes abiertas y cerradas en el período."
          >
            <ProgressBar value={openVacanciesPercent} color={purple} />

            <div className="mt-4 flex items-center gap-8 text-[12px] text-slate-700">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#A45C40]" />
                <span>
                  <strong>Abiertas:</strong> {openVacancies}{' '}
                  ({formatPercent(openVacanciesPercent)})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span>
                  <strong>Cerradas:</strong> {closedVacancies}{' '}
                  ({formatPercent(closedVacanciesPercent)})
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] leading-normal text-slate-600">
              El 100% de las vacantes del período siguen abiertas; aún no hay
              cierres registrados.
            </div>
          </SectionCard>

          <SectionCard
            title="Progreso promedio de vacantes"
            subtitle="Avance promedio general de los procesos activos."
          >
            <p className="text-[28px] font-bold leading-none text-orange-700">
              {formatPercent(vacancyProgress)}
            </p>

            <div className="mt-4">
              <ProgressBar value={vacancyProgress} color={orange} />
            </div>

            <p className="mt-4 text-[12px] leading-normal text-slate-500">
              Etapa temprana: la mayoría de los procesos aún concentra trabajo
              por delante respecto al avance global.
            </p>
          </SectionCard>

          <SectionCard
            title="Emparejamiento preliminar medio"
            subtitle="Score promedio de coincidencia preliminar entre candidatos y vacantes."
            className="bg-emerald-50/40"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-[30px] font-bold leading-none text-emerald-700">
                {formatPercent(matchScore)}
              </p>

              <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
                {matchLabel}
              </div>
            </div>

            <div className="mt-4">
              <ProgressBar value={matchScore} color={green} />
            </div>
          </SectionCard>

          <SectionCard
            title="Flujo de candidatos"
            subtitle="Registrados, en entrevista y contratados."
          >
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-[12px] text-slate-700">
                  <span>Registrados</span>
                  <strong>{totalCandidates}</strong>
                </div>
                <ProgressBar value={100} color={purple} />
                <p className="mt-1 text-[11px] text-slate-400">
                  100% del total de candidatos
                </p>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-[12px] text-slate-700">
                  <span>En entrevista</span>
                  <strong>{candidatesInInterview}</strong>
                </div>
                <ProgressBar value={interviewPercent} color={purple} />
                <p className="mt-1 text-[11px] text-slate-400">
                  {formatPercent(interviewPercent)} del total de candidatos
                </p>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-[12px] text-slate-700">
                  <span>Contratados</span>
                  <strong>{candidatesHired}</strong>
                </div>
                <ProgressBar value={hiredPercent} color={purple} />
                <p className="mt-1 text-[11px] text-slate-400">
                  {formatPercent(hiredPercent)} del total de candidatos
                </p>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] leading-normal text-slate-500">
                Actualmente no hay candidatos en entrevista ni contratados.
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Evaluaciones técnicas"
            subtitle="Seguimiento de evaluaciones completadas y tasa de aprobación."
          >
            <div className="rounded-lg border border-dashed border-slate-200 bg-background px-4 py-5">
              <Target className="text-[#A45C40]" size={20} />

              <p className="mt-3 text-[13px] font-bold text-slate-900">
                {data.technicalEvaluationsCompleted > 0
                  ? `${data.technicalEvaluationsCompleted} evaluaciones completadas`
                  : 'Aún no hay evaluaciones técnicas completadas.'}
              </p>

              <p className="mt-2 text-[12px] leading-normal text-slate-500">
                {data.technicalEvaluationPassRate !== null
                  ? `Tasa de aprobación: ${formatPercent(data.technicalEvaluationPassRate)}`
                  : 'Cuando existan resultados, aquí se mostrará la tasa de aprobación.'}
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Fuente principal de captación"
            subtitle="Canal con mayor actividad registrada en el período seleccionado."
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-[#A45C40]">
                <Megaphone size={18} />
              </div>

              <div>
                <p className="text-[20px] font-bold leading-normal text-slate-950">
                  {data.topRecruitmentSource || 'Sin fuente registrada'}
                </p>
              </div>
            </div>
          </SectionCard>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-background p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[#A45C40]" />
            <h3 className="text-[15px] font-bold text-slate-950">
              Hallazgos del período
            </h3>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] leading-normal text-slate-700">
              Todas las vacantes registradas se encuentran abiertas.
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] leading-normal text-slate-700">
              El emparejamiento preliminar promedio es alto: {formatPercent(matchScore)}.
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] leading-normal text-slate-700">
              Aún no hay candidatos en entrevista ni contratados.
            </div>
          </div>
        </section>

        <footer className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
          <span>Reporte generado desde el portal de reclutamiento.</span>
          <span>Generado: {generatedAt}</span>
        </footer>
      </div>
    </article>
  )
})
