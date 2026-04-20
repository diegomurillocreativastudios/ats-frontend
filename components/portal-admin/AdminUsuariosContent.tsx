"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Shield,
  UserPlus,
} from "lucide-react"
import Modal from "@/components/ui/Modal"
import Snackbar from "@/components/ui/Snackbar"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  createAdminUser,
  deleteAdminUserRole,
  fetchAdminUserById,
  fetchAdminUsersList,
  patchAdminUser,
  postAdminUserRoles,
  postAdminUserSendPasswordReset,
  setAdminUserLockout,
  type AdminUserDetail,
  type AdminUserListItem,
} from "@/lib/api/admin-users"

const ASSIGNABLE_ROLES = ["Admin", "Recruiter", "Candidate"] as const

/** Estilos de pill por rol (paleta VO). */
function rolePillClass(role: string): string {
  switch (role) {
    case "Admin":
      return "border-vo-purple/40 bg-vo-purple/10 text-vo-purple"
    case "Recruiter":
      return "border-vo-magenta/40 bg-vo-magenta/10 text-vo-magenta"
    case "Candidate":
      return "border-vo-sky/50 bg-vo-sky/15 text-vo-navy"
    default:
      return "border-border bg-muted text-foreground"
  }
}

const checkboxVoClass =
  "h-4 w-4 shrink-0 rounded border border-input accent-vo-purple text-vo-purple focus:outline-none focus:ring-2 focus:ring-vo-purple/50 focus:ring-offset-1 disabled:opacity-50"

function formatDateUtc(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })
}

export default function AdminUsuariosContent() {
  const [items, setItems] = useState<AdminUserListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filterEmail, setFilterEmail] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [filterLockedOnly, setFilterLockedOnly] = useState(false)
  const [appliedEmail, setAppliedEmail] = useState("")
  const [appliedRole, setAppliedRole] = useState("")
  const [appliedLockedOnly, setAppliedLockedOnly] = useState(false)

  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createEmail, setCreateEmail] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [createRoles, setCreateRoles] = useState<Record<string, boolean>>({
    Admin: false,
    Recruiter: false,
    Candidate: true,
  })
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailBusy, setDetailBusy] = useState(false)
  const [addRolesSelection, setAddRolesSelection] = useState<
    Record<string, boolean>
  >({ Admin: false, Recruiter: false, Candidate: false })

  /** Rol pendiente de quitar (confirmación por modal, sin `window.confirm`). */
  const [removeRoleTarget, setRemoveRoleTarget] = useState<string | null>(null)

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
      const res = await fetchAdminUsersList({
        page,
        pageSize,
        email: appliedEmail || undefined,
        role: appliedRole || undefined,
        lockedOnly: appliedLockedOnly || undefined,
      })
      setItems(res.items)
      setTotalCount(res.totalCount)
      if (res.page !== page) setPage(res.page)
    } catch (err: unknown) {
      const rec = err as { status?: number }
      const msg = getApiErrorMessage(err)
      setListError(
        rec.status === 403
          ? "No tenés permisos para listar usuarios (se requiere rol Admin en el API)."
          : msg
      )
      setItems([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, appliedEmail, appliedRole, appliedLockedOnly])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const applyFilters = () => {
    setAppliedEmail(filterEmail)
    setAppliedRole(filterRole)
    setAppliedLockedOnly(filterLockedOnly)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1)

  const openDetail = async (id: string) => {
    setDetailId(id)
    setDetail(null)
    setDetailError(null)
    setAddRolesSelection({
      Admin: false,
      Recruiter: false,
      Candidate: false,
    })
    setDetailLoading(true)
    try {
      const u = await fetchAdminUserById(id)
      setDetail(u)
    } catch (err: unknown) {
      setDetailError(getApiErrorMessage(err))
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setDetailId(null)
    setDetail(null)
    setDetailError(null)
  }

  const handlePatch = async (
    patch: { lockoutEnabled?: boolean; emailConfirmed?: boolean }
  ) => {
    if (!detailId) return
    setDetailBusy(true)
    try {
      const u = await patchAdminUser(detailId, patch)
      setDetail(u)
      setItems((prev) =>
        prev.map((row) =>
          row.id === u.id
            ? {
                ...row,
                emailConfirmed: u.emailConfirmed,
                lockoutActive: u.lockoutActive,
                roles: u.roles,
                userName: u.userName,
              }
            : row
        )
      )
      if (patch.lockoutEnabled === true) {
        showSnackbar("success", "Usuario bloqueado.")
      } else if (patch.lockoutEnabled === false) {
        showSnackbar("success", "Usuario desbloqueado.")
      } else {
        showSnackbar("success", "Usuario actualizado.")
      }
      void loadList()
    } catch (err: unknown) {
      showSnackbar("error", getApiErrorMessage(err))
    } finally {
      setDetailBusy(false)
    }
  }

  const handleToggleLockout = async (lockoutEnabled: boolean) => {
    if (!detailId) return
    setDetailBusy(true)
    try {
      const u = await setAdminUserLockout(detailId, lockoutEnabled)
      setDetail(u)
      setItems((prev) =>
        prev.map((row) =>
          row.id === u.id
            ? {
                ...row,
                lockoutActive: u.lockoutActive,
              }
            : row
        )
      )
      showSnackbar(
        "success",
        lockoutEnabled ? "Usuario bloqueado." : "Usuario desbloqueado."
      )
      void loadList()
    } catch (err: unknown) {
      showSnackbar("error", getApiErrorMessage(err))
    } finally {
      setDetailBusy(false)
    }
  }

  const handleAddRoles = async () => {
    if (!detailId) return
    const names = ASSIGNABLE_ROLES.filter((r) => addRolesSelection[r])
    if (names.length === 0) {
      showSnackbar("error", "Seleccioná al menos un rol para añadir.")
      return
    }
    setDetailBusy(true)
    try {
      const u = await postAdminUserRoles(detailId, [...names])
      setDetail(u)
      setAddRolesSelection({ Admin: false, Recruiter: false, Candidate: false })
      showSnackbar("success", "Roles actualizados.")
      void loadList()
    } catch (err: unknown) {
      showSnackbar("error", getApiErrorMessage(err))
    } finally {
      setDetailBusy(false)
    }
  }

  const confirmRemoveRole = async () => {
    if (!detailId || !removeRoleTarget) return
    setDetailBusy(true)
    try {
      const u = await deleteAdminUserRole(detailId, removeRoleTarget)
      setDetail(u)
      setRemoveRoleTarget(null)
      showSnackbar("success", "Rol quitado.")
      void loadList()
    } catch (err: unknown) {
      showSnackbar("error", getApiErrorMessage(err))
    } finally {
      setDetailBusy(false)
    }
  }

  const handleSendReset = async () => {
    if (!detailId) return
    setDetailBusy(true)
    try {
      const res = await postAdminUserSendPasswordReset(detailId)
      showSnackbar(
        "success",
        res.message || "Se enviaron las instrucciones si el correo es válido."
      )
    } catch (err: unknown) {
      showSnackbar("error", getApiErrorMessage(err))
    } finally {
      setDetailBusy(false)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = createEmail.trim()
    if (!email) {
      showSnackbar("error", "El correo es obligatorio.")
      return
    }
    const roleNames = ASSIGNABLE_ROLES.filter((r) => createRoles[r])
    setCreateSubmitting(true)
    try {
      await createAdminUser({
        email,
        password: createPassword.trim() || undefined,
        roleNames: roleNames.length > 0 ? [...roleNames] : undefined,
      })
      setCreateOpen(false)
      setCreateEmail("")
      setCreatePassword("")
      setCreateRoles({ Admin: false, Recruiter: false, Candidate: true })
      showSnackbar("success", "Usuario creado.")
      void loadList()
    } catch (err: unknown) {
      showSnackbar("error", getApiErrorMessage(err))
    } finally {
      setCreateSubmitting(false)
    }
  }

  const toggleCreateRole = (r: string) => {
    setCreateRoles((prev) => ({ ...prev, [r]: !prev[r] }))
  }

  const toggleAddRole = (r: string) => {
    setAddRolesSelection((prev) => ({ ...prev, [r]: !prev[r] }))
  }

  return (
    <main
      className="flex min-h-0 flex-1 flex-col overflow-auto p-6 md:p-8"
      aria-labelledby="portal-admin-usuarios-heading"
    >
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            id="portal-admin-usuarios-heading"
            className="font-inter text-2xl font-bold tracking-tight text-foreground"
          >
            Usuarios
          </h1>
          <p className="mt-1 max-w-2xl font-inter text-sm text-muted-foreground">
            Listado y administración de cuentas (API{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /api/admin/users
            </code>
            ).
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          className="shrink-0 self-start"
          onClick={() => setCreateOpen(true)}
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Nuevo usuario
        </Button>
      </header>

      <section
        className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm"
        aria-label="Filtros"
      >
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
          <div className="min-w-[200px] flex-1">
            <Input
              id="filter-email"
              name="filterEmail"
              label="Correo (contiene)"
              value={filterEmail}
              error=""
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFilterEmail(e.target.value)
              }
              placeholder="ej. @empresa.com"
            />
          </div>
          <div className="w-full min-w-[160px] md:w-48">
            <label
              htmlFor="filter-role"
              className="mb-2 block text-sm font-medium text-black"
            >
              Rol
            </label>
            <select
              id="filter-role"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 font-inter text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
            >
              <option value="">Todos</option>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 pb-2 font-inter text-sm text-foreground">
            <input
              type="checkbox"
              checked={filterLockedOnly}
              onChange={(e) => setFilterLockedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-border text-vo-purple focus:ring-vo-purple"
            />
            Solo bloqueados
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" onClick={applyFilters}>
              Aplicar filtros
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFilterEmail("")
                setFilterRole("")
                setFilterLockedOnly(false)
                setAppliedEmail("")
                setAppliedRole("")
                setAppliedLockedOnly(false)
                setPage(1)
              }}
            >
              Limpiar
            </Button>
          </div>
        </div>
      </section>

      {listError ? (
        <div
          className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 font-inter text-sm text-destructive"
          role="alert"
        >
          {listError}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-inter text-sm text-muted-foreground">
          {loading
            ? "Cargando…"
            : `${totalCount} usuario${totalCount === 1 ? "" : "s"}`}
        </p>
        <div className="flex items-center gap-2">
          <span className="font-inter text-xs text-muted-foreground">
            Por página
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="h-9 rounded-md border border-border bg-card px-2 text-sm"
          >
            {[10, 20, 50, 100].map((n) => (
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
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[720px] font-inter text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-medium text-foreground">Correo</th>
              <th className="px-4 py-3 font-medium text-foreground">Usuario</th>
              <th className="px-4 py-3 font-medium text-foreground">Roles</th>
              <th className="px-4 py-3 font-medium text-foreground">Email OK</th>
              <th className="px-4 py-3 font-medium text-foreground">Bloqueo</th>
              <th className="px-4 py-3 font-medium text-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-vo-purple" aria-hidden />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No hay usuarios con los filtros actuales.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-middle">
                    <span className="font-medium text-foreground">{row.email}</span>
                  </td>
                  <td className="px-4 py-3 align-middle text-muted-foreground">
                    {row.userName || "—"}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-wrap gap-1">
                      {row.roles.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        row.roles.map((r) => (
                          <span
                            key={r}
                            className="inline-flex items-center rounded-full bg-vo-purple/10 px-2 py-0.5 text-xs font-medium text-vo-purple"
                          >
                            {r}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {row.emailConfirmed ? (
                      <span className="text-emerald-600">Sí</span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {row.lockoutActive ? (
                      <span className="text-emerald-600">Sí</span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-3 py-0 text-xs"
                      onClick={() => void openDetail(row.id)}
                    >
                      Gestionar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav
        className="mt-6 flex flex-wrap items-center justify-between gap-3"
        aria-label="Paginación"
      >
        <p className="font-inter text-sm text-muted-foreground">
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
        isOpen={createOpen}
        onClose={() => !createSubmitting && setCreateOpen(false)}
        title="Nuevo usuario"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={createSubmitting}
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-create-user"
              variant="primary"
              loading={createSubmitting}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Crear
            </Button>
          </div>
        }
      >
        <form id="form-create-user" onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            id="create-email"
            name="email"
            label="Correo"
            type="email"
            required
            value={createEmail}
            error=""
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCreateEmail(e.target.value)
            }
            placeholder="usuario@empresa.com"
          />
          <Input
            id="create-password"
            name="password"
            label="Contraseña (opcional)"
            type="password"
            value={createPassword}
            error=""
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCreatePassword(e.target.value)
            }
            placeholder="Vacío = el usuario define clave por correo"
          />
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-black">
              Roles iniciales
            </legend>
            <div className="flex flex-col gap-2">
              {ASSIGNABLE_ROLES.map((r) => (
                <label
                  key={r}
                  className="flex cursor-pointer items-center gap-2 font-inter text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(createRoles[r])}
                    onChange={() => toggleCreateRole(r)}
                    className={checkboxVoClass}
                  />
                  <span
                    className={
                      r === "Admin"
                        ? "text-vo-purple"
                        : r === "Recruiter"
                          ? "text-vo-magenta"
                          : "text-vo-navy"
                    }
                  >
                    {r}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </form>
      </Modal>

      <Modal
        isOpen={detailId != null}
        onClose={() => !detailBusy && closeDetail()}
        title="Detalle del usuario"
        size="lg"
        bodyClassName="space-y-4"
        footer={
          <Button type="button" variant="outline" onClick={closeDetail}>
            Cerrar
          </Button>
        }
      >
        {detailLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-vo-purple" aria-hidden />
          </div>
        ) : detailError ? (
          <p className="text-sm text-destructive" role="alert">
            {detailError}
          </p>
        ) : detail ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-4">
              <Input
                id="detail-email"
                name="email"
                label="Correo"
                type="email"
                value={detail.email}
                error=""
                placeholder=""
                disabled
                onChange={() => {}}
              />
              <Input
                id="detail-userName"
                name="userName"
                label="Nombre de usuario"
                value={detail.userName ?? ""}
                error=""
                placeholder=""
                disabled
                onChange={() => {}}
              />
            </div>

            <div className="flex flex-wrap gap-6 rounded-lg border border-vo-purple/20 bg-vo-purple/5 px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2.5 font-inter text-sm text-foreground">
                <input
                  type="checkbox"
                  className={checkboxVoClass}
                  checked={detail.lockoutActive}
                  disabled={detailBusy}
                  onChange={(e) => void handleToggleLockout(e.target.checked)}
                />
                Cuenta bloqueada
              </label>
              <div className="flex items-center gap-2.5 font-inter text-sm text-foreground">
                <input
                  type="checkbox"
                  className={`${checkboxVoClass} cursor-default opacity-100 disabled:cursor-default disabled:opacity-100`}
                  checked={detail.emailConfirmed}
                  disabled
                  aria-readonly="true"
                  tabIndex={-1}
                  onChange={() => {}}
                />
                <span>Correo confirmado</span>
                <span className="sr-only">Solo lectura</span>
              </div>
            </div>
            <p className="font-inter text-xs text-muted-foreground">
              Activalo para bloquear manualmente al usuario y desactivalo para quitar el bloqueo.
            </p>
            <p className="font-inter text-xs text-muted-foreground">
              Lockout activo:{" "}
              {detail.lockoutActive ? (
                <strong className="text-vo-magenta">Sí</strong>
              ) : (
                <strong>No</strong>
              )}
              {detail.lockoutEnd ? (
                <> · Fin: {formatDateUtc(detail.lockoutEnd)}</>
              ) : null}
            </p>

            <div>
              <h3 className="mb-3 flex items-center gap-2 font-inter text-sm font-semibold text-vo-purple">
                <Shield className="h-4 w-4 text-vo-purple" aria-hidden />
                Roles
              </h3>
              <div className="mb-3 flex flex-wrap gap-2">
                {detail.roles.map((r) => (
                  <span
                    key={r}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${rolePillClass(r)}`}
                  >
                    {r}
                    <button
                      type="button"
                      className="ml-0.5 rounded-md px-1 text-vo-navy/70 transition hover:bg-vo-pink/15 hover:text-vo-pink"
                      disabled={detailBusy}
                      onClick={() => setRemoveRoleTarget(r)}
                      aria-label={`Quitar rol ${r}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {detail.roles.length === 0 ? (
                  <span className="text-muted-foreground">Sin roles</span>
                ) : null}
              </div>
              <p className="mb-2 font-inter text-xs text-muted-foreground">
                Añadir roles (solo los marcados):
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {ASSIGNABLE_ROLES.filter((r) => !detail.roles.includes(r)).map(
                  (r) => (
                    <label
                      key={r}
                      className="flex cursor-pointer items-center gap-2 font-inter text-sm text-foreground"
                    >
                      <input
                        type="checkbox"
                        className={checkboxVoClass}
                        checked={Boolean(addRolesSelection[r])}
                        disabled={detailBusy}
                        onChange={() => toggleAddRole(r)}
                      />
                      <span
                        className={
                          r === "Admin"
                            ? "text-vo-purple"
                            : r === "Recruiter"
                              ? "text-vo-magenta"
                              : "text-vo-navy"
                        }
                      >
                        {r}
                      </span>
                    </label>
                  )
                )}
                {ASSIGNABLE_ROLES.every((r) => detail.roles.includes(r)) ? (
                  <span className="text-xs text-muted-foreground">
                    Ya tiene todos los roles asignables.
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 text-xs"
                    disabled={detailBusy}
                    onClick={() => void handleAddRoles()}
                  >
                    Añadir roles
                  </Button>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                className="h-9"
                disabled={detailBusy}
                onClick={() => void handleSendReset()}
              >
                <Mail className="h-4 w-4" aria-hidden />
                Enviar recuperación de contraseña
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={removeRoleTarget != null}
        onClose={() => !detailBusy && setRemoveRoleTarget(null)}
        title="Quitar rol"
        size="sm"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={detailBusy}
              onClick={() => setRemoveRoleTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              loading={detailBusy}
              disabled={detailBusy || removeRoleTarget == null}
              onClick={() => void confirmRemoveRole()}
            >
              Quitar rol
            </Button>
          </div>
        }
      >
        <p className="font-inter text-sm text-foreground">
          ¿Quitar el rol «{removeRoleTarget ?? ""}» de este usuario? La
          operación se aplica de inmediato en el servidor.
        </p>
      </Modal>

      <Snackbar
        open={snackbar.open}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        message={snackbar.message}
        variant={snackbar.variant}
      />
    </main>
  )
}
