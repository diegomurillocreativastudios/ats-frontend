"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react"
import { FileText, Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import Modal from "@/components/ui/Modal"
import Snackbar from "@/components/ui/Snackbar"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  createAdminIdentityDocumentType,
  deleteAdminIdentityDocumentType,
  getAdminIdentityDocumentTypeById,
  listAdminIdentityDocumentTypes,
  updateAdminIdentityDocumentType,
  type IdentityDocumentTypeResponseDto,
  type CreateIdentityDocumentTypeRequestDto,
  type UpdateIdentityDocumentTypeRequestDto,
} from "@/lib/api/admin-identity-document-types"

interface IdentityDocumentTypeFormState {
  code: string
  name: string
}

interface IdentityDocumentTypeFormErrors {
  code?: string
  name?: string
}

const CODE_MAX_LENGTH = 60
const NAME_MAX_LENGTH = 120

function createDefaultFormState(): IdentityDocumentTypeFormState {
  return {
    code: "",
    name: "",
  }
}

function mapItemToFormState(
  item: IdentityDocumentTypeResponseDto
): IdentityDocumentTypeFormState {
  return {
    code: item.code ?? "",
    name: item.name ?? "",
  }
}

function validateForm(
  values: IdentityDocumentTypeFormState
): IdentityDocumentTypeFormErrors {
  const errors: IdentityDocumentTypeFormErrors = {}
  const normalizedCode = values.code.trim()
  const normalizedName = values.name.trim()

  if (normalizedCode === "") {
    errors.code = "El código es requerido."
  } else if (normalizedCode.length > CODE_MAX_LENGTH) {
    errors.code = `El código no puede superar los ${CODE_MAX_LENGTH} caracteres.`
  }

  if (normalizedName === "") {
    errors.name = "El nombre es requerido."
  } else if (normalizedName.length > NAME_MAX_LENGTH) {
    errors.name = `El nombre no puede superar los ${NAME_MAX_LENGTH} caracteres.`
  }

  return errors
}

function buildCreatePayload(
  values: IdentityDocumentTypeFormState
): CreateIdentityDocumentTypeRequestDto {
  return {
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
  }
}

function buildUpdatePayload(
  values: IdentityDocumentTypeFormState
): UpdateIdentityDocumentTypeRequestDto {
  return {
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
  }
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "Sin actualizar"
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateString
  }
}

export function AdminIdentityDocumentTypesContent() {
  const [items, setItems] = useState<IdentityDocumentTypeResponseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [formState, setFormState] = useState<IdentityDocumentTypeFormState>(() =>
    createDefaultFormState()
  )
  const [formErrors, setFormErrors] = useState<IdentityDocumentTypeFormErrors>({})
  const [formLoading, setFormLoading] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formLoadError, setFormLoadError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] =
    useState<IdentityDocumentTypeResponseDto | null>(null)
  const [busyAction, setBusyAction] = useState(false)

  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: "success" | "error" | "warning"
    message: string
  }>({
    open: false,
    variant: "success",
    message: "",
  })

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items

    const lowerSearch = searchTerm.toLowerCase()
    return items.filter(
      (item) =>
        item.code.toLowerCase().includes(lowerSearch) ||
        item.name.toLowerCase().includes(lowerSearch)
    )
  }, [items, searchTerm])

  const showSnackbar = useCallback(
    (variant: "success" | "error" | "warning", message: string) => {
      setSnackbar({ open: true, variant, message })
    },
    []
  )

  const loadList = useCallback(async () => {
    setLoading(true)
    setListError(null)

    try {
      const nextItems = await listAdminIdentityDocumentTypes()
      setItems(nextItems)
    } catch (error) {
      setItems([])
      setListError(
        getApiErrorMessage(error) || "No se pudo cargar el catálogo."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const handleOpenCreate = () => {
    setFormMode("create")
    setEditingItemId(null)
    setFormState(createDefaultFormState())
    setFormErrors({})
    setFormLoadError(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = async (itemId: string) => {
    setFormMode("edit")
    setEditingItemId(itemId)
    setFormErrors({})
    setFormLoadError(null)
    setFormLoading(true)
    setIsFormOpen(true)

    try {
      const detail = await getAdminIdentityDocumentTypeById(itemId)
      setFormState(mapItemToFormState(detail))
    } catch (error) {
      setFormLoadError(
        getApiErrorMessage(error) || "No se pudo cargar el tipo de documento."
      )
    } finally {
      setFormLoading(false)
    }
  }

  const handleCloseForm = () => {
    if (formSubmitting || formLoading) return
    setIsFormOpen(false)
    setEditingItemId(null)
    setFormLoadError(null)
    setFormErrors({})
  }

  const handleCodeChange = (nextValue: string) => {
    const uppercasedValue = nextValue.toUpperCase()
    setFormState((current) => ({ ...current, code: uppercasedValue }))
    setFormErrors((current) => ({ ...current, code: undefined }))
  }

  const handleNameChange = (nextValue: string) => {
    setFormState((current) => ({ ...current, name: nextValue }))
    setFormErrors((current) => ({ ...current, name: undefined }))
  }

  const handleSubmitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (formSubmitting) return

    const validationErrors = validateForm(formState)
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      return
    }

    setFormSubmitting(true)

    try {
      if (formMode === "create") {
        const payload = buildCreatePayload(formState)
        await createAdminIdentityDocumentType(payload)
        showSnackbar("success", "Tipo de documento creado correctamente.")
      } else if (editingItemId) {
        const payload = buildUpdatePayload(formState)
        await updateAdminIdentityDocumentType(editingItemId, payload)
        showSnackbar("success", "Tipo de documento actualizado correctamente.")
      }

      setIsFormOpen(false)
      await loadList()
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      showSnackbar("error", errorMessage || "No se pudo guardar el registro.")
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setBusyAction(true)

    try {
      await deleteAdminIdentityDocumentType(deleteTarget.id)
      setDeleteTarget(null)
      showSnackbar("success", "Tipo de documento eliminado correctamente.")
      await loadList()
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? (error as { status?: number }).status
          : undefined

      if (status === 403) {
        showSnackbar(
          "error",
          "No tienes permisos para realizar esta acción."
        )
      } else {
        const errorMessage = getApiErrorMessage(error)
        showSnackbar(
          "error",
          errorMessage || "No se pudo eliminar el registro."
        )
      }
    } finally {
      setBusyAction(false)
    }
  }

  const isEmpty = !loading && !listError && filteredItems.length === 0
  const loadingGridClassName =
    "grid animate-pulse grid-cols-[1fr_1.5fr_180px_180px_120px] gap-3 rounded-lg border border-border/60 bg-muted/30 p-4"
  const tableMinWidthClassName = "min-w-[800px]"

  return (
    <main
      className="flex min-h-0 flex-1 flex-col overflow-auto p-6 md:p-8"
      aria-labelledby="portal-admin-identity-document-types-heading"
    >
      <PortalPageHeader
        id="portal-admin-identity-document-types-heading"
        title="Tipos de Documento"
        description="Administra los tipos de documento disponibles para los candidatos."
        className="mb-6"
        contentClassName="max-w-3xl"
        actions={
          <Button type="button" variant="primary" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo tipo de documento
          </Button>
        }
      />

      <section
        className="mb-5 rounded-xl border border-border bg-card p-4 shadow-sm"
        aria-label="Resumen de tipos de documento"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm text-foreground">
              {loading
                ? "Cargando..."
                : `${filteredItems.length} tipo${filteredItems.length !== 1 ? "s" : ""} de documento`}
            </span>
            <span className="text-sm text-muted-foreground">
              Gestiona tipos de documento disponibles para candidatos.
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-10 px-4"
            onClick={() => void loadList()}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refrescar
          </Button>
        </div>
      </section>

      {!listError ? (
        <section className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-input bg-white py-2 pl-10 pr-4 text-sm text-black placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-vo-purple"
            />
          </div>
        </section>
      ) : null}

      {listError ? (
        <section
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"
          aria-label="Error al cargar tipos de documento"
        >
          <p className="font-sans text-sm text-destructive" role="alert">
            {listError || "No se pudo cargar el catálogo."}
          </p>
          <div className="mt-4">
            <Button type="button" variant="primary" onClick={() => void loadList()}>
              Reintentar
            </Button>
          </div>
        </section>
      ) : null}

      {!listError ? (
        <section
          className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          aria-label="Listado de tipos de documento"
        >
          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className={loadingGridClassName}>
                  <div className="h-5 rounded bg-muted" />
                  <div className="h-5 rounded bg-muted" />
                  <div className="h-5 rounded bg-muted" />
                  <div className="h-5 rounded bg-muted" />
                  <div className="h-5 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-vo-purple/10">
                <FileText className="h-8 w-8 text-vo-purple" aria-hidden />
              </div>
              <div className="space-y-2">
                <h2 className="font-sans text-lg font-semibold text-foreground">
                  {searchTerm
                    ? "No se encontraron resultados"
                    : "No hay tipos de documento registrados"}
                </h2>
                <p className="max-w-lg font-sans text-sm text-muted-foreground">
                  {searchTerm
                    ? "Intenta buscar con otros términos."
                    : "Cuando crees un tipo de documento, quedará disponible para clasificar documentos de identidad de candidatos."}
                </p>
              </div>
              {!searchTerm ? (
                <Button type="button" variant="primary" onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Nuevo tipo de documento
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className={`${tableMinWidthClassName} w-full text-left font-sans text-sm`}
              >
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-foreground">Código</th>
                    <th className="px-4 py-3 font-medium text-foreground">Nombre</th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      Fecha de creación
                    </th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      Última actualización
                    </th>
                    <th className="px-4 py-3 font-medium text-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex items-center rounded-md bg-vo-purple/10 px-2.5 py-0.5 text-xs font-medium text-vo-purple">
                          {item.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-foreground">{item.name}</p>
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {formatDateTime(item.createdAtUtc)}
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {formatDateTime(item.updatedAtUtc)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-3 py-0 text-xs"
                            onClick={() => void handleOpenEdit(item.id)}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-3 py-0 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <Modal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        title={
          formMode === "create"
            ? "Nuevo tipo de documento"
            : "Editar tipo de documento"
        }
        size="lg"
        closeOnEscape={!formSubmitting && !formLoading}
        closeOnOverlayClick={!formSubmitting && !formLoading}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseForm}
              disabled={formSubmitting || formLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="identity-document-type-form"
              variant="primary"
              loading={formSubmitting}
              disabled={formSubmitting || formLoading}
            >
              {formMode === "create" ? "Guardar" : "Guardar cambios"}
            </Button>
          </div>
        }
      >
        {formLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Cargando tipo de documento...
          </div>
        ) : formLoadError ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive" role="alert">
              {formLoadError}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!editingItemId) return
                void handleOpenEdit(editingItemId)
              }}
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <form
            id="identity-document-type-form"
            className="space-y-5"
            onSubmit={handleSubmitForm}
          >
            <Input
              id="identity-document-type-code"
              name="code"
              label="Código"
              required
              value={formState.code}
              error={formErrors.code || ""}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleCodeChange(event.target.value)
              }
              placeholder="Ej. DUI, PASSPORT, NIT"
              disabled={formSubmitting}
              maxLength={CODE_MAX_LENGTH}
            />

            <Input
              id="identity-document-type-name"
              name="name"
              label="Nombre"
              required
              value={formState.name}
              error={formErrors.name || ""}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleNameChange(event.target.value)
              }
              placeholder="Ej. Documento Único de Identidad"
              disabled={formSubmitting}
              maxLength={NAME_MAX_LENGTH}
            />
          </form>
        )}
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteTarget != null}
        onClose={() => !busyAction && setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
        title="Eliminar tipo de documento"
        message={
          deleteTarget
            ? `¿Seguro que deseas eliminar este tipo de documento? Esta acción lo ocultará de los listados activos.`
            : ""
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        loading={busyAction}
      />

      <Snackbar
        open={snackbar.open}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </main>
  )
}
