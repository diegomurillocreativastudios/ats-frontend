"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Calendar, FileText, Search, User } from "lucide-react"
import Modal from "@/components/ui/Modal"
import type { Interview } from "@/lib/api/interviews"
import type {
  ApplicantsByStageFullSection,
  CompanyStatusOption,
  VacancyApplicantLike,
} from "@/lib/rrhh/vacancy-pipeline-stats"
import {
  extractApplicantComponentScores01,
  getApplicantPrimaryScore01,
  pickApplicantDisplayName,
  resolveApplicationStatusLabel,
} from "@/lib/rrhh/vacancy-pipeline-stats"
import {
  mergeApplicantsWithInterviews,
  interviewPrepRowsFromVacancyApplicants,
  type InterviewPrepRow,
} from "@/lib/recruiter/vacancy-applicant-interview-prep"

export interface VacancyResultadosCandidateFiltersState {
  search: string
  statusId: string
  scoreTier: string
}

export interface VacancyResultadosCandidateFiltersBarProps {
  companyStatuses: CompanyStatusOption[]
  filterState: VacancyResultadosCandidateFiltersState
  onFilterChange: (next: VacancyResultadosCandidateFiltersState) => void
}

export function VacancyResultadosCandidateFiltersBar({
  companyStatuses,
  filterState,
  onFilterChange,
}: VacancyResultadosCandidateFiltersBarProps) {
  const handleClearFilters = useCallback(() => {
    onFilterChange({ search: "", statusId: "all", scoreTier: "all" })
  }, [onFilterChange])

  const handleFilterField = useCallback(
    (patch: Partial<VacancyResultadosCandidateFiltersState>) => {
      onFilterChange({ ...filterState, ...patch })
    },
    [filterState, onFilterChange]
  )

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
      aria-labelledby="vacancy-resultados-filters-heading"
    >
      <h2
        id="vacancy-resultados-filters-heading"
        className="font-sans text-sm font-semibold text-foreground"
      >
        Filtros de postulantes
      </h2>
      <p className="mt-1 font-sans text-xs text-muted-foreground">
        Aplican al listado principal debajo de las gráficas.
      </p>
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="vacancy-candidates-search" className="sr-only">
            Buscar por nombre o correo
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="vacancy-candidates-search"
              type="search"
              value={filterState.search}
              onChange={(e) => handleFilterField({ search: e.target.value })}
              placeholder="Buscar por nombre o correo…"
              className="w-full rounded-md border border-input bg-background py-2.5 pl-10 pr-3 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple"
            />
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto">
          <div className="flex min-w-[160px] flex-1 flex-col gap-1">
            <label
              htmlFor="vacancy-candidates-status"
              className="font-sans text-xs text-muted-foreground"
            >
              Estado de postulación
            </label>
            <select
              id="vacancy-candidates-status"
              value={filterState.statusId}
              onChange={(e) => handleFilterField({ statusId: e.target.value })}
              className="rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple"
            >
              <option value="all">Todos</option>
              {companyStatuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-[160px] flex-1 flex-col gap-1">
            <label
              htmlFor="vacancy-candidates-score"
              className="font-sans text-xs text-muted-foreground"
            >
              Puntaje
            </label>
            <select
              id="vacancy-candidates-score"
              value={filterState.scoreTier}
              onChange={(e) => handleFilterField({ scoreTier: e.target.value })}
              className="rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple"
            >
              <option value="all">Todos</option>
              <option value="scored">Con puntaje</option>
              <option value="unscored">Sin puntaje</option>
              <option value="p0_40">0% – 40%</option>
              <option value="p40_60">40% – 60%</option>
              <option value="p60_80">60% – 80%</option>
              <option value="p80_100">80% – 100%</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleClearFilters}
            className="h-10 shrink-0 rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </section>
  )
}

export interface VacancyResultadosCandidatesBlockProps {
  vacancyId: string
  applicantsByStageFull: ApplicantsByStageFullSection[]
  companyStatuses: CompanyStatusOption[]
  allApplicants: VacancyApplicantLike[]
  interviews: Interview[]
  filterState: VacancyResultadosCandidateFiltersState
  onFilterChange: (next: VacancyResultadosCandidateFiltersState) => void
  onScheduleInterview: (candidateProfileId: string) => void
  onOpenTechnicalSheet: (candidateProfileId: string, displayName: string) => void
}

function formatScorePercent(score01: number | null): string {
  if (score01 == null || !Number.isFinite(score01)) return "—"
  return `${Math.round(score01 * 100)} %`
}

function MiniBar({
  label,
  value01,
  barClass,
}: {
  label: string
  value01: number | null
  barClass: string
}) {
  const pct =
    value01 != null && Number.isFinite(value01)
      ? Math.min(100, Math.max(0, Math.round(value01 * 100)))
      : null
  return (
    <div>
      <div className="mb-0.5 flex justify-between gap-2 font-sans text-[10px] text-muted-foreground">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 tabular-nums text-foreground">
          {pct == null ? "—" : `${pct}%`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        {pct != null ? (
          <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
        ) : null}
      </div>
    </div>
  )
}

function getApplicantStatusId(match: VacancyApplicantLike): string | null {
  const raw =
    match.applicationStatusId ??
    match.application_status_id ??
    match.statusId ??
    match.status_id
  if (raw == null) return null
  const s = String(raw).trim()
  return s !== "" ? s : null
}

function applicantMatchesScoreTier(match: VacancyApplicantLike, tier: string): boolean {
  const s01 = getApplicantPrimaryScore01(match)
  if (tier === "all") return true
  if (tier === "scored") return s01 != null
  if (tier === "unscored") return s01 == null
  if (s01 == null) return false
  const p = s01 * 100
  if (tier === "p0_40") return p >= 0 && p < 40
  if (tier === "p40_60") return p >= 40 && p < 60
  if (tier === "p60_80") return p >= 60 && p < 80
  if (tier === "p80_100") return p >= 80 && p <= 100
  return true
}

function applicantMatchesStatus(
  match: VacancyApplicantLike,
  filterId: string,
  statuses: CompanyStatusOption[],
  stageColumnName: string
): boolean {
  if (filterId === "all") return true
  const sid = getApplicantStatusId(match)
  if (sid && sid === filterId) return true
  const label = resolveApplicationStatusLabel(match, statuses, stageColumnName)
  const opt = statuses.find((s) => s.id === filterId)
  if (opt && label.trim().toLowerCase() === opt.name.trim().toLowerCase()) return true
  return false
}

function applicantMatchesSearch(match: VacancyApplicantLike, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (needle === "") return true
  const name = pickApplicantDisplayName(match, 0).toLowerCase()
  const email = (match.email ?? "").toLowerCase()
  return name.includes(needle) || email.includes(needle)
}

function hasLongText(value: string | null | undefined, max = 110): boolean {
  if (!value) return false
  return value.trim().length > max
}

interface CandidateCardProps {
  match: VacancyApplicantLike
  prep: InterviewPrepRow | undefined
  companyStatuses: CompanyStatusOption[]
  stageColumnName: string
  onScheduleInterview: (candidateProfileId: string) => void
  onOpenTechnicalSheet: (candidateProfileId: string, displayName: string) => void
  onOpenDetail: (match: VacancyApplicantLike, prep: InterviewPrepRow | undefined) => void
}

function VacancyResultadosCandidateCard({
  match,
  prep,
  companyStatuses,
  stageColumnName,
  onScheduleInterview,
  onOpenTechnicalSheet,
  onOpenDetail,
}: CandidateCardProps) {
  const profileId = match.candidateProfileId?.trim()
  const displayName = pickApplicantDisplayName(match, 0)
  const email = match.email?.trim() ?? ""
  const phone = match.phone?.trim() ?? ""
  const total01 = getApplicantPrimaryScore01(match)
  const comps = extractApplicantComponentScores01(match)
  const statusLabel = resolveApplicationStatusLabel(match, companyStatuses, stageColumnName)
  const strengths = prep?.strengths ?? null
  const considerations = prep?.considerations ?? null
  const comments = prep?.relevantComments ?? null
  const interviewLine = prep?.interviewSummaryLabel ?? null

  const pos =
    match.qualitativeReasoningPositive ?? match.qualitative_reasoning_positive ?? strengths
  const neg =
    match.qualitativeReasoningNegative ?? match.qualitative_reasoning_negative ?? considerations

  const showDetailCta =
    hasLongText(pos) ||
    hasLongText(neg) ||
    hasLongText(comments) ||
    hasLongText(interviewLine)

  return (
    <article className="flex min-h-0 flex-col rounded-xl border border-border bg-linear-to-b from-background to-muted/10 p-4 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="wrap-break-word font-sans text-base font-semibold leading-snug text-foreground">
            {displayName}
          </h3>
          {email ? (
            <p className="mt-1 truncate font-sans text-xs text-muted-foreground" title={email}>
              {email}
            </p>
          ) : null}
          {phone ? (
            <p className="mt-0.5 truncate font-sans text-xs text-muted-foreground" title={phone}>
              {phone}
            </p>
          ) : null}
          <p className="mt-2 font-sans text-[11px] text-muted-foreground">
            Etapa:{" "}
            <span className="font-medium text-foreground">
              {stageColumnName}
            </span>
          </p>
          <p className="mt-0.5 font-sans text-[11px] text-muted-foreground">
            Estado:{" "}
            <span className="font-medium text-foreground">{statusLabel}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground">
            Match
          </p>
          <p className="font-sans text-2xl font-bold tabular-nums leading-none text-vo-purple">
            {formatScorePercent(total01)}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <MiniBar label="Cualitativo" value01={comps.qualitative} barClass="bg-emerald-500" />
        <MiniBar label="Similitud vectorial" value01={comps.vector} barClass="bg-[#496FB3]" />
        <MiniBar
          label="Atributos (agregado)"
          value01={comps.attributeAggregate}
          barClass="bg-amber-500"
        />
      </div>

      {(pos || neg) && (
        <div className="mt-3 grid gap-2">
          {pos ? (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-2">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                Fortalezas
              </p>
              <p className="mt-1 line-clamp-3 font-sans text-xs leading-relaxed text-foreground">
                {pos}
              </p>
            </div>
          ) : null}
          {neg ? (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-2">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-wide text-rose-800 dark:text-rose-200">
                Aspectos a considerar
              </p>
              <p className="mt-1 line-clamp-3 font-sans text-xs leading-relaxed text-foreground">
                {neg}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {showDetailCta ? (
        <button
          type="button"
          onClick={() => onOpenDetail(match, prep)}
          className="mt-2 self-start font-sans text-xs font-medium text-vo-purple underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
        >
          Ver más contexto
        </button>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-3">
        {profileId ? (
          <>
            <button
              type="button"
              onClick={() => onScheduleInterview(profileId)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-vo-purple bg-vo-purple px-2.5 py-2 font-sans text-xs font-medium text-white hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 sm:flex-none"
            >
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Agendar entrevista
            </button>
            <button
              type="button"
              onClick={() => onOpenTechnicalSheet(profileId, displayName)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-2 font-sans text-xs font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 sm:flex-none"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Ficha técnica
            </button>
            <Link
              href={`/portal-rrhh/candidatos/${encodeURIComponent(profileId)}`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-2 font-sans text-xs font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 sm:flex-none"
            >
              <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Ver perfil
            </Link>
          </>
        ) : (
          <p className="font-sans text-xs text-muted-foreground">
            Sin perfil vinculado para acciones.
          </p>
        )}
      </div>
    </article>
  )
}

export function VacancyResultadosCandidatesBlock({
  vacancyId,
  applicantsByStageFull,
  companyStatuses,
  allApplicants,
  interviews,
  filterState,
  onFilterChange,
  onScheduleInterview,
  onOpenTechnicalSheet,
}: VacancyResultadosCandidatesBlockProps) {
  const [activeStageIdx, setActiveStageIdx] = useState(0)
  const [detail, setDetail] = useState<{
    match: VacancyApplicantLike
    prep: InterviewPrepRow | undefined
  } | null>(null)

  const prepByProfileId = useMemo(() => {
    const rows = mergeApplicantsWithInterviews(
      interviewPrepRowsFromVacancyApplicants(allApplicants),
      interviews
    )
    return new Map(rows.map((r) => [r.candidateProfileId, r]))
  }, [allApplicants, interviews])

  useEffect(() => {
    if (activeStageIdx >= applicantsByStageFull.length) {
      setActiveStageIdx(0)
    }
  }, [activeStageIdx, applicantsByStageFull.length])

  const activeSection = applicantsByStageFull[activeStageIdx]
  const stageName = activeSection?.stageName ?? ""

  const filteredApplicants = useMemo(() => {
    if (!activeSection) return []
    return activeSection.applicants.filter((match) => {
      if (!applicantMatchesSearch(match, filterState.search)) return false
      if (!applicantMatchesStatus(match, filterState.statusId, companyStatuses, stageName)) {
        return false
      }
      if (!applicantMatchesScoreTier(match, filterState.scoreTier)) return false
      return true
    })
  }, [
    activeSection,
    companyStatuses,
    filterState.search,
    filterState.scoreTier,
    filterState.statusId,
    stageName,
  ])

  const handleClearFilters = useCallback(() => {
    onFilterChange({ search: "", statusId: "all", scoreTier: "all" })
  }, [onFilterChange])

  const detailName = detail ? pickApplicantDisplayName(detail.match, 0) : ""

  return (
    <section
      className="rounded-xl border border-border bg-card shadow-sm"
      aria-labelledby="vacancy-resultados-candidates-heading"
    >
      <div className="border-b border-border px-4 py-5 sm:px-6">
        <h2
          id="vacancy-resultados-candidates-heading"
          className="font-sans text-lg font-semibold text-foreground"
        >
          Postulantes por etapa
        </h2>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Listado principal por etapa del tablero. Los filtros de la sección anterior aplican aquí.
        </p>
      </div>

      <div className="border-b border-border px-2 pt-2 sm:px-4">
        <div
          className="flex gap-1 overflow-x-auto pb-2"
          role="tablist"
          aria-label="Etapas del proceso"
        >
          {applicantsByStageFull.map((sec, idx) => {
            const count = sec.applicants.length
            const selected = idx === activeStageIdx
            return (
              <button
                key={sec.stageName}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveStageIdx(idx)}
                className={`shrink-0 rounded-full border px-3 py-1.5 font-sans text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 ${
                  selected
                    ? "border-vo-purple bg-vo-purple/10 text-vo-purple"
                    : "border-transparent bg-muted/50 text-foreground hover:bg-muted"
                }`}
              >
                {sec.stageName}
                <span className="ml-1 tabular-nums text-muted-foreground">({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6">
        {!activeSection ? (
          <p className="font-sans text-sm text-muted-foreground">Sin datos de etapas.</p>
        ) : activeSection.applicants.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
            <p className="font-sans text-sm font-medium text-foreground">
              Sin postulantes en esta etapa
            </p>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              Cuando se muevan candidatos al tablero, aparecerán aquí.
            </p>
          </div>
        ) : filteredApplicants.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
            <p className="font-sans text-sm font-medium text-foreground">
              Ningún candidato coincide con los filtros
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-3 font-sans text-xs font-medium text-vo-purple underline-offset-2 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredApplicants.map((match, index) => {
              const pid = match.candidateProfileId?.trim() ?? ""
              const prep = pid ? prepByProfileId.get(pid) : undefined
              const key = `${stageName}-${pid || "np"}-${index}`
              return (
                <li key={key}>
                  <VacancyResultadosCandidateCard
                    match={match}
                    prep={prep}
                    companyStatuses={companyStatuses}
                    stageColumnName={stageName}
                    onScheduleInterview={onScheduleInterview}
                    onOpenTechnicalSheet={onOpenTechnicalSheet}
                    onOpenDetail={(m, p) => setDetail({ match: m, prep: p })}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {detail ? (
        <Modal
          isOpen
          onClose={() => setDetail(null)}
          title={detailName}
          size="lg"
          overlayZIndexClass="z-[60]"
        >
          <div className="space-y-4 font-sans text-sm text-foreground">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Entrevista
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                {detail.prep?.interviewSummaryLabel ?? "Sin datos de entrevista."}
              </p>
            </div>
            {(detail.prep?.strengths ??
              detail.match.qualitativeReasoningPositive ??
              detail.match.qualitative_reasoning_positive) ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                  Fortalezas
                </p>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                  {detail.prep?.strengths ??
                    detail.match.qualitativeReasoningPositive ??
                    detail.match.qualitative_reasoning_positive}
                </p>
              </div>
            ) : null}
            {(detail.prep?.considerations ??
              detail.match.qualitativeReasoningNegative ??
              detail.match.qualitative_reasoning_negative) ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-800 dark:text-rose-200">
                  Aspectos a considerar
                </p>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                  {detail.prep?.considerations ??
                    detail.match.qualitativeReasoningNegative ??
                    detail.match.qualitative_reasoning_negative}
                </p>
              </div>
            ) : null}
            {detail.prep?.relevantComments ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Comentarios
                </p>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                  {detail.prep.relevantComments}
                </p>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </section>
  )
}
