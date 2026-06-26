"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import Modal from "@/components/ui/Modal"
import Snackbar from "@/components/ui/Snackbar"
import {
  getInterviewHttpErrorMessage,
  patchRecruiterInterviewNotes,
} from "@/lib/api/interviews"

export interface InterviewNotesModalProps {
  isOpen: boolean
  onClose: () => void
  interviewId: string | null
  initialNotes: string | null
  /** Línea de contexto bajo el título (ej. candidato o fecha). */
  contextLine?: string | null
  onSaved?: () => void
}

export function InterviewNotesModal({
  isOpen,
  onClose,
  interviewId,
  initialNotes,
  contextLine,
  onSaved,
}: InterviewNotesModalProps) {
  const t = useTranslations("RecruiterPortal.interviews.modals")
  const tCommon = useTranslations("Common")
  const tToasts = useTranslations("RecruiterPortal.interviews.toasts")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: "success" | "error"
    message: string
  }>({ open: false, variant: "success", message: "" })

  useEffect(() => {
    if (!isOpen || !interviewId) return
    setNotes(initialNotes?.trim() ? initialNotes : "")
    setError(null)
  }, [isOpen, interviewId, initialNotes])

  const handleSave = useCallback(async () => {
    if (!interviewId) return
    setSaving(true)
    setError(null)
    try {
      await patchRecruiterInterviewNotes(interviewId, notes.trim())
      if (onSaved) {
        onSaved()
      } else {
        setSnackbar({
          open: true,
          variant: "success",
          message: tToasts("notesSaved"),
        })
      }
      onClose()
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : 0
      const msg = getInterviewHttpErrorMessage(status ?? 0, err)
      setError(msg)
      setSnackbar({ open: true, variant: "error", message: msg })
    } finally {
      setSaving(false)
    }
  }, [interviewId, notes, onClose, onSaved, tToasts])

  if (!interviewId) return null

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose()
      }}
      title={t("notesTitle")}
      size="md"
      closeOnOverlayClick={!saving}
      overlayZIndexClass="z-[100]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center rounded-md border border-border px-4 py-2 font-sans text-sm text-foreground hover:bg-muted disabled:opacity-50"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2 font-sans text-sm font-medium text-white hover:bg-vo-purple-hover disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {saving ? t("notesSaving") : t("notesSave")}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {contextLine ? (
          <p className="font-sans text-sm text-muted-foreground">{contextLine}</p>
        ) : null}
        {error ? (
          <p className="font-sans text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <label htmlFor="interview-notes-modal-field" className="font-sans text-sm font-medium">
          {t("notesField")}
        </label>
        <textarea
          id="interview-notes-modal-field"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
          disabled={saving}
          placeholder={t("notesPlaceholder")}
          className="resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm disabled:opacity-60"
        />
      </div>
    </Modal>
    <Snackbar
      open={snackbar.open}
      onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      variant={snackbar.variant}
      message={snackbar.message}
    />
    </>
  )
}
