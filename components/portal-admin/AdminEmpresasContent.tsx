"use client"

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import {
  ChevronLeft,
  ChevronRight,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react"
import Modal from "@/components/ui/Modal"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  createAdminCompany,
  fetchAdminCompaniesList,
  fetchAdminCompanyById,
  updateAdminCompany,
  type AdminCompany,
  type AdminCompanyFormValues,
} from "@/lib/api/admin-companies"

interface CompanyFormState {
  name: string
  industry: string
  isActive: boolean
}

interface CompanyFormErrors {
  name?: string
}

const checkboxVoClass =
  "h-4 w-4 shrink-0 rounded border border-input accent-vo-purple text-vo-purple focus:outline-none focus:ring-2 focus:ring-vo-purple/50 focus:ring-offset-1 disabled:opacity-50"

const emptyFormState = (): CompanyFormState => ({
  name: "",
  industry: "",
  isActive: true,
})

function formatCreatedAt(value: string): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })
}

function companyToFormState(company: AdminCompany): CompanyFormState {
  return {
    name: company.name,
    industry: company.industry ?? "",
    isActive: company.isActive,
  }
}

function buildPayload(state: CompanyFormState): AdminCompanyFormValues {
  return {
    name: state.name.trim(),
    industry: state.industry.trim() || undefined,
    isActive: state.isActive,
  }
}

function validateForm(state: CompanyFormState): CompanyFormErrors {
  const errors: CompanyFormErrors = {}
  if (!state.name.trim()) {
    errors.name = "El nombre es obligatorio."
  }
  return errors
}

export default function AdminEmpresasContent() {
  const [items, setItems] = useState<AdminCompany[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filterIncludeInactive, setFilterIncludeInactive] = useState(false)
  const [appliedIncludeInactive, setAppliedIncludeInactive] = useState(false)

  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [formState, setFormState] = useState<CompanyFormState>(emptyFormState)
  const [formErrors, setFormErrors] = useState<CompanyFormErrors>({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formLoadError, setFormLoadError] = useState<string | null>(null)
  const [editMeta, setEditMeta] = useState<{
    companyId: string
    createdAt: string
  } | null>(null)

  const [togglingCompanyIds, setTogglingCompanyIds] = useState<Set<string>>(
    () => new Set()
  )

  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: "success" | "error"
    message: string
  }>({ open: false, variant: "success", message: "" })

  const showSnackbar = (variant: "success" | "error", message: string) => {
    setSnackbar({ open: true, variant, message })
  }

  const loadList = useCallback(async () => {
    setLoading(true)
    setListError(null)
    try {
      const res = await fetchAdminCompaniesList({
        page,
        pageSize,
        includeInactive: appliedIncludeInactive,
      })
      setItems(res.items)
      setTotalCount(res.totalCount)
      if (res.page !== page) setPage(res.page)
    } catch (err: unknown) {
      const rec = err as { status?: number }
      const msg = getApiErrorMessage(err)
      setListError(
        rec.status === 403
          ? "No tenés permisos para listar empresas (se requiere rol Admin en el API)."
          : msg
      )
      setItems([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, appliedIncludeInactive])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const applyFilters = () => {
    setAppliedIncludeInactive(filterIncludeInactive)
    setPage(1)
  }

  const clearFilters = () => {
    setFilterIncludeInactive(false)
    setAppliedIncludeInactive(false)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1)

  const handleOpenCreate = () => {
    setFormMode("create")
    setEditingCompanyId(null)
    setEditMeta(null)
    setFormState(emptyFormState())
    setFormErrors({})
    setFormLoadError(null)
    setFormLoading(false)
    setFormOpen(true)
  }

  const handleOpenEdit = async (companyId: string) => {
    setFormMode("edit")
    setEditingCompanyId(companyId)
    setFormOpen(true)
    setFormLoading(true)
    setFormLoadError(null)
    setFormErrors({})
    setEditMeta(null)

    try {
      const company = await fetchAdminCompanyById(companyId)
      setFormState(companyToFormState(company))
      setEditMeta({
        companyId: company.companyId,
        createdAt: company.createdAt,
      })
    } catch (err: unknown) {
      setFormLoadError(getApiErrorMessage(err) || "No se pudo cargar la empresa.")
    } finally {
      setFormLoading(false)
    }
  }

  const handleCloseForm = () => {
    if (formSubmitting || formLoading) return
    setFormOpen(false)
    setEditingCompanyId(null)
    setEditMeta(null)
    setFormLoadError(null)
  }

  const handleSubmitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (formSubmitting || formLoading) return

    const validationErrors = validateForm(formState)
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      return
    }

    const payload = buildPayload(formState)
    setFormSubmitting(true)

    try {
      if (formMode === "create") {
        const created = await createAdminCompany(payload)
        showSnackbar("success", `Empresa creada. ID: ${created.companyId}`)
      } else if (editingCompanyId) {
        await updateAdminCompany(editingCompanyId, payload)
        showSnackbar("success", "Empresa actualizada.")
      }

      setFormOpen(false)
      await loadList()
    } catch (err: unknown) {
      showSnackbar(
        "error",
        getApiErrorMessage(err) || "No se pudo guardar la empresa."
      )
    } finally {
      setFormSubmitting(false)
    }
  }

  const setRowToggling = (companyId: string, busy: boolean) => {
    setTogglingCompanyIds((current) => {
      const next = new Set(current)
      if (busy) next.add(companyId)
      else next.delete(companyId)
      return next
    })
  }

  const handleToggleActive = async (company: AdminCompany) => {
    if (togglingCompanyIds.has(company.companyId)) return

    const nextIsActive = !company.isActive
    setRowToggling(company.companyId, true)

    try {
      await updateAdminCompany(company.companyId, {
        name: company.name,
        industry: company.industry,
        isActive: nextIsActive,
      })
      showSnackbar(
        "success",
        nextIsActive ? "Empresa activada." : "Empresa desactivada."
      )
      await loadList()
    } catch (err: unknown) {
      showSnackbar(
        "error",
        getApiErrorMessage(err) || "No se pudo actualizar el estado."
      )
    } finally {
      setRowToggling(company.companyId, false)
    }
  }

  const isEmpty = !loading && !listError && items.length === 0

  return (
    <main
      className="flex min-h-0 flex-1 flex-col overflow-auto p-6 md:p-8"
      aria-labelledby="portal-admin-empresas-heading"
    >
      <PortalPageHeader
        id="portal-admin-empresas-heading"
        title="Empresas"
        description="Gestión de clientes (tenants). Al crear una empresa se siembran estados y etapas de pipeline automáticamente."
        className="mb-6"
        contentClassName="max-w-3xl"
        actions={
          <Button type="button" variant="primary" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Crear empresa
          </Button>
        }
      />

      <section
        className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm"
        aria-label="Filtros"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex cursor-pointer items-center gap-2 font-sans text-sm text-foreground">
            <input
              type="checkbox"
              checked={filterIncludeInactive}
              onChange={(e) => setFilterIncludeInactive(e.target.checked)}
              className={checkboxVoClass}
            />
            Incluir inactivas
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" onClick={applyFilters}>
              Aplicar filtros
            </Button>
            <Button type="button" variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>
        </div>
      </section>

      {listError ? (
        <div
          className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 font-sans text-sm text-destructive"
          role="alert"
        >
          {listError}
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => void loadList()}
            >
              Reintentar
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-sm text-muted-foreground">
          {loading
            ? "Cargando…"
            : `${totalCount} empresa${totalCount === 1 ? "" : "s"}`}
        </p>
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-muted-foreground">
            Por página
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="h-9 rounded-md border border-border bg-card px-2 text-sm"
            aria-label="Tamaño de página"
          >
            {[20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            className="h-9 px-3"
            onClick={() => void loadList()}
            aria-label="Refrescar listado"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        {isEmpty ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-vo-purple/10">
              <Landmark className="h-8 w-8 text-vo-purple" aria-hidden />
            </div>
            <div className="space-y-2">
              <h2 className="font-sans text-lg font-semibold text-foreground">
                Aún no hay empresas
              </h2>
              <p className="max-w-lg font-sans text-sm text-muted-foreground">
                {appliedIncludeInactive
                  ? "No hay empresas registradas con los filtros actuales."
                  : "No hay empresas activas. Marcá «Incluir inactivas» o creá una nueva."}
              </p>
            </div>
            <Button type="button" variant="primary" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              Crear empresa
            </Button>
          </div>
        ) : (
          <table className="w-full min-w-[800px] font-sans text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium text-foreground">Nombre</th>
                <th className="px-4 py-3 font-medium text-foreground">Industria</th>
                <th className="px-4 py-3 font-medium text-foreground">Estado</th>
                <th className="px-4 py-3 font-medium text-foreground">Creada</th>
                <th className="px-4 py-3 font-medium text-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-vo-purple" aria-hidden />
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const isRowToggling = togglingCompanyIds.has(row.companyId)
                  return (
                    <tr key={row.companyId} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 align-middle font-medium text-foreground">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground">
                        {row.industry?.trim() || "—"}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {row.isActive ? (
                          <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            Inactiva
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground">
                        {formatCreatedAt(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-3 py-0 text-xs"
                            onClick={() => void handleOpenEdit(row.companyId)}
                            disabled={isRowToggling}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 min-w-[7.5rem] gap-1.5 px-3 py-0 text-xs"
                            onClick={() => void handleToggleActive(row)}
                            disabled={isRowToggling}
                            aria-busy={isRowToggling}
                          >
                            {isRowToggling ? (
                              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                            ) : null}
                            {row.isActive ? "Desactivar" : "Activar"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <nav className="mt-6 flex flex-wrap items-center justify-between gap-3" aria-label="Paginación">
        <p className="font-sans text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-3"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 px-3"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </nav>

      <Modal
        isOpen={formOpen}
        onClose={handleCloseForm}
        title={formMode === "create" ? "Nueva empresa" : "Editar empresa"}
        size="lg"
        closeOnEscape={!formSubmitting && !formLoading}
        closeOnOverlayClick={!formSubmitting && !formLoading}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCloseForm} disabled={formSubmitting || formLoading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="admin-company-form"
              variant="primary"
              loading={formSubmitting}
              disabled={formSubmitting || formLoading}
            >
              {formMode === "create" ? "Guardar" : "Actualizar"}
            </Button>
          </div>
        }
      >
        {formLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Cargando empresa…
          </div>
        ) : formLoadError ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive" role="alert">{formLoadError}</p>
            <Button type="button" variant="outline" onClick={() => editingCompanyId && void handleOpenEdit(editingCompanyId)}>
              Reintentar
            </Button>
          </div>
        ) : (
          <form id="admin-company-form" className="space-y-5" onSubmit={handleSubmitForm}>
            {formMode === "edit" && editMeta ? (
              <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                <div>
                  <span className="font-medium text-foreground">ID empresa</span>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{editMeta.companyId}</p>
                </div>
                <div>
                  <span className="font-medium text-foreground">Fecha de creación</span>
                  <p className="mt-1 text-muted-foreground">{formatCreatedAt(editMeta.createdAt)}</p>
                </div>
              </div>
            ) : null}
            <Input
              id="company-name"
              name="name"
              label="Nombre"
              required
              value={formState.name}
              error={formErrors.name || ""}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setFormState((c) => ({ ...c, name: event.target.value }))
                setFormErrors((c) => ({ ...c, name: undefined }))
              }}
              placeholder="Nombre de la empresa"
              disabled={formSubmitting}
            />
            <Input
              id="company-industry"
              name="industry"
              label="Industria (opcional)"
              value={formState.industry}
              error=""
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setFormState((c) => ({ ...c, industry: event.target.value }))
              }
              placeholder="ej. Tecnología, Retail"
              disabled={formSubmitting}
            />
            <label className="flex cursor-pointer items-center gap-2 font-sans text-sm text-foreground">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(e) => setFormState((c) => ({ ...c, isActive: e.target.checked }))}
                className={checkboxVoClass}
                disabled={formSubmitting}
              />
              Empresa activa
            </label>
            <p className="text-xs text-muted-foreground">
              Para dar de baja una empresa en el producto, desactivala en lugar de eliminarla.
            </p>
          </form>
        )}
      </Modal>

      <Snackbar
        open={snackbar.open}
        onClose={() => setSnackbar((c) => ({ ...c, open: false }))}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </main>
  )
}
