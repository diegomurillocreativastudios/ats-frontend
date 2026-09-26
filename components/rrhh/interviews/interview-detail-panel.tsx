"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
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
  getTodayDateInputValue,
  isLocalDatetimeInPast,
  localDatetimeInputToUtcIso,
  utcIsoToLocalDatetimeInputValue,
} from "@/lib/interview-datetime"
import { InterviewerRecruiterSelect } from "@/components/rrhh/interviews/interviewer-recruiter-select"
import { InterviewScheduleRow } from "@/components/rrhh/interviews/interview-schedule-controls"
import { InterviewStatusBadge } from "@/components/rrhh/interviews/interview-status-badge"
import { InterviewSessionLinks } from "@/components/rrhh/interviews/interview-session-links"
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Modal from "@/components/ui/Modal"
import Snackbar from "@/components/ui/Snackbar"
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"
import { getInterviewStatusLabel } from "@/lib/interviews/interview-status-labels"
import { splitCandidateIdentity } from "@/lib/rrhh/candidate-identity"

interface DetailFormSnapshot {
  scheduledLocal: string
  durationMinutes: string
  interviewType: string
  interviewModalityId: string
  interviewerName: string
  descripcion: string
  statusChoice: InterviewStatus
}

function snapshotFromInterview(data: Interview): DetailFormSnapshot {
  return {
    scheduledLocal: utcIsoToLocalDatetimeInputValue(data.scheduledAtUtc),
    durationMinutes:
      data.durationMinutes != null ? String(data.durationMinutes) : "",
    interviewType: data.interviewType ?? "",
    interviewModalityId: data.interviewModalityId ?? "",
    interviewerName: data.interviewerName ?? "",
    descripcion: data.descripcion ?? "",
    statusChoice: data.status,
  }
}

function applySnapshot(
  snap: DetailFormSnapshot,
  setters: {
    setScheduledLocal: (v: string) => void
    setDurationMinutes: (v: string) => void
    setInterviewType: (v: string) => void
    setInterviewModalityId: (v: string) => void
    setInterviewerName: (v: string) => void
    setDescripcion: (v: string) => void
    setStatusChoice: (v: InterviewStatus) => void
  }
) {
  setters.setScheduledLocal(snap.scheduledLocal)
  setters.setDurationMinutes(snap.durationMinutes)
  setters.setInterviewType(snap.interviewType)
  setters.setInterviewModalityId(snap.interviewModalityId)
  setters.setInterviewerName(snap.interviewerName)
  setters.setDescripcion(snap.descripcion)
  setters.setStatusChoice(snap.statusChoice)
}

const FIELD_CONTROL =
  "h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 font-sans text-sm disabled:opacity-60"

export interface InterviewDetailPanelProps {
  interviewId: string
  vacancyIdFromQuery: string | null
  candidateLabel?: string | null
  vacancyTitle?: string | null
  /** En modal: sin breadcrumb ni título de página duplicado. */
  variant?: "page" | "modal"
  /** Solo en `variant="modal"`: controla el dialog. */
  isOpen?: boolean
  modalTitle?: string
  onClose?: () => void
  onSaved?: () => void
  /** Tras borrado exitoso (p. ej. quitar fila del listado en modal). */
  onDeleted?: (interviewId: string) => void
}

export function InterviewDetailPanel({
  interviewId,
  vacancyIdFromQuery,
  candidateLabel = null,
  vacancyTitle = null,
  variant = "page",
  isOpen,
  modalTitle,
  onClose,
  onSaved,
  onDeleted,
}: InterviewDetailPanelProps) {
  const t = useTranslations("RecruiterPortal.interviews")
  const tCommon = useTranslations("Common")
  const router = useRouter()
  const { status: calendarStatus } = useGoogleCalendar()
  const isModal = variant === "modal"

  const statusActions = useMemo(
    (): { value: InterviewStatus; label: string }[] => [
      { value: "Scheduled", label: getInterviewStatusLabel("Scheduled", t) },
      { value: "Completed", label: getInterviewStatusLabel("Completed", t) },
      { value: "Cancelled", label: getInterviewStatusLabel("Cancelled", t) },
      { value: "NoShow", label: getInterviewStatusLabel("NoShow", t) },
    ],
    [t]
  )

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
  const [savedSnapshot, setSavedSnapshot] = useState<DetailFormSnapshot | null>(
    null
  )
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

  const setters = useMemo(
    () => ({
      setScheduledLocal,
      setDurationMinutes,
      setInterviewType,
      setInterviewModalityId,
      setInterviewerName,
      setDescripcion,
      setStatusChoice,
    }),
    []
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getInterviewById(interviewId)
      setInterview(data)
      const snap = snapshotFromInterview(data)
      setSavedSnapshot(snap)
      applySnapshot(snap, setters)
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : 0
      setError(getInterviewHttpErrorMessage(status ?? 0, err))
      setInterview(null)
      setSavedSnapshot(null)
    } finally {
      setLoading(false)
    }
  }, [interviewId, setters])

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
      interviewTypeOptions.some((opt) => opt.value === interviewType),
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

  const isDirty = useMemo(() => {
    if (!savedSnapshot) return false
    return (
      scheduledLocal !== savedSnapshot.scheduledLocal ||
      durationMinutes !== savedSnapshot.durationMinutes ||
      interviewType !== savedSnapshot.interviewType ||
      interviewModalityId !== savedSnapshot.interviewModalityId ||
      interviewerName !== savedSnapshot.interviewerName ||
      descripcion !== savedSnapshot.descripcion ||
      statusChoice !== savedSnapshot.statusChoice
    )
  }, [
    savedSnapshot,
    scheduledLocal,
    durationMinutes,
    interviewType,
    interviewModalityId,
    interviewerName,
    descripcion,
    statusChoice,
  ])

  const showMeetHint = useMemo(() => {
    if (!selectedModality?.includeGoogleMeetLink) return false
    if (interview?.googleMeetUrl?.trim()) return false
    return true
  }, [selectedModality, interview?.googleMeetUrl])

  const durationParsed = parseInt(durationMinutes, 10)
  const durationLabel =
    Number.isFinite(durationParsed) && durationParsed > 0
      ? t("detail.durationMinutes", { minutes: durationParsed })
      : null

  const candidateDisplay =
    candidateLabel?.trim() ||
    interview?.candidateName?.trim() ||
    t("detail.candidateFallback")
  const { name: candidateName, email: candidateEmail } =
    splitCandidateIdentity(candidateDisplay)
  const vacancyDisplay =
    vacancyTitle?.trim() || interview?.jobTitle?.trim() || null

  const handleCancel = useCallback(() => {
    if (isModal && onClose) {
      onClose()
      return
    }
    if (savedSnapshot) applySnapshot(savedSnapshot, setters)
  }, [isModal, onClose, savedSnapshot, setters])

  const finishAfterSave = useCallback(
    (updated: Interview) => {
      const snap = snapshotFromInterview(updated)
      setSavedSnapshot(snap)
      applySnapshot(snap, setters)
      onSaved?.()
      if (isModal && onClose) onClose()
      else {
        setSnackbar({
          open: true,
          variant: "success",
          message: t("toasts.saved"),
        })
      }
    },
    [isModal, onClose, onSaved, setters, t]
  )

  const handleSave = async () => {
    if (!interview) return
    const ae = document.activeElement
    if (ae instanceof HTMLElement) ae.blur()
    setSaving(true)
    try {
      const durationValue =
        durationMinutes.trim() === ""
          ? null
          : parseInt(durationMinutes, 10)
      const duration =
        durationValue != null && Number.isFinite(durationValue)
          ? durationValue
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
        const scheduleChanged =
          !savedSnapshot || scheduleTrimmed !== savedSnapshot.scheduledLocal
        if (scheduleChanged) {
          const todayYmd = getTodayDateInputValue()
          const datePart = scheduleTrimmed.slice(0, 10)
          if (datePart && datePart < todayYmd) {
            setSnackbar({
              open: true,
              variant: "error",
              message: t("detail.validation.pastDateNotAllowed"),
            })
            return
          }
          if (isLocalDatetimeInPast(scheduleTrimmed)) {
            setSnackbar({
              open: true,
              variant: "error",
              message: t("detail.validation.pastDateTimeNotAllowed"),
            })
            return
          }
        }
        try {
          patchPayload.scheduledAtUtc =
            localDatetimeInputToUtcIso(scheduleTrimmed)
        } catch {
          setSnackbar({
            open: true,
            variant: "error",
            message: t("detail.validation.invalidDateTime"),
          })
          return
        }
      }
      const updated = await patchInterview(interview.id, patchPayload)
      setInterview(updated)
      finishAfterSave(updated)
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
      if (isModal && onClose) {
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

  const actionBar = (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => setDeleteConfirmOpen(true)}
        disabled={saving || deleting || deleteConfirmOpen}
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 font-sans text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
        aria-label={t("detail.actions.deleteAria")}
        data-testid="interview-detail-delete"
      >
        <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
        {t("detail.actions.delete")}
      </button>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving || deleting}
          className="inline-flex min-h-11 items-center rounded-md border border-border px-5 py-2.5 font-sans text-sm text-foreground hover:bg-muted disabled:opacity-50"
        >
          {isModal ? tCommon("cancel") : t("detail.actions.discard")}
        </button>
        {isEditable ? (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || deleting || !isDirty}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white hover:bg-vo-purple-hover disabled:opacity-50"
            data-testid="interview-detail-save"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {saving ? t("detail.actions.saving") : t("detail.actions.save")}
          </button>
        ) : null}
      </div>
    </div>
  )

  const withModalShell = (body: ReactNode, footer?: ReactNode) => {
    if (!isModal) return body
    return (
      <Modal
        isOpen={isOpen ?? true}
        onClose={onClose ?? (() => {})}
        title={modalTitle ?? t("modals.detailTitle")}
        size="lg"
        closeOnOverlayClick={false}
        footer={footer}
        footerClassName="justify-between"
      >
        {body}
      </Modal>
    )
  }

  const meetHint = showMeetHint ? (
    <div
      className="rounded-md border border-border bg-muted/50 px-3 py-2 font-sans text-sm text-foreground"
      role="status"
    >
      {calendarStatus.isConnected ? (
        <span>{t("form.calendar.meetWillGenerate")}</span>
      ) : (
        <span>
          {t("form.calendar.meetNotConnected")}{" "}
          <Link
            href="/portal-rrhh/configuracion/calendario"
            className="font-medium text-vo-purple underline-offset-2 hover:underline"
          >
            {t("form.calendar.connectLink")}
          </Link>{" "}
          {t("form.calendar.meetNotConnectedSuffix")}
        </span>
      )}
    </div>
  ) : null

  const sessionLinks = interview ? (
    <InterviewSessionLinks
      interviewId={interview.id}
      scheduledAtUtc={interview.scheduledAtUtc}
      googleMeetUrl={interview.googleMeetUrl}
      meetHint={meetHint}
      compact={isModal}
      onSync={() => void load()}
      onCopyResult={(ok) =>
        setSnackbar({
          open: true,
          variant: ok ? "success" : "error",
          message: ok ? t("detail.meetCopied") : t("detail.meetCopyFailed"),
        })
      }
    />
  ) : null

  if (loading) {
    return withModalShell(
      <div
        className="flex flex-col items-center justify-center gap-3 py-20"
        data-testid="interview-detail-loading"
      >
        <Loader2 className="h-8 w-8 animate-spin text-vo-purple" aria-hidden />
        <p className="font-sans text-sm text-muted-foreground">
          {t("detail.loading")}
        </p>
      </div>
    )
  }

  if (error || !interview) {
    return withModalShell(
      <div className="flex flex-col gap-4">
        <p className="font-sans text-sm text-destructive" role="alert">
          {error ?? t("detail.loadFailed")}
        </p>
        <button
          type="button"
          onClick={() => {
            if (isModal && onClose) onClose()
            else router.push(listHref)
          }}
          className="w-fit rounded-md bg-vo-purple px-4 py-2 font-sans text-sm text-white"
        >
          {isModal && onClose ? t("detail.close") : t("detail.backToList")}
        </button>
      </div>
    )
  }

  const rootClass = isModal
    ? "flex flex-col gap-5"
    : "flex flex-col gap-6 p-4 md:p-8"

  const formFields = (
    <>
      <div className="flex flex-col gap-1.5">
        <span id="detail-when-label" className="font-sans text-sm font-medium">
          {t("detail.fields.dateTime")}
        </span>
        <InterviewScheduleRow
          scheduledLocal={scheduledLocal}
          onScheduledLocalChange={setScheduledLocal}
          durationMinutes={durationMinutes}
          onDurationMinutesChange={setDurationMinutes}
          disabled={!isEditable}
          ariaLabelledBy="detail-when-label"
          dateAriaLabel={t("detail.fields.date")}
          startAriaLabel={t("detail.fields.startTime")}
          endAriaLabel={t("detail.fields.endTime")}
          durationLabel={durationLabel}
          minDate={getTodayDateInputValue()}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="detail-type" className="font-sans text-sm font-medium">
            {t("detail.fields.type")}
          </label>
          {loadingInterviewTypes ? (
            <div className={`flex items-center gap-2 text-muted-foreground ${FIELD_CONTROL}`}>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              {t("form.loadingTypes")}
            </div>
          ) : (
            <select
              id="detail-type"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              disabled={!isEditable}
              className={FIELD_CONTROL}
            >
              <option value="">{t("form.placeholders.typeExample")}</option>
              {interviewTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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
            {t("detail.fields.modality")}
          </label>
          {loadingModalities ? (
            <div className={`flex items-center gap-2 text-muted-foreground ${FIELD_CONTROL}`}>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              {t("form.loadingModalities")}
            </div>
          ) : (
            <select
              id="detail-modality"
              value={interviewModalityId}
              onChange={(e) => setInterviewModalityId(e.target.value)}
              disabled={!isEditable}
              className={FIELD_CONTROL}
            >
              <option value="">{t("form.placeholders.selectModality")}</option>
              {modalityOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
              {!hasModalityOption &&
              interviewModalityId.trim() &&
              interview.interviewModality?.id === interviewModalityId ? (
                <option value={interviewModalityId}>
                  {interview.interviewModality.displayName}
                </option>
              ) : null}
            </select>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="detail-interviewer"
          className="font-sans text-sm font-medium"
        >
          {t("detail.fields.interviewer")}
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
          {t("detail.fields.description")}
        </label>
        <textarea
          id="detail-descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          disabled={!isEditable}
          rows={4}
          placeholder={t("detail.descriptionPlaceholder")}
          className="w-full min-w-0 resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm disabled:opacity-60"
        />
      </div>
    </>
  )

  const body = (
    <div className={rootClass}>
      <div className="flex flex-col gap-3">
        {variant === "page" ? (
          <Link
            href={listHref}
            className="w-fit font-sans text-sm text-muted-foreground hover:text-foreground"
          >
            {t("detail.backToInterviews")}
          </Link>
        ) : null}
        {variant === "page" ? (
          <PortalPageHeader title={t("detail.pageTitle")} className="w-full pb-0" />
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-start sm:gap-x-4">
          <div
            className="min-w-0 space-y-1"
            data-testid="interview-detail-candidate"
          >
            <p className="wrap-break-word font-sans text-base font-semibold leading-snug text-foreground">
              {candidateName}
            </p>
            {candidateEmail ? (
              <p
                className="truncate font-sans text-sm text-muted-foreground"
                title={candidateEmail}
              >
                {candidateEmail}
              </p>
            ) : null}
            <p className="wrap-break-word font-sans text-sm text-muted-foreground">
              {vacancyDisplay || t("detail.vacancyFallback")}
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            {isEditable ? (
              <>
                <label
                  htmlFor="detail-status"
                  className="font-sans text-sm font-medium text-foreground"
                >
                  {t("detail.fields.status")}
                </label>
                <select
                  id="detail-status"
                  value={statusChoice}
                  onChange={(e) =>
                    setStatusChoice(e.target.value as InterviewStatus)
                  }
                  className={FIELD_CONTROL}
                >
                  {statusActions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <span className="font-sans text-sm font-medium text-foreground">
                  {t("detail.fields.status")}
                </span>
                <InterviewStatusBadge
                  status={interview.status}
                  label={interview.statusDisplayName}
                />
              </>
            )}
            {!isEditable ? (
              <p className="font-sans text-xs text-muted-foreground" role="status">
                {t("detail.terminalReadOnly")}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={
          isModal
            ? "flex flex-col gap-5"
            : "grid gap-6 lg:max-w-none lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start"
        }
      >
        <div
          className={
            isModal
              ? "flex flex-col gap-5"
              : "flex flex-col gap-5 rounded-xl border border-border bg-card p-6 lg:max-w-none"
          }
        >
          {isModal ? sessionLinks : null}
          {formFields}
          {!isModal ? actionBar : null}
        </div>

        {!isModal ? (
          <div className="flex flex-col gap-4">{sessionLinks}</div>
        ) : null}
      </div>
    </div>
  )

  const overlays = (
    <>
      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          if (!deleting) setDeleteConfirmOpen(false)
        }}
        onConfirm={() => void handleConfirmDelete()}
        title={t("detail.deleteConfirm.title")}
        message={t("detail.deleteConfirm.message")}
        loading={deleting}
        overlayZIndexClass={isModal ? "z-[100]" : undefined}
      />

      <Snackbar
        open={snackbar.open}
        onClose={handleCloseSnackbar}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </>
  )

  return (
    <>
      {withModalShell(body, isModal ? actionBar : undefined)}
      {overlays}
    </>
  )
}
