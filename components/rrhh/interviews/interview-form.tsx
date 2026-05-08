"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import {
  createInterview,
  fetchInterviewTypes,
  fetchVacancyApplicantOptions,
  getInterviewHttpErrorMessage,
  listInterviewModalitiesRecruiter,
  type CreateInterviewPayload,
  type InterviewModalityCatalogItem,
  type InterviewTypeOption,
  type VacancyApplicantOption,
} from "@/lib/api/interviews"
import { localDatetimeInputToUtcIso } from "@/lib/interview-datetime"
import { InterviewerRecruiterSelect } from "@/components/rrhh/interviews/interviewer-recruiter-select"
import { InterviewScheduleRow } from "@/components/rrhh/interviews/interview-schedule-controls"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"

export type InterviewFormProps =
  | {
      vacancyId: string
      mode: "page"
      backHref: string
    }
  | {
      vacancyId: string
      mode: "modal"
      onClose: () => void
      onCreated?: () => void
    }

export function InterviewForm(props: InterviewFormProps) {
  const { vacancyId } = props
  const { status: calendarStatus } = useGoogleCalendar()
  const isModal = props.mode === "modal"
  const backHref = props.mode === "page" ? props.backHref : ""
  const onCloseModal = props.mode === "modal" ? props.onClose : undefined
  const onCreatedModal = props.mode === "modal" ? props.onCreated : undefined

  const router = useRouter()
  const [options, setOptions] = useState<VacancyApplicantOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [interviewTypeOptions, setInterviewTypeOptions] = useState<
    InterviewTypeOption[]
  >([])
  const [loadingInterviewTypes, setLoadingInterviewTypes] = useState(true)
  const [modalityOptions, setModalityOptions] = useState<
    InterviewModalityCatalogItem[]
  >([])
  const [loadingModalities, setLoadingModalities] = useState(true)
  const [candidateProfileId, setCandidateProfileId] = useState("")
  const [scheduledLocal, setScheduledLocal] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [interviewType, setInterviewType] = useState("")
  const [interviewModalityId, setInterviewModalityId] = useState("")
  const [interviewerName, setInterviewerName] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success" as "success" | "error" | "info",
    message: "",
  })

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true)
    try {
      const list = await fetchVacancyApplicantOptions(vacancyId)
      setOptions(list)
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
      setOptions([])
    } finally {
      setLoadingOptions(false)
    }
  }, [vacancyId])

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
    loadOptions()
  }, [loadOptions])

  useEffect(() => {
    loadInterviewTypes()
  }, [loadInterviewTypes])

  useEffect(() => {
    loadModalities()
  }, [loadModalities])

  const selectedModality = modalityOptions.find(
    (m) => m.id === interviewModalityId
  )
  const showMeetHint = !!selectedModality?.includeGoogleMeetLink

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFieldErrors({})
    const nextErrors: Record<string, string> = {}
    if (!candidateProfileId.trim()) {
      nextErrors.candidateProfileId = "Selecciona un candidato"
    }
    if (!scheduledLocal.trim()) {
      nextErrors.scheduledLocal = "Indica fecha y hora"
    }
    let scheduledAtUtc = ""
    if (scheduledLocal.trim()) {
      try {
        scheduledAtUtc = localDatetimeInputToUtcIso(scheduledLocal)
      } catch {
        nextErrors.scheduledLocal = "Fecha u hora no válida"
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }
    setSubmitting(true)
    try {
      const durationParsed =
        durationMinutes.trim() === ""
          ? null
          : parseInt(durationMinutes, 10)
      const duration =
        durationParsed != null && Number.isFinite(durationParsed)
          ? durationParsed
          : null
      const typeTrim = interviewType.trim()
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        typeTrim
      )
      const body: CreateInterviewPayload = {
        candidateProfileId: candidateProfileId.trim(),
        scheduledAtUtc,
        durationMinutes: duration,
        interviewerName: interviewerName.trim() || null,
        descripcion: descripcion.trim() || null,
      }
      if (typeTrim) {
        if (isUuid) body.interviewTypeId = typeTrim
        else body.interviewType = typeTrim
      }
      const modalityTrim = interviewModalityId.trim()
      if (modalityTrim) {
        body.interviewModalityId = modalityTrim
      }
      await createInterview(vacancyId, body)
      if (isModal) {
        onCreatedModal?.()
        onCloseModal?.()
        return
      }
      router.push(
        `/portal-rrhh/entrevistas/${encodeURIComponent(vacancyId)}`
      )
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : 0
      setFormError(getInterviewHttpErrorMessage(status ?? 0, err))
      setSnackbar({
        open: true,
        variant: "error",
        message: getInterviewHttpErrorMessage(status ?? 0, err),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  return (
    <div
      className={
        isModal
          ? "flex flex-col gap-4"
          : "flex flex-col gap-6 p-4 md:p-8"
      }
    >
      {!isModal ? (
        <div className="flex flex-col gap-2">
          <Link
            href={backHref}
            className="w-fit font-sans text-sm text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple"
          >
            ← Volver al listado
          </Link>
          <PortalPageHeader title="Nueva entrevista" className="pb-0" />
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className={
          isModal
            ? "flex w-full max-w-none flex-col gap-5 rounded-xl border border-border bg-card p-6"
            : "flex max-w-xl flex-col gap-5 rounded-xl border border-border bg-card p-6"
        }
        aria-label="Formulario nueva entrevista"
      >
        {loadingOptions ? (
          <div className="flex items-center gap-2 font-sans text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando candidatos de la vacante...
          </div>
        ) : options.length === 0 ? (
          <p
            className="rounded-md border border-yellow-500 bg-yellow-50 px-3 py-2 font-sans text-sm font-medium leading-relaxed text-yellow-500"
            role="status"
          >
            Esta vacante aún no tiene candidatos. Primero añade candidatos a la
            vacante; después podrás agendar una entrevista.
          </p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="interview-candidate" className="font-sans text-sm font-medium">
            Candidato <span className="text-vo-pink">*</span>
          </label>
          <select
            id="interview-candidate"
            value={candidateProfileId}
            onChange={(e) => setCandidateProfileId(e.target.value)}
            disabled={loadingOptions || options.length === 0}
            className="h-10 rounded-md border border-input bg-background px-3 font-sans text-sm disabled:opacity-50"
            aria-invalid={!!fieldErrors.candidateProfileId}
            aria-describedby={
              fieldErrors.candidateProfileId ? "err-candidate" : undefined
            }
          >
            <option value="">Seleccionar…</option>
            {options.map((o) => (
              <option key={o.candidateProfileId} value={o.candidateProfileId}>
                {o.label}
              </option>
            ))}
          </select>
          {fieldErrors.candidateProfileId ? (
            <p id="err-candidate" className="text-sm text-destructive" role="alert">
              {fieldErrors.candidateProfileId}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <span id="interview-when-label" className="font-sans text-sm font-medium">
            Fecha y hora <span className="text-vo-pink">*</span>
          </span>
          <InterviewScheduleRow
            scheduledLocal={scheduledLocal}
            onScheduledLocalChange={setScheduledLocal}
            durationMinutes={durationMinutes}
            onDurationMinutesChange={setDurationMinutes}
            ariaLabelledBy="interview-when-label"
            errorMessage={fieldErrors.scheduledLocal ?? null}
          />
          {fieldErrors.scheduledLocal ? (
            <p id="err-when" className="text-sm text-destructive" role="alert">
              {fieldErrors.scheduledLocal}
            </p>
          ) : null}
        </div>

        {scheduledLocal.trim() ? (
          <div
            className="rounded-md border border-border bg-muted/50 px-3 py-2 font-sans text-sm text-foreground"
            role="status"
          >
            {calendarStatus.isConnected ? (
              <span>
                Esta entrevista se sincronizará con Google Calendar al guardar
                (si el servidor lo soporta).
              </span>
            ) : (
              <span>
                Google Calendar no está conectado.{" "}
                <Link
                  href="/portal-rrhh/configuracion/calendario"
                  className="font-medium text-vo-purple underline-offset-2 hover:underline"
                >
                  Conectar en configuración
                </Link>{" "}
                para invitaciones y eventos automáticos.
              </span>
            )}
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="interview-type" className="font-sans text-sm font-medium">
            Tipo
          </label>
          {loadingInterviewTypes ? (
            <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 font-sans text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Cargando tipos de entrevista…
            </div>
          ) : (
            <select
              id="interview-type"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 font-sans text-sm"
            >
              <option value="">Ej: Técnica, cultural…</option>
              {interviewTypeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="interview-modality"
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
              id="interview-modality"
              value={interviewModalityId}
              onChange={(e) => setInterviewModalityId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 font-sans text-sm"
            >
              <option value="">Selecciona una modalidad…</option>
              {modalityOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
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
          <label htmlFor="interview-interviewer" className="font-sans text-sm font-medium">
            Entrevistador(a)
          </label>
          <InterviewerRecruiterSelect
            id="interview-interviewer"
            value={interviewerName}
            onChange={setInterviewerName}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="interview-descripcion"
            className="font-sans text-sm font-medium"
          >
            Descripcion
          </label>
          <textarea
            id="interview-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={4}
            className="resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm"
          />
        </div>

        {formError ? (
          <p className="font-sans text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting || options.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white hover:bg-vo-purple-hover disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {submitting ? "Guardando..." : "Agendar entrevista"}
          </button>
          {isModal ? (
            <button
              type="button"
              onClick={onCloseModal}
              disabled={submitting}
              className="inline-flex items-center rounded-md border border-border px-5 py-2.5 font-sans text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
          ) : (
            <Link
              href={backHref}
              className="inline-flex items-center rounded-md border border-border px-5 py-2.5 font-sans text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancelar
            </Link>
          )}
        </div>
      </form>

      <Snackbar
        open={snackbar.open}
        onClose={handleCloseSnackbar}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </div>
  )
}
