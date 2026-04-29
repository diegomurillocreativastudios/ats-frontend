"use client"

import { useCallback, useEffect, useState } from "react"
import { Calendar, Loader2 } from "lucide-react"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"
import {
  getInterviewsByCandidate,
  getInterviewHttpErrorMessage,
  type Interview,
} from "@/lib/api/interviews"
import { formatInterviewLocalDateTime } from "@/lib/interview-datetime"
import { InterviewDetailModal } from "@/components/rrhh/interviews/interview-detail-modal"
import { InterviewNotesModal } from "@/components/rrhh/interviews/interview-notes-modal"
import { InterviewStatusBadge } from "@/components/rrhh/interviews/interview-status-badge"

export interface CandidateInterviewListProps {
  candidateProfileId: string
}

export function CandidateInterviewList({
  candidateProfileId,
}: CandidateInterviewListProps) {
  const [items, setItems] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detailInterviewId, setDetailInterviewId] = useState<string | null>(null)
  const [detailVacancyId, setDetailVacancyId] = useState<string | null>(null)
  const [notesInterviewId, setNotesInterviewId] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success" as "success" | "error" | "info",
    message: "",
  })

  const load = useCallback(async () => {
    if (!candidateProfileId) return
    setLoading(true)
    setError(null)
    try {
      const list = await getInterviewsByCandidate(candidateProfileId)
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
  }, [candidateProfileId])

  useEffect(() => {
    load()
  }, [load])

  const handleOpenDetail = (interviewId: string, vacancyId: string) => {
    setDetailVacancyId(vacancyId)
    setDetailInterviewId(interviewId)
  }

  const handleCloseDetail = () => {
    setDetailInterviewId(null)
    setDetailVacancyId(null)
  }

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PortalPageHeader
        title="Entrevistas del candidato"
        description="Timeline de entrevistas en todas las vacantes."
      />

      <section aria-label="Listado de entrevistas del candidato">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16">
            <Loader2 className="h-8 w-8 animate-spin text-vo-purple" aria-hidden />
            <p className="font-sans text-sm text-muted-foreground">Cargando…</p>
          </div>
        ) : error ? (
          <p className="font-sans text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-16">
            <Calendar className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="font-sans text-sm text-muted-foreground">
              No hay entrevistas registradas para este candidato.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[640px] border-collapse text-left font-sans text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 font-semibold">Fecha y hora</th>
                  <th className="px-4 py-3 font-semibold">Vacante</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 tabular-nums">
                      {formatInterviewLocalDateTime(row.scheduledAtUtc)}
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-sm text-foreground">
                      {row.jobTitle?.trim() || row.vacancyId}
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
                          onClick={() => handleOpenDetail(row.id, row.vacancyId)}
                          className="font-medium text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple rounded-sm"
                        >
                          Administrar
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotesInterviewId(row.id)}
                          className="font-medium text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple rounded-sm"
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

      <InterviewDetailModal
        isOpen={detailInterviewId != null}
        onClose={handleCloseDetail}
        interviewId={detailInterviewId}
        vacancyIdFromQuery={detailVacancyId}
        onSaved={() => {
          load().catch(() => {})
        }}
        onDeleted={(id) => {
          setItems((prev) => prev.filter((i) => i.id !== id))
          setDetailInterviewId(null)
          setDetailVacancyId(null)
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
                const vac = r.jobTitle?.trim() || r.vacancyId
                return `${vac} · ${formatInterviewLocalDateTime(r.scheduledAtUtc)}`
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
