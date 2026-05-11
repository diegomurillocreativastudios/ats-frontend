"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal"
import Snackbar from "@/components/ui/Snackbar"
import {
  createInterviewType,
  deleteInterviewType,
  getInterviewHttpErrorMessage,
  listInterviewTypesAdmin,
  slugifyInterviewTypeCode,
  updateInterviewType,
  type InterviewTypeAdmin,
} from "@/lib/api/interviews"

export interface InterviewTypesCrudModalProps {
  isOpen: boolean
  onClose: () => void
  /** Se llama tras crear, editar o eliminar (p. ej. invalidar caché en otro módulo). */
  onMutate?: () => void
}

export function InterviewTypesCrudModal({
  isOpen,
  onClose,
  onMutate,
}: InterviewTypesCrudModalProps) {
  const [items, setItems] = useState<InterviewTypeAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<InterviewTypeAdmin | null>(
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

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listInterviewTypesAdmin()
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
    setNewName("")
    setEditingId(null)
    setEditName("")
    setDeleteTarget(null)
    setError(null)
  }, [isOpen, loadList])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    setError(null)
    try {
      await createInterviewType({ name })
      setNewName("")
      await loadList()
      onMutate?.()
      showSnackbar("success", "Tipo de entrevista creado correctamente.")
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

  const handleStartEdit = (row: InterviewTypeAdmin) => {
    setEditingId(row.id)
    setEditName(row.name)
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName("")
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    const name = editName.trim()
    if (!name) return
    setSaving(true)
    setError(null)
    try {
      const row = items.find((r) => r.id === editingId)
      const code =
        row?.code?.trim() || slugifyInterviewTypeCode(name)
      await updateInterviewType(editingId, { name, code })
      setEditingId(null)
      setEditName("")
      await loadList()
      onMutate?.()
      showSnackbar("success", "Tipo de entrevista actualizado correctamente.")
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
      await deleteInterviewType(deleteTarget.id)
      setDeleteTarget(null)
      await loadList()
      onMutate?.()
      showSnackbar("success", "Tipo de entrevista eliminado correctamente.")
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Tipos de entrevista"
        footer={footer}
        size="lg"
        closeOnOverlayClick={!saving && !deleting}
        closeOnEscape={!saving && !deleting}
      >
        <div className="flex flex-col gap-5">
          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3"
            aria-label="Crear tipo de entrevista"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label
                htmlFor="new-interview-type-name"
                className="font-sans text-sm font-medium text-foreground"
              >
                Nuevo tipo
              </label>
              <input
                id="new-interview-type-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre del tipo"
                className="h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm"
                disabled={saving || loading}
                autoComplete="off"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={loading || !newName.trim()}
              className="shrink-0 px-5 py-2.5"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Añadir
            </Button>
          </form>

          {error ? (
            <p className="font-sans text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 font-sans text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Cargando tipos…
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center font-sans text-sm text-muted-foreground">
              No hay tipos definidos. Añade el primero arriba.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[280px] border-collapse text-left font-sans text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Nombre
                    </th>
                    <th scope="col" className="w-[1%] whitespace-nowrap px-3 py-2 font-semibold">
                      Acciones
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
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-9 w-full min-w-48 rounded-md border border-input bg-background px-2 font-sans text-sm"
                            disabled={saving}
                            aria-label="Editar nombre del tipo"
                          />
                        ) : (
                          <span className="text-foreground">{row.name}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {editingId === row.id ? (
                          <div className="ml-auto flex min-w-26 max-w-40 flex-col items-stretch gap-2">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={
                                saving || !editName.trim() || !editingId
                              }
                              className="w-full rounded-md bg-vo-purple px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-vo-purple-hover disabled:opacity-50"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className="w-full rounded-md border border-border px-3 py-1.5 text-center text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(row)}
                              disabled={saving || !!editingId}
                              className="inline-flex items-center gap-1 rounded-md border border-border p-1.5 text-foreground hover:bg-muted disabled:opacity-50"
                              aria-label={`Editar ${row.name}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(row)}
                              disabled={saving || !!editingId}
                              className="inline-flex items-center gap-1 rounded-md border border-border p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                              aria-label={`Eliminar ${row.name}`}
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
        title="Eliminar tipo de entrevista"
        message={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.name}»? Esta acción no se puede deshacer.`
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
