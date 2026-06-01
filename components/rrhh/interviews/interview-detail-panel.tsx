"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import {
  deleteRecruiterInterview,
  fetchInterviewTypes,
  getInterviewById,
  getInterviewHttpErrorMessage,
  isInterviewTerminal,
  listInterviewModalitiesRecruiter,
  patchInterview,
  type Interview,
  type InterviewModalityCatalogItem,
  type InterviewStatus,
  type InterviewTypeOption,
  type PatchInterviewPayload,
} from "@/lib/api/interviews"
import {
  localDatetimeInputToUtcIso,
  utcIsoToLocalDatetimeInputValue,
} from "@/lib/interview-datetime"
import { InterviewerRecruiterSelect } from "@/components/rrhh/interviews/interviewer-recruiter-select"
import { InterviewScheduleRow } from "@/components/rrhh/interviews/interview-schedule-controls"
import { InterviewStatusBadge } from "@/components/rrhh/interviews/interview-status-badge"
import { InterviewCalendarWidget } from "@/components/rrhh/interviews/interview-calendar-widget"
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"

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
  /** Tras borrado exitoso (p. ej. quitar fila del listado en modal). */
  onDeleted?: (interviewId: string) => void
}

export function InterviewDetailPanel({
  interviewId,
  vacancyIdFromQuery,
  variant = "page",
  onClose,
  onSaved,
  onDeleted,
}: InterviewDetailPanelProps) {
  const router = useRouter()
  const { status: calendarStatus } = useGoogleCalendar()
  const [interview, setInterview] = useState<Interview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scheduledLocal, setScheduledLocal] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [interviewType, setInterviewType] = useState("")
  const [interviewModalityId, setInterviewModalityId] = useState("")
  const [interviewerName, setInterviewerName] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [statusChoice, setStatusChoice] = useState<InterviewStatus>("Scheduled")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success" as "success" | "error" | "info",
    message: "",
  })
  const [interviewTypeOptions, setInterviewTypeOptions] = useState<
    InterviewTypeOption[]
  >([])
  const [loadingInterviewTypes, setLoadingInterviewTypes] = useState(true)
  const [modalityOptions, setModalityOptions] = useState<
    InterviewModalityCatalogItem[]
  >([])
  const [loadingModalities, setLoadingModalities] = useState(true)

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
      setInterviewModalityId(data.interviewModalityId ?? "")
      setInterviewerName(data.interviewerName ?? "")
      setDescripcion(data.descripcion ?? "")
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

  const loadModalities = useCallback(async () => {
    setLoadingModalities(true)
    try {
      const list = await listInterviewModalitiesRecruiter()
      setModalityOptions(list)
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
      setModalityOptions([])
    } finally {
      setLoadingModalities(false)
    }
  }, [])

  useEffect(() => {
    loadInterviewTypes()
  }, [loadInterviewTypes])

  useEffect(() => {
    loadModalities()
  }, [loadModalities])

  const hasTypeOption = useMemo(
    () =>
      !interviewType.trim() ||
      interviewTypeOptions.some((t) => t.value === interviewType),
    [interviewType, interviewTypeOptions]
  )

  const selectedModality = useMemo(() => {
    if (!interviewModalityId.trim()) return null
    const fromList = modalityOptions.find((m) => m.id === interviewModalityId)
    if (fromList) return fromList
    if (
      interview?.interviewModality &&
      interview.interviewModality.id === interviewModalityId
    ) {
      return interview.interviewModality
    }
    return null
  }, [interviewModalityId, modalityOptions, interview?.interviewModality])

  const hasModalityOption = useMemo(
    () => !interviewModalityId.trim() || selectedModality != null,
    [interviewModalityId, selectedModality]
  )

  const isEditable = useMemo(
    () => interview != null && !isInterviewTerminal(interview),
    [interview]
  )

  const showMeetHint = useMemo(() => {
    if (!selectedModality?.includeGoogleMeetLink) return false
    if (interview?.googleMeetUrl?.trim()) return false
    return true
  }, [selectedModality, interview?.googleMeetUrl])

  const handleSave = async () => {
    if (!interview) return
    const ae = document.activeElement
    if (ae instanceof HTMLElement) ae.blur()
    setSaving(true)
    try {
      const durationParsed =
        durationMinutes.trim() === ""
          ? null
          : parseInt(durationMinutes, 10)
      const duration =
        durationParsed != null && Number.isFinite(durationParsed)
          ? durationParsed
          : null
      const patchPayload: PatchInterviewPayload = {
        durationMinutes: duration,
        interviewType: interviewType.trim() || null,
        interviewModalityId: interviewModalityId.trim() || null,
        interviewerName: interviewerName.trim() || null,
        descripcion: descripcion.trim() || null,
        status: statusChoice,
      }
      const scheduleTrimmed = scheduledLocal.trim()
      if (scheduleTrimmed) {
        try {
          patchPayload.scheduledAtUtc =
            localDatetimeInputToUtcIso(scheduleTrimmed)
        } catch {
          setSnackbar({
            open: true,
            variant: "error",
            message: "La fecha u hora no es válida. Revisa el campo de hora.",
          })
          return
        }
      }
      const updated = await patchInterview(interview.id, patchPayload)
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

  const handleConfirmDelete = async () => {
    if (!interview) return
    setDeleting(true)
    try {
      await deleteRecruiterInterview(interview.id)
      setDeleteConfirmOpen(false)
      onDeleted?.(interview.id)
      if (variant === "modal" && onClose) {
        onClose()
        return
      }
      router.push(listHref)
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
      setDeleting(false)
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
        <p className="font-sans text-sm text-muted-foreground">
          Cargando entrevista...
        </p>
      </div>
    )
  }

  if (error || !interview) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <p className="font-sans text-sm text-destructive" role="alert">
          {error ?? "No se pudo cargar la entrevista."}
        </p>
        <button
          type="button"
          onClick={() => {
            if (variant === "modal" && onClose) onClose()
            else router.push(listHref)
          }}
          className="w-fit rounded-md bg-vo-purple px-4 py-2 font-sans text-sm text-white"
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
            className="w-fit font-sans text-sm text-muted-foreground hover:text-foreground"
          >
            ← Volver a entrevistas
          </Link>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {variant === "page" ? (
            <PortalPageHeader title="Entrevista" className="w-full pb-0" />
          ) : null}
          {isEditable ? (
            <InterviewStatusBadge status={statusChoice} />
          ) : null}
        </div>
      </div>

      <div
        className={
          variant === "modal"
            ? "flex flex-col gap-6"
            : "grid gap-6 lg:max-w-none lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start"
        }
      >
      <div className="flex max-w-xl flex-col gap-5 rounded-xl border border-border bg-card p-6 lg:max-w-none">
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-sm font-medium">Estado</span>
          {isEditable ? (
            <select
              value={statusChoice}
              onChange={(e) =>
                setStatusChoice(e.target.value as InterviewStatus)
              }
              className="h-10 rounded-md border border-input bg-background px-3 font-sans text-sm"
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
            <p className="font-sans text-xs text-muted-foreground" role="status">
              Esta entrevista está cerrada (estado terminal). Los datos son solo
              lectura.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <span id="detail-when-label" className="font-sans text-sm font-medium">
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
          <label htmlFor="detail-type" className="font-sans text-sm font-medium">
            Tipo
          </label>
          {loadingInterviewTypes ? (
            <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 font-sans text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Cargando tipos de entrevista…
            </div>
          ) : (
            <select
              id="detail-type"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              disabled={!isEditable}
              className="h-10 rounded-md border border-input bg-background px-3 font-sans text-sm disabled:opacity-60"
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
            htmlFor="detail-modality"
            className="font-sans text-sm font-medium"
          >
            Modalidad
          </label>
          {loadingModalities ? (
            <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 font-sans text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Cargando modalidades…
            </div>
          ) : (
            <select
              id="detail-modality"
              value={interviewModalityId}
              onChange={(e) => setInterviewModalityId(e.target.value)}
              disabled={!isEditable}
              className="h-10 rounded-md border border-input bg-background px-3 font-sans text-sm disabled:opacity-60"
            >
              <option value="">Selecciona una modalidad…</option>
              {modalityOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
              {!hasModalityOption &&
              interviewModalityId.trim() &&
              interview?.interviewModality?.id === interviewModalityId ? (
                <option value={interviewModalityId}>
                  {interview.interviewModality.displayName}
                </option>
              ) : null}
            </select>
          )}
          {showMeetHint ? (
            <div
              className="rounded-md border border-border bg-muted/50 px-3 py-2 font-sans text-sm text-foreground"
              role="status"
            >
              {calendarStatus.isConnected ? (
                <span>
                  Se generará un enlace de Google Meet al guardar (vía Google
                  Calendar).
                </span>
              ) : (
                <span>
                  Esta modalidad genera un enlace de Google Meet, pero Google
                  Calendar no está conectado.{" "}
                  <Link
                    href="/portal-rrhh/configuracion/calendario"
                    className="font-medium text-vo-purple underline-offset-2 hover:underline"
                  >
                    Conectar en configuración
                  </Link>{" "}
                  para que se cree automáticamente.
                </span>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="detail-interviewer"
            className="font-sans text-sm font-medium"
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
          <label
            htmlFor="detail-descripcion"
            className="font-sans text-sm font-medium"
          >
            Descripcion
          </label>
          <textarea
            id="detail-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={!isEditable}
            rows={4}
            className="resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm disabled:opacity-60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || deleting || !isEditable}
            className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white hover:bg-vo-purple-hover disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <button
            type="button"
            onClick={() => load()}
            disabled={saving || deleting}
            className="inline-flex items-center rounded-md border border-border px-5 py-2.5 font-sans text-sm text-foreground hover:bg-muted disabled:opacity-50"
          >
            Descartar cambios
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={saving || deleting || deleteConfirmOpen}
            className="inline-flex items-center gap-2 rounded-md border border-destructive/60 px-5 py-2.5 font-sans text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
            aria-label="Eliminar entrevista"
          >
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
            Eliminar
          </button>
        </div>
      </div>

      <InterviewCalendarWidget
        interviewId={interview.id}
        scheduledAtUtc={interview.scheduledAtUtc}
        onSync={() => void load()}
      />
      </div>

      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          if (!deleting) setDeleteConfirmOpen(false)
        }}
        onConfirm={() => void handleConfirmDelete()}
        title="Eliminar entrevista"
        message="¿Eliminar esta entrevista? Se archivará y dejará de mostrarse en los listados."
        loading={deleting}
        overlayZIndexClass={
          variant === "modal" ? "z-[100]" : undefined
        }
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
