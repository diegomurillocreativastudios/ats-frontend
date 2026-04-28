"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Calendar, Loader2, Plus } from "lucide-react"
import {
  getInterviewsByVacancy,
  getInterviewHttpErrorMessage,
  type Interview,
  type InterviewStatus,
  type ListInterviewsQuery,
} from "@/lib/api/interviews"
import type { UseRecruiterVacancySummaryResult } from "@/hooks/use-recruiter-vacancy-summary"
import { formatInterviewLocalDateTime } from "@/lib/interview-datetime"
import { InterviewCreateModal } from "@/components/rrhh/interviews/interview-create-modal"
import { InterviewDetailModal } from "@/components/rrhh/interviews/interview-detail-modal"
import { InterviewNotesModal } from "@/components/rrhh/interviews/interview-notes-modal"
import { InterviewSingleDatetimeRow } from "@/components/rrhh/interviews/interview-schedule-controls"
import { InterviewStatusBadge } from "@/components/rrhh/interviews/interview-status-badge"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"

const STATUS_FILTER_OPTIONS: { value: "" | InterviewStatus; label: string }[] =
  [
    { value: "", label: "Todos los estados" },
    { value: "Scheduled", label: "Programada" },
    { value: "Completed", label: "Completada" },
    { value: "Cancelled", label: "Cancelada" },
    { value: "NoShow", label: "No asistió" },
  ]

export interface InterviewListProps {
  vacancyId: string
  vacancySummary: UseRecruiterVacancySummaryResult
}

function formatCandidateLabel(
  profileId: string,
  labelById: Map<string, string>
): string {
  if (!profileId) return "—"
  const label = labelById.get(profileId)
  if (label) return label
  return `Candidato (${profileId.slice(0, 8)}…)`
}

function formatDurationCell(minutes: number | null): string {
  if (minutes == null || !Number.isFinite(minutes)) return "—"
  return `${minutes} min`
}

export function InterviewList({ vacancyId, vacancySummary }: InterviewListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [detailInterviewId, setDetailInterviewId] = useState<string | null>(null)
  const [notesInterviewId, setNotesInterviewId] = useState<string | null>(null)

  const applicantLabelByProfileId = useMemo(() => {
    const m = new Map<string, string>()
    vacancySummary.applicantOptions.forEach((o) => {
      m.set(o.candidateProfileId, o.label)
    })
    return m
  }, [vacancySummary.applicantOptions])

  const vacancyTitle = vacancySummary.title
  const [items, setItems] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draftStatus, setDraftStatus] = useState<"" | InterviewStatus>("")
  const [draftFrom, setDraftFrom] = useState("")
  const [draftTo, setDraftTo] = useState("")
  const [applied, setApplied] = useState<{
    status: "" | InterviewStatus
    from: string
    to: string
  }>({ status: "", from: "", to: "" })
  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success" as "success" | "error" | "info",
    message: "",
  })

  const appliedQuery = useMemo((): ListInterviewsQuery => {
    const q: ListInterviewsQuery = {}
    if (applied.status) q.status = applied.status
    if (applied.from.trim()) {
      const d = new Date(applied.from)
      if (!Number.isNaN(d.getTime())) q.fromUtc = d.toISOString()
    }
    if (applied.to.trim()) {
      const d = new Date(applied.to)
      if (!Number.isNaN(d.getTime())) q.toUtc = d.toISOString()
    }
    return q
  }, [applied])

  const load = useCallback(async () => {
    if (!vacancyId) return
    setLoading(true)
    setError(null)
    try {
      const list = await getInterviewsByVacancy(vacancyId, appliedQuery)
      setItems(list)
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : 0
      setError(getInterviewHttpErrorMessage(status ?? 0, err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [vacancyId, appliedQuery])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (searchParams.get("nueva") !== "1") return
    setIsCreateOpen(true)
    router.replace(pathname, { scroll: false })
  }, [searchParams, router, pathname])

  const handleOpenCreate = () => {
    setIsCreateOpen(true)
  }

  const handleCloseCreate = () => {
    setIsCreateOpen(false)
  }

  const handleCloseDetail = () => {
    setDetailInterviewId(null)
  }

  const handleCreatedInterview = () => {
    setSnackbar({
      open: true,
      variant: "success",
      message: "Entrevista creada correctamente.",
    })
    load().catch(() => {})
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    setDraftStatus(v === "" ? "" : (v as InterviewStatus))
  }

  const handleApplyFilters = () => {
    setApplied({
      status: draftStatus,
      from: draftFrom,
      to: draftTo,
    })
  }

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PortalPageHeader
        title="Entrevistas"
        description={
          vacancySummary.loading
            ? "Cargando datos de la vacante…"
            : vacancyTitle?.trim()
              ? `Vacante: ${vacancyTitle.trim()}`
              : vacancySummary.error
                ? "No se pudo cargar el título de la vacante."
                : "Gestión de entrevistas de la vacante"
        }
        actions={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex w-fit items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
            data-testid="interviews-new-button"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Nueva entrevista
          </button>
        }
      />

      <section
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
        aria-label="Filtros de entrevistas"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex min-w-[200px] flex-col gap-1.5">
            <label
              htmlFor="interview-filter-status"
              className="font-inter text-sm font-medium text-foreground"
            >
              Estado
            </label>
            <select
              id="interview-filter-status"
              value={draftStatus}
              onChange={handleStatusChange}
              className="h-10 rounded-md border border-input bg-background px-3 font-inter text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple"
            >
              {STATUS_FILTER_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-[220px] flex-col gap-1.5">
            <span
              id="interview-filter-from-label"
              className="font-inter text-sm font-medium text-foreground"
            >
              Desde (local)
            </span>
            <InterviewSingleDatetimeRow
              value={draftFrom}
              onChange={setDraftFrom}
              ariaLabelledBy="interview-filter-from-label"
            />
          </div>
          <div className="flex min-w-[220px] flex-col gap-1.5">
            <span
              id="interview-filter-to-label"
              className="font-inter text-sm font-medium text-foreground"
            >
              Hasta (local)
            </span>
            <InterviewSingleDatetimeRow
              value={draftTo}
              onChange={setDraftTo}
              ariaLabelledBy="interview-filter-to-label"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyFilters}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 font-inter text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple"
          >
            Aplicar filtros
          </button>
        </div>
        <p className="font-inter text-xs text-muted-foreground">
          Los filtros de rango usan la zona horaria del navegador; el API recibe UTC.
        </p>
      </section>

      <section aria-label="Listado de entrevistas">
        {loading ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16"
            data-testid="interviews-loading"
          >
            <Loader2
              className="h-8 w-8 animate-spin text-vo-purple"
              aria-hidden
            />
            <p className="font-inter text-sm text-muted-foreground">
              Cargando entrevistas...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16">
            <p className="font-inter text-sm text-destructive" role="alert">
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                load().catch(() => {})
              }}
              className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white hover:bg-vo-purple-hover"
            >
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-16">
            <Calendar className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="font-inter text-sm text-muted-foreground">
              No hay entrevistas para esta vacante.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white hover:bg-vo-purple-hover"
              data-testid="interviews-first-create-button"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Crear primera entrevista
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[880px] border-collapse text-left font-inter text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                    Fecha y hora
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                    Candidato
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                    Tipo
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                    Duración
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                    Entrevistador
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {formatInterviewLocalDateTime(row.scheduledAtUtc)}
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-foreground" title={formatCandidateLabel(row.candidateProfileId, applicantLabelByProfileId)}>
                      {formatCandidateLabel(
                        row.candidateProfileId,
                        applicantLabelByProfileId
                      )}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-muted-foreground">
                      {row.interviewTypeLabel ?? row.interviewType ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                      {formatDurationCell(row.durationMinutes)}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-muted-foreground">
                      {row.interviewerName?.trim() ? row.interviewerName : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <InterviewStatusBadge
                        status={row.status}
                        label={row.statusDisplayName}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <button
                          type="button"
                          onClick={() => setDetailInterviewId(row.id)}
                          className="font-medium text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded-sm"
                          data-testid={`interview-open-detail-${row.id}`}
                        >
                          Administrar
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotesInterviewId(row.id)}
                          className="font-medium text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded-sm"
                          data-testid={`interview-open-notes-${row.id}`}
                        >
                          Notas
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <InterviewCreateModal
        isOpen={isCreateOpen}
        onClose={handleCloseCreate}
        vacancyId={vacancyId}
        onCreated={handleCreatedInterview}
      />

      <InterviewDetailModal
        isOpen={detailInterviewId != null}
        onClose={handleCloseDetail}
        interviewId={detailInterviewId}
        vacancyIdFromQuery={vacancyId}
        onSaved={() => {
          load().catch(() => {})
        }}
        onDeleted={(id) => {
          setItems((prev) => prev.filter((i) => i.id !== id))
          setDetailInterviewId(null)
          setSnackbar({
            open: true,
            variant: "success",
            message: "Entrevista eliminada.",
          })
        }}
      />

      <InterviewNotesModal
        isOpen={notesInterviewId != null}
        onClose={() => setNotesInterviewId(null)}
        interviewId={notesInterviewId}
        initialNotes={
          notesInterviewId
            ? items.find((i) => i.id === notesInterviewId)?.notes ?? null
            : null
        }
        contextLine={
          notesInterviewId
            ? (() => {
                const r = items.find((i) => i.id === notesInterviewId)
                if (!r) return null
                return `${formatCandidateLabel(r.candidateProfileId, applicantLabelByProfileId)} · ${formatInterviewLocalDateTime(r.scheduledAtUtc)}`
              })()
            : null
        }
        onSaved={() => {
          load().catch(() => {})
          setSnackbar({
            open: true,
            variant: "success",
            message: "Notas guardadas.",
          })
        }}
      />

      <Snackbar
        open={snackbar.open}
        onClose={handleCloseSnackbar}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </div>
  )
}
