"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import {
  fetchInterviewTypes,
  getInterviewById,
  getInterviewHttpErrorMessage,
  isInterviewTerminal,
  patchInterview,
  type Interview,
  type InterviewStatus,
  type InterviewTypeOption,
} from "@/lib/api/interviews"
import {
  localDatetimeInputToUtcIso,
  utcIsoToLocalDatetimeInputValue,
} from "@/lib/interview-datetime"
import { InterviewerRecruiterSelect } from "@/components/rrhh/interviews/interviewer-recruiter-select"
import { InterviewScheduleRow } from "@/components/rrhh/interviews/interview-schedule-controls"
import { InterviewStatusBadge } from "@/components/rrhh/interviews/interview-status-badge"
import Snackbar from "@/components/ui/Snackbar"

const STATUS_ACTIONS: { value: InterviewStatus; label: string }[] = [
  { value: "Scheduled", label: "Programada" },
  { value: "Completed", label: "Completada" },
  { value: "Cancelled", label: "Cancelada" },
  { value: "NoShow", label: "No asistió" },
]

export interface InterviewDetailPanelProps {
  interviewId: string
  vacancyIdFromQuery: string | null
  /** En modal: sin breadcrumb ni título de página duplicado. */
  variant?: "page" | "modal"
  onClose?: () => void
  onSaved?: () => void
}

export function InterviewDetailPanel({
  interviewId,
  vacancyIdFromQuery,
  variant = "page",
  onClose,
  onSaved,
}: InterviewDetailPanelProps) {
  const router = useRouter()
  const [interview, setInterview] = useState<Interview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scheduledLocal, setScheduledLocal] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [interviewType, setInterviewType] = useState("")
  const [interviewerName, setInterviewerName] = useState("")
  const [notes, setNotes] = useState("")
  const [statusChoice, setStatusChoice] = useState<InterviewStatus>("Scheduled")
  const [saving, setSaving] = useState(false)
  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success" as "success" | "error" | "info",
    message: "",
  })
  const [interviewTypeOptions, setInterviewTypeOptions] = useState<
    InterviewTypeOption[]
  >([])
  const [loadingInterviewTypes, setLoadingInterviewTypes] = useState(true)

  const vacancyId = interview?.vacancyId ?? vacancyIdFromQuery ?? ""

  const listHref = vacancyId
    ? `/portal-rrhh/entrevistas/${encodeURIComponent(vacancyId)}`
    : "/portal-rrhh/entrevistas"

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getInterviewById(interviewId)
      setInterview(data)
      setScheduledLocal(utcIsoToLocalDatetimeInputValue(data.scheduledAtUtc))
      setDurationMinutes(
        data.durationMinutes != null ? String(data.durationMinutes) : ""
      )
      setInterviewType(data.interviewType ?? "")
      setInterviewerName(data.interviewerName ?? "")
      setNotes(data.notes ?? "")
      setStatusChoice(data.status)
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : 0
      setError(getInterviewHttpErrorMessage(status ?? 0, err))
      setInterview(null)
    } finally {
      setLoading(false)
    }
  }, [interviewId])

  useEffect(() => {
    load()
  }, [load])

  const loadInterviewTypes = useCallback(async () => {
    setLoadingInterviewTypes(true)
    try {
      const list = await fetchInterviewTypes()
      setInterviewTypeOptions(list)
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : 0
      setSnackbar({
        open: true,
        variant: "error",
        message: getInterviewHttpErrorMessage(status ?? 0, err),
      })
      setInterviewTypeOptions([])
    } finally {
      setLoadingInterviewTypes(false)
    }
  }, [])

  useEffect(() => {
    loadInterviewTypes()
  }, [loadInterviewTypes])

  const hasTypeOption = useMemo(
    () =>
      !interviewType.trim() ||
      interviewTypeOptions.some((t) => t.value === interviewType),
    [interviewType, interviewTypeOptions]
  )

  const isEditable = useMemo(
    () => interview != null && !isInterviewTerminal(interview),
    [interview]
  )

  const handleSave = async () => {
    if (!interview) return
    setSaving(true)
    try {
      let scheduledAtUtc: string | undefined
      if (scheduledLocal.trim()) {
        scheduledAtUtc = localDatetimeInputToUtcIso(scheduledLocal)
      }
      const durationParsed =
        durationMinutes.trim() === ""
          ? null
          : parseInt(durationMinutes, 10)
      const duration =
        durationParsed != null && Number.isFinite(durationParsed)
          ? durationParsed
          : null
      const updated = await patchInterview(interview.id, {
        scheduledAtUtc,
        durationMinutes: duration,
        interviewType: interviewType.trim() || null,
        interviewerName: interviewerName.trim() || null,
        notes: notes.trim() || null,
        status: statusChoice,
      })
      setInterview(updated)
      onSaved?.()
      if (variant === "modal" && onClose) {
        onClose()
        return
      }
      setSnackbar({
        open: true,
        variant: "success",
        message: "Cambios guardados.",
      })
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : 0
      setSnackbar({
        open: true,
        variant: "error",
        message: getInterviewHttpErrorMessage(status ?? 0, err),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-20"
        data-testid="interview-detail-loading"
      >
        <Loader2 className="h-8 w-8 animate-spin text-vo-purple" aria-hidden />
        <p className="font-inter text-sm text-muted-foreground">
          Cargando entrevista...
        </p>
      </div>
    )
  }

  if (error || !interview) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <p className="font-inter text-sm text-destructive" role="alert">
          {error ?? "No se pudo cargar la entrevista."}
        </p>
        <button
          type="button"
          onClick={() => {
            if (variant === "modal" && onClose) onClose()
            else router.push(listHref)
          }}
          className="w-fit rounded-md bg-vo-purple px-4 py-2 font-inter text-sm text-white"
        >
          {variant === "modal" && onClose ? "Cerrar" : "Volver al listado"}
        </button>
      </div>
    )
  }

  const rootClass =
    variant === "modal"
      ? "flex flex-col gap-5"
      : "flex flex-col gap-6 p-4 md:p-8"

  return (
    <div className={rootClass}>
      <div className="flex flex-col gap-2">
        {variant === "page" ? (
          <Link
            href={listHref}
            className="w-fit font-inter text-sm text-muted-foreground hover:text-foreground"
          >
            ← Volver a entrevistas
          </Link>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {variant === "page" ? (
            <h1 className="font-inter text-2xl font-bold text-foreground">
              Entrevista
            </h1>
          ) : null}
          {isEditable ? (
            <InterviewStatusBadge status={statusChoice} />
          ) : null}
        </div>
      </div>

      <div className="flex max-w-xl flex-col gap-5 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-1.5">
          <span className="font-inter text-sm font-medium">Estado</span>
          {isEditable ? (
            <select
              value={statusChoice}
              onChange={(e) =>
                setStatusChoice(e.target.value as InterviewStatus)
              }
              className="h-10 rounded-md border border-input bg-background px-3 font-inter text-sm"
              aria-label="Estado de la entrevista"
            >
              {STATUS_ACTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <InterviewStatusBadge
                status={interview.status}
                label={interview.statusDisplayName}
              />
            </div>
          )}
          {!isEditable ? (
            <p className="font-inter text-xs text-muted-foreground" role="status">
              Esta entrevista está cerrada (estado terminal). Los datos son solo
              lectura.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <span id="detail-when-label" className="font-inter text-sm font-medium">
            Fecha y hora
          </span>
          <InterviewScheduleRow
            scheduledLocal={scheduledLocal}
            onScheduledLocalChange={setScheduledLocal}
            durationMinutes={durationMinutes}
            onDurationMinutesChange={setDurationMinutes}
            disabled={!isEditable}
            ariaLabelledBy="detail-when-label"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="detail-type" className="font-inter text-sm font-medium">
            Tipo
          </label>
          {loadingInterviewTypes ? (
            <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 font-inter text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Cargando tipos de entrevista…
            </div>
          ) : (
            <select
              id="detail-type"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              disabled={!isEditable}
              className="h-10 rounded-md border border-input bg-background px-3 font-inter text-sm disabled:opacity-60"
            >
              <option value="">Ej: Técnica, cultural…</option>
              {interviewTypeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
              {!hasTypeOption && interviewType.trim() ? (
                <option value={interviewType}>{interviewType}</option>
              ) : null}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="detail-interviewer"
            className="font-inter text-sm font-medium"
          >
            Entrevistador(a)
          </label>
          <InterviewerRecruiterSelect
            id="detail-interviewer"
            value={interviewerName}
            onChange={setInterviewerName}
            disabled={!isEditable}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="detail-notes" className="font-inter text-sm font-medium">
            Notas
          </label>
          <textarea
            id="detail-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isEditable}
            rows={4}
            className="resize-y rounded-md border border-input bg-background px-3 py-2 font-inter text-sm disabled:opacity-60"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isEditable}
            className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white hover:bg-vo-purple-hover disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center rounded-md border border-border px-5 py-2.5 font-inter text-sm text-foreground hover:bg-muted"
          >
            Descartar cambios
          </button>
        </div>
      </div>

      <Snackbar
        open={snackbar.open}
        onClose={handleCloseSnackbar}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </div>
  )
}
