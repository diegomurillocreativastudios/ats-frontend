"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal"
import Snackbar from "@/components/ui/Snackbar"
import {
  createInterviewModality,
  deleteInterviewModality,
  getInterviewHttpErrorMessage,
  listInterviewModalitiesAdmin,
  updateInterviewModality,
  type InterviewModalityAdmin,
} from "@/lib/api/interviews"

export interface InterviewModalitiesCrudModalProps {
  isOpen: boolean
  onClose: () => void
  onMutate?: () => void
}

export function InterviewModalitiesCrudModal({
  isOpen,
  onClose,
  onMutate,
}: InterviewModalitiesCrudModalProps) {
  const t = useTranslations("RecruiterPortal.interviews.crud.modalities")
  const tCommon = useTranslations("RecruiterPortal.interviews.crud.common")
  const [items, setItems] = useState<InterviewModalityAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newDisplayName, setNewDisplayName] = useState("")
  const [newIncludeGoogleMeetLink, setNewIncludeGoogleMeetLink] =
    useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editIncludeGoogleMeetLink, setEditIncludeGoogleMeetLink] =
    useState(false)
  const [deleteTarget, setDeleteTarget] =
    useState<InterviewModalityAdmin | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: "success" | "error"
    message: string
  }>({
    open: false,
    variant: "success",
    message: "",
  })

  const showSnackbar = useCallback(
    (variant: "success" | "error", message: string) => {
      setSnackbar({ open: true, variant, message })
    },
    []
  )

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listInterviewModalitiesAdmin()
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
  }, [])

  useEffect(() => {
    if (!isOpen) return
    loadList()
    setNewDisplayName("")
    setNewIncludeGoogleMeetLink(false)
    setEditingId(null)
    setEditDisplayName("")
    setEditIncludeGoogleMeetLink(false)
    setDeleteTarget(null)
    setError(null)
  }, [isOpen, loadList])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const displayName = newDisplayName.trim()
    if (!displayName) return
    setSaving(true)
    setError(null)
    try {
      await createInterviewModality({
        displayName,
        includeGoogleMeetLink: newIncludeGoogleMeetLink,
      })
      setNewDisplayName("")
      setNewIncludeGoogleMeetLink(false)
      await loadList()
      onMutate?.()
      showSnackbar("success", t("created"))
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : 0
      const message = getInterviewHttpErrorMessage(status ?? 0, err)
      setError(message)
      showSnackbar("error", message)
    } finally {
      setSaving(false)
    }
  }

  const handleStartEdit = (row: InterviewModalityAdmin) => {
    setEditingId(row.id)
    setEditDisplayName(row.displayName)
    setEditIncludeGoogleMeetLink(row.includeGoogleMeetLink)
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditDisplayName("")
    setEditIncludeGoogleMeetLink(false)
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    const displayName = editDisplayName.trim()
    if (!displayName) return
    setSaving(true)
    setError(null)
    try {
      await updateInterviewModality(editingId, {
        displayName,
        includeGoogleMeetLink: editIncludeGoogleMeetLink,
      })
      setEditingId(null)
      setEditDisplayName("")
      setEditIncludeGoogleMeetLink(false)
      await loadList()
      onMutate?.()
      showSnackbar("success", t("updated"))
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : 0
      const message = getInterviewHttpErrorMessage(status ?? 0, err)
      setError(message)
      showSnackbar("error", message)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      await deleteInterviewModality(deleteTarget.id)
      setDeleteTarget(null)
      await loadList()
      onMutate?.()
      showSnackbar("success", t("deleted"))
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : 0
      const message = getInterviewHttpErrorMessage(status ?? 0, err)
      setError(message)
      showSnackbar("error", message)
    } finally {
      setDeleting(false)
    }
  }

  const footer = (
    <Button type="button" variant="outline" onClick={onClose}>
      {tCommon("close")}
    </Button>
  )

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t("title")}
        footer={footer}
        size="lg"
        closeOnOverlayClick={!saving && !deleting}
        closeOnEscape={!saving && !deleting}
      >
        <div className="flex flex-col gap-5">
          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-3"
            aria-label={t("createAria")}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label
                  htmlFor="new-interview-modality-display-name"
                  className="font-sans text-sm font-medium text-foreground"
                >
                  {t("newLabel")}
                </label>
                <input
                  id="new-interview-modality-display-name"
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm"
                  disabled={saving || loading}
                  autoComplete="off"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                disabled={loading || !newDisplayName.trim()}
                className="shrink-0 px-5 py-2.5"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {tCommon("add")}
              </Button>
            </div>
            
          </form>

          {error ? (
            <p className="font-sans text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 font-sans text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              {t("loading")}
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center font-sans text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[360px] border-collapse text-left font-sans text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th scope="col" className="px-3 py-2 font-semibold">
                      {tCommon("name")}
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      {t("googleMeet")}
                    </th>
                    <th
                      scope="col"
                      className="w-[1%] whitespace-nowrap px-3 py-2 font-semibold"
                    >
                      {tCommon("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-3 py-2 align-middle">
                        {editingId === row.id ? (
                          <input
                            type="text"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            className="h-9 w-full min-w-48 rounded-md border border-input bg-background px-2 font-sans text-sm"
                            disabled={saving}
                            aria-label={t("editNameAria")}
                          />
                        ) : (
                          <span className="text-foreground">
                            {row.displayName}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {editingId === row.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              id={`edit-interview-modality-google-meet-${row.id}`}
                              type="checkbox"
                              checked={editIncludeGoogleMeetLink}
                              onChange={(e) =>
                                setEditIncludeGoogleMeetLink(e.target.checked)
                              }
                              disabled={saving}
                              className="h-4 w-4 shrink-0 rounded border-input text-vo-purple focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                              aria-label={t("meetAria")}
                            />
                            <label
                              htmlFor={`edit-interview-modality-google-meet-${row.id}`}
                              className="font-sans text-xs text-muted-foreground"
                            >
                              {t("meetLabel")}
                            </label>
                          </div>
                        ) : (
                          <span className="text-foreground">
                            {row.includeGoogleMeetLink ? tCommon("yes") : tCommon("no")}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {editingId === row.id ? (
                          <div className="ml-auto flex min-w-26 max-w-40 flex-col items-stretch gap-2">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={
                                saving ||
                                !editDisplayName.trim() ||
                                !editingId
                              }
                              className="w-full rounded-md bg-vo-purple px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-vo-purple-hover disabled:opacity-50"
                            >
                              {tCommon("save")}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className="w-full rounded-md border border-border px-3 py-1.5 text-center text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                            >
                              {tCommon("cancel")}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(row)}
                              disabled={saving || !!editingId}
                              className="inline-flex items-center gap-1 rounded-md border border-border p-1.5 text-foreground hover:bg-muted disabled:opacity-50"
                              aria-label={tCommon("editAria", { name: row.displayName })}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(row)}
                              disabled={saving || !!editingId}
                              className="inline-flex items-center gap-1 rounded-md border border-border p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                              aria-label={tCommon("deleteAria", { name: row.displayName })}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t("deleteTitle")}
        message={
          deleteTarget
            ? t("deleteMessage", { name: deleteTarget.displayName })
            : ""
        }
        confirmText={tCommon("delete")}
        loading={deleting}
      />
      <Snackbar
        open={snackbar.open}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </>
  )
}
