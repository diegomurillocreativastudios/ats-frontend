"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal"
import Snackbar from "@/components/ui/Snackbar"
import {
  createInterviewStatus,
  deleteInterviewStatus,
  getInterviewHttpErrorMessage,
  listInterviewStatusesAdmin,
  updateInterviewStatus,
  type InterviewStatusAdmin,
} from "@/lib/api/interviews"

export interface InterviewStatusesCrudModalProps {
  isOpen: boolean
  onClose: () => void
  onMutate?: () => void
}

export function InterviewStatusesCrudModal({
  isOpen,
  onClose,
  onMutate,
}: InterviewStatusesCrudModalProps) {
  const [items, setItems] = useState<InterviewStatusAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newDisplayName, setNewDisplayName] = useState("")
  const [newIsTerminal, setNewIsTerminal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editIsTerminal, setEditIsTerminal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InterviewStatusAdmin | null>(
    null
  )
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

  /** Siguiente código = cantidad de filas + 1 (alta coherente con índices 1…n en tabla). */
  const nextSuggestedCode = useMemo(
    () => String(items.length + 1),
    [items.length]
  )

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listInterviewStatusesAdmin()
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
    setNewIsTerminal(false)
    setEditingId(null)
    setEditIsTerminal(false)
    setDeleteTarget(null)
    setError(null)
  }, [isOpen, loadList])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = nextSuggestedCode.trim()
    const displayName = newDisplayName.trim()
    const codeNum = parseInt(code, 10)
    if (!displayName || !Number.isFinite(codeNum) || codeNum < 1) return
    setSaving(true)
    setError(null)
    try {
      await createInterviewStatus({
        code,
        displayName,
        description: null,
        isTerminal: newIsTerminal,
        isActive: true,
      })
      setNewDisplayName("")
      setNewIsTerminal(false)
      await loadList()
      onMutate?.()
      showSnackbar("success", "Estado de entrevista creado correctamente.")
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

  const handleStartEdit = (row: InterviewStatusAdmin) => {
    setEditingId(row.id)
    setEditDisplayName(row.displayName)
    setEditIsTerminal(row.isTerminal)
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    const displayName = editDisplayName.trim()
    if (!displayName) return
    setSaving(true)
    setError(null)
    try {
      await updateInterviewStatus(editingId, {
        displayName,
        isTerminal: editIsTerminal,
      })
      setEditingId(null)
      await loadList()
      onMutate?.()
      showSnackbar("success", "Estado de entrevista actualizado correctamente.")
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
      await deleteInterviewStatus(deleteTarget.id)
      setDeleteTarget(null)
      await loadList()
      onMutate?.()
      showSnackbar("success", "Estado de entrevista eliminado correctamente.")
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
      Cerrar
    </Button>
  )

  const canCreate =
    newDisplayName.trim() !== "" &&
    !loading &&
    Number.isFinite(parseInt(nextSuggestedCode, 10)) &&
    parseInt(nextSuggestedCode, 10) >= 1

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Estados de entrevista"
        footer={footer}
        size="lg"
        closeOnOverlayClick={!saving && !deleting}
        closeOnEscape={!saving && !deleting}
        bodyClassName="overflow-x-auto"
      >
        <div className="flex min-w-0 flex-col gap-5">
          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4"
            aria-label="Crear estado de entrevista"
          >
            <p className="font-inter text-sm font-medium text-foreground">
              Nuevo estado
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label
                  htmlFor="new-interview-status-display"
                  className="font-inter text-sm font-medium text-foreground"
                >
                  Nombre visible <span className="text-vo-pink">*</span>
                </label>
                <input
                  id="new-interview-status-display"
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="ej: Programada"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 font-inter text-sm"
                  disabled={saving || loading}
                  autoComplete="off"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                disabled={loading || !canCreate}
                className="shrink-0 px-5 py-2.5"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Añadir
              </Button>
            </div>
            <div className="flex items-start gap-2">
              <input
                id="new-interview-status-terminal"
                type="checkbox"
                checked={newIsTerminal}
                onChange={(e) => setNewIsTerminal(e.target.checked)}
                disabled={saving || loading}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-vo-purple focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              />
              <label
                htmlFor="new-interview-status-terminal"
                className="font-inter text-sm leading-snug text-foreground"
              >
                Estado terminal
                <span className="mt-0.5 block font-inter text-xs font-normal text-muted-foreground">
                  Marca si este estado cierra el ciclo de la entrevista (p. ej.
                  completada o cancelada).
                </span>
              </label>
            </div>
          </form>

          {error ? (
            <p className="font-inter text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 font-inter text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Cargando estados…
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center font-inter text-sm text-muted-foreground">
              No hay estados definidos. Añade el primero arriba.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[420px] border-collapse text-left font-inter text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Código
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Nombre
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Terminal
                    </th>
                    <th scope="col" className="w-[1%] whitespace-nowrap px-3 py-2 font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, index) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-3 py-2 align-middle font-mono text-xs tabular-nums text-foreground">
                        <span
                          className={
                            editingId === row.id ? "text-muted-foreground" : undefined
                          }
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="max-w-[240px] px-3 py-2 align-middle">
                        {editingId === row.id ? (
                          <input
                            type="text"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            className="h-9 w-full min-w-40 rounded-md border border-input bg-background px-2 font-inter text-sm"
                            disabled={saving}
                            aria-label="Nombre visible"
                          />
                        ) : (
                          <span className="text-foreground">{row.displayName}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {editingId === row.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              id={`edit-interview-status-terminal-${row.id}`}
                              type="checkbox"
                              checked={editIsTerminal}
                              onChange={(e) =>
                                setEditIsTerminal(e.target.checked)
                              }
                              disabled={saving}
                              className="h-4 w-4 shrink-0 rounded border-input text-vo-purple focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                              aria-label="Estado terminal"
                            />
                            <label
                              htmlFor={`edit-interview-status-terminal-${row.id}`}
                              className="font-inter text-xs text-muted-foreground"
                            >
                              Terminal
                            </label>
                          </div>
                        ) : (
                          <span className="text-foreground">
                            {row.isTerminal ? "Sí" : "No"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {editingId === row.id ? (
                            <>
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={
                                  saving || !editDisplayName.trim() || !editingId
                                }
                                className="rounded-md bg-vo-purple px-3 py-1.5 text-xs font-medium text-white hover:bg-vo-purple-hover disabled:opacity-50"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(row)}
                                disabled={saving || !!editingId}
                                className="inline-flex items-center gap-1 rounded-md border border-border p-1.5 text-foreground hover:bg-muted disabled:opacity-50"
                                aria-label={`Editar ${row.displayName}`}
                              >
                                <Pencil className="h-4 w-4" aria-hidden />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(row)}
                                disabled={saving || !!editingId}
                                className="inline-flex items-center gap-1 rounded-md border border-border p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                aria-label={`Eliminar ${row.displayName}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </button>
                            </div>
                          )}
                        </div>
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
        title="Eliminar estado de entrevista"
        message={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.displayName}»? Solo se permitirá si no hay entrevistas usando este estado.`
            : ""
        }
        confirmText="Eliminar"
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
