"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Plus,
  RefreshCw,
  Users,
  UserPlus,
  X,
} from "lucide-react"
import { useTranslations } from "next-intl"
import Modal from "@/components/ui/Modal"
import {
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  ADMIN_THEAD_CLASS,
  ADMIN_TR_CLASS,
  AdminEmptyState,
  AdminErrorPanel,
  AdminLoadingState,
  AdminPageFrame,
  AdminStatusPill,
  AdminSurface,
  AdminTableSkeleton,
} from "@/components/portal-admin/admin-page-chrome"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  createAdminUser,
  deleteAdminUserRole,
  fetchAdminUserById,
  fetchAdminUsersList,
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
      return "border-vo-sky/40 bg-vo-sky/20 text-vo-navy"
    default:
      return "border-border bg-muted text-foreground"
  }
}

const checkboxVoClass =
  "h-4 w-4 shrink-0 rounded border border-input accent-vo-purple text-vo-purple focus:outline-none focus:ring-2 focus:ring-vo-purple/50 focus:ring-offset-1 disabled:opacity-50"

const FILTER_SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-vo-purple"

function isDistinctUserName(email: string, userName: string): boolean {
  const name = userName.trim()
  return name !== "" && name.toLowerCase() !== email.trim().toLowerCase()
}

function UserRolePills({ roles }: { roles: string[] }) {
  if (roles.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  const visibleRoles = roles.slice(0, 2)
  const extraCount = roles.length - visibleRoles.length

  return (
    <div
      className="flex flex-nowrap items-center gap-1"
      title={roles.join(", ")}
    >
      {visibleRoles.map((role) => (
        <span
          key={role}
          className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${rolePillClass(role)}`}
        >
          {role}
        </span>
      ))}
      {extraCount > 0 ? (
        <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          +{extraCount}
        </span>
      ) : null}
    </div>
  )
}

function UserDetailField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  const display = value.trim() === "" ? "—" : value

  return (
    <div className="min-w-0">
      <p className="font-sans text-sm font-medium text-foreground">{label}</p>
      <p
        className="mt-1 truncate font-sans text-sm text-muted-foreground"
        title={display}
      >
        {display}
      </p>
    </div>
  )
}

function UserDetailSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-sans text-sm font-medium text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function UserStatusTile({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3 py-2.5">
      <span className="font-sans text-sm text-foreground">{label}</span>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}

function formatDateUtc(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })
}

export default function AdminUsuariosContent() {
  const t = useTranslations("AdminPortal.users")
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
      setListError(rec.status === 403 ? t("errors.listForbidden") : msg)
      setItems([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, appliedEmail, appliedRole, appliedLockedOnly, t])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const applyFilters = () => {
    setAppliedEmail(filterEmail)
    setAppliedRole(filterRole)
    setAppliedLockedOnly(filterLockedOnly)
    setPage(1)
  }

  const handleApplyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    applyFilters()
  }

  const handleClearFilters = () => {
    setFilterEmail("")
    setFilterRole("")
    setFilterLockedOnly(false)
    setAppliedEmail("")
    setAppliedRole("")
    setAppliedLockedOnly(false)
    setPage(1)
  }

  const hasAppliedFilters =
    appliedEmail !== "" || appliedRole !== "" || appliedLockedOnly
  const isEmpty = !loading && items.length === 0

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
        lockoutEnabled ? t("toasts.locked") : t("toasts.unlocked")
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
      showSnackbar("error", t("validation.selectRole"))
      return
    }
    setDetailBusy(true)
    try {
      const u = await postAdminUserRoles(detailId, [...names])
      setDetail(u)
      setAddRolesSelection({ Admin: false, Recruiter: false, Candidate: false })
      showSnackbar("success", t("toasts.rolesUpdated"))
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
      showSnackbar("success", t("toasts.roleRemoved"))
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
      showSnackbar("success", res.message || t("toasts.resetSent"))
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
      showSnackbar("error", t("validation.emailRequired"))
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
      showSnackbar("success", t("toasts.created"))
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
    <AdminPageFrame labelledBy="portal-admin-usuarios-heading">
      <PortalPageHeader
        id="portal-admin-usuarios-heading"
        title={t("page.title")}
        description={t("page.description")}
        layout="split"
        contentClassName="max-w-3xl"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadList()}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              {t("actions.refresh")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setCreateOpen(true)}
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              {t("actions.create")}
            </Button>
          </>
        }
      />

      <AdminSurface className="p-4" aria-label={t("filters.regionAria")}>
        <form
          className="flex flex-col gap-4 lg:flex-row lg:items-end"
          onSubmit={handleApplyFilters}
        >
          <div className="min-w-0 flex-1">
            <Input
              id="filter-email"
              name="filterEmail"
              label={t("filters.emailLabel")}
              value={filterEmail}
              error=""
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFilterEmail(e.target.value)
              }
              placeholder={t("filters.emailPlaceholder")}
            />
          </div>
          <div className="flex w-full flex-col gap-2 lg:w-40">
            <label
              htmlFor="filter-role"
              className="text-sm font-medium text-foreground"
            >
              {t("filters.roleLabel")}
            </label>
            <select
              id="filter-role"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className={FILTER_SELECT_CLASS}
            >
              <option value="">{t("filters.allRoles")}</option>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-full flex-col gap-2 lg:w-44">
            <span className="text-sm font-medium text-foreground">
              {t("filters.lockoutLabel")}
            </span>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground">
              <input
                type="checkbox"
                checked={filterLockedOnly}
                onChange={(e) => setFilterLockedOnly(e.target.checked)}
                className={checkboxVoClass}
              />
              {t("filters.lockedOnly")}
            </label>
          </div>
          <div className="flex h-10 shrink-0 items-center gap-2">
            <Button type="submit" variant="primary" className="h-10 py-0">
              {t("filters.apply")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 py-0"
              onClick={handleClearFilters}
            >
              {t("filters.clear")}
            </Button>
          </div>
        </form>
      </AdminSurface>

      {listError ? (
        <AdminErrorPanel
          message={listError}
          onRetry={() => void loadList()}
          retryLabel={t("actions.retry")}
          ariaLabel={t("aria.loadError")}
        />
      ) : null}

      {!listError ? (
        <AdminSurface aria-label={t("aria.list")}>
          {loading ? (
            <AdminTableSkeleton columns={5} />
          ) : isEmpty ? (
            <AdminEmptyState
              icon={Users}
              title={t("emptyStates.noResults")}
              description={t("emptyStates.description")}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {hasAppliedFilters ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearFilters}
                    >
                      {t("filters.clear")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setCreateOpen(true)}
                  >
                    <UserPlus className="h-4 w-4" aria-hidden />
                    {t("actions.create")}
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-left font-sans text-sm">
                <colgroup>
                  <col />
                  <col className="w-48" />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-36" />
                </colgroup>
                <thead className={ADMIN_THEAD_CLASS}>
                  <tr>
                    <th className={ADMIN_TH_CLASS}>{t("table.userName")}</th>
                    <th className={ADMIN_TH_CLASS}>{t("table.roles")}</th>
                    <th className={ADMIN_TH_CLASS}>{t("table.emailOk")}</th>
                    <th className={ADMIN_TH_CLASS}>{t("table.lockout")}</th>
                    <th className={`${ADMIN_TH_CLASS} text-right`}>
                      {t("table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className={ADMIN_TR_CLASS}>
                      <td className={ADMIN_TD_CLASS}>
                        <p
                          className="truncate font-medium text-foreground"
                          title={row.email}
                        >
                          {row.email}
                        </p>
                        {isDistinctUserName(row.email, row.userName) ? (
                          <p
                            className="truncate text-xs text-muted-foreground"
                            title={row.userName}
                          >
                            {row.userName}
                          </p>
                        ) : null}
                      </td>
                      <td className={ADMIN_TD_CLASS}>
                        <UserRolePills roles={row.roles} />
                      </td>
                      <td className={ADMIN_TD_CLASS}>
                        <AdminStatusPill
                          tone={row.emailConfirmed ? "active" : "inactive"}
                        >
                          {row.emailConfirmed ? t("values.yes") : t("values.no")}
                        </AdminStatusPill>
                      </td>
                      <td className={ADMIN_TD_CLASS}>
                        <AdminStatusPill
                          tone={row.lockoutActive ? "danger" : "inactive"}
                        >
                          {row.lockoutActive ? t("values.yes") : t("values.no")}
                        </AdminStatusPill>
                      </td>
                      <td
                        className={`${ADMIN_TD_CLASS} whitespace-nowrap text-right`}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-3 py-0 text-xs"
                          onClick={() => void openDetail(row.id)}
                        >
                          {t("actions.manage")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isEmpty ? (
            <nav
              className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              aria-label={t("pagination.regionAria")}
            >
              <p className="font-sans text-sm text-muted-foreground">
                {loading
                  ? t("count.loading")
                  : t("count.summary", { count: totalCount })}
                {loading
                  ? null
                  : ` · ${t("pagination.summary", { page, total: totalPages })}`}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="users-page-size"
                  className="font-sans text-xs text-muted-foreground"
                >
                  {t("pagination.perPage")}
                </label>
                <select
                  id="users-page-size"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  className="h-9 rounded-md border border-border bg-card px-2 text-sm"
                  aria-label={t("pagination.pageSizeAria")}
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-3"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  {t("actions.prev")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-3"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("actions.next")}
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </nav>
          ) : null}
        </AdminSurface>
      ) : null}

      <Modal
        isOpen={createOpen}
        onClose={() => !createSubmitting && setCreateOpen(false)}
        title={t("createModal.title")}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={createSubmitting}
              onClick={() => setCreateOpen(false)}
            >
              {t("createModal.cancel")}
            </Button>
            <Button
              type="submit"
              form="form-create-user"
              variant="primary"
              loading={createSubmitting}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t("createModal.create")}
            </Button>
          </div>
        }
      >
        <form id="form-create-user" onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            id="create-email"
            name="email"
            label={t("createModal.emailLabel")}
            type="email"
            required
            value={createEmail}
            error=""
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCreateEmail(e.target.value)
            }
            placeholder={t("createModal.emailPlaceholder")}
          />
          <Input
            id="create-password"
            name="password"
            label={t("createModal.passwordLabel")}
            type="password"
            value={createPassword}
            error=""
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCreatePassword(e.target.value)
            }
            placeholder={t("createModal.passwordPlaceholder")}
          />
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">
              {t("createModal.rolesLegend")}
            </legend>
            <div className="flex flex-col gap-2">
              {ASSIGNABLE_ROLES.map((r) => (
                <label
                  key={r}
                  className="flex cursor-pointer items-center gap-2 font-sans text-sm text-foreground"
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
        title={t("detail.title")}
        size="lg"
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={detailBusy || detailLoading || !detail}
              onClick={() => void handleSendReset()}
            >
              <Mail className="h-4 w-4" aria-hidden />
              {t("detail.sendReset")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={detailBusy}
              onClick={closeDetail}
            >
              {t("detail.close")}
            </Button>
          </div>
        }
      >
        {detailLoading ? (
          <AdminLoadingState label={t("detail.loading")} />
        ) : detailError ? (
          <div className="space-y-4">
            <p className="font-sans text-sm text-destructive" role="alert">
              {detailError}
            </p>
            {detailId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void openDetail(detailId)}
              >
                {t("actions.retry")}
              </Button>
            ) : null}
          </div>
        ) : detail ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <UserDetailField
                label={t("detail.emailLabel")}
                value={detail.email}
              />
              <UserDetailField
                label={t("detail.userNameLabel")}
                value={detail.userName ?? ""}
              />
            </div>

            <UserDetailSection title={t("detail.accountHeading")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <UserStatusTile label={t("table.emailOk")}>
                  <AdminStatusPill
                    tone={detail.emailConfirmed ? "active" : "inactive"}
                  >
                    {detail.emailConfirmed ? t("values.yes") : t("values.no")}
                  </AdminStatusPill>
                </UserStatusTile>
                <UserStatusTile label={t("table.lockout")}>
                  <AdminStatusPill
                    tone={detail.lockoutActive ? "danger" : "inactive"}
                  >
                    {detail.lockoutActive ? t("values.yes") : t("values.no")}
                  </AdminStatusPill>
                </UserStatusTile>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className={
                    detail.lockoutActive
                      ? "h-8 px-3 py-0 text-xs"
                      : "h-8 px-3 py-0 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  }
                  disabled={detailBusy}
                  onClick={() => void handleToggleLockout(!detail.lockoutActive)}
                >
                  {detail.lockoutActive
                    ? t("detail.unlockAction")
                    : t("detail.lockAction")}
                </Button>
                <p className="font-sans text-xs text-muted-foreground">
                  {t("detail.lockoutHint")}
                  {detail.lockoutActive && detail.lockoutEnd
                    ? ` ${t("detail.lockoutUntil", {
                        date: formatDateUtc(detail.lockoutEnd),
                      })}`
                    : null}
                </p>
              </div>
            </UserDetailSection>

            <UserDetailSection title={t("detail.rolesHeading")}>
              <div className="flex flex-wrap gap-2">
                {detail.roles.map((role) => (
                  <span
                    key={role}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${rolePillClass(role)}`}
                  >
                    {role}
                    <button
                      type="button"
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full transition hover:bg-black/10"
                      disabled={detailBusy}
                      onClick={() => setRemoveRoleTarget(role)}
                      aria-label={t("detail.removeRoleAria", { role })}
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </span>
                ))}
                {detail.roles.length === 0 ? (
                  <span className="font-sans text-sm text-muted-foreground">
                    {t("detail.noRoles")}
                  </span>
                ) : null}
              </div>
              {ASSIGNABLE_ROLES.every((role) => detail.roles.includes(role)) ? (
                <p className="font-sans text-xs text-muted-foreground">
                  {t("detail.allRolesAssigned")}
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-sans text-xs text-muted-foreground">
                    {t("detail.addRolesPrompt")}
                  </span>
                  {ASSIGNABLE_ROLES.filter(
                    (role) => !detail.roles.includes(role)
                  ).map((role) => (
                    <label
                      key={role}
                      className="flex cursor-pointer items-center gap-2 font-sans text-sm text-foreground"
                    >
                      <input
                        type="checkbox"
                        className={checkboxVoClass}
                        checked={Boolean(addRolesSelection[role])}
                        disabled={detailBusy}
                        onChange={() => toggleAddRole(role)}
                      />
                      {role}
                    </label>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-3 py-0 text-xs"
                    disabled={detailBusy}
                    onClick={() => void handleAddRoles()}
                  >
                    {t("detail.addRoles")}
                  </Button>
                </div>
              )}
            </UserDetailSection>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={removeRoleTarget != null}
        onClose={() => !detailBusy && setRemoveRoleTarget(null)}
        title={t("removeRole.title")}
        size="sm"
        overlayZIndexClass="z-[100]"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={detailBusy}
              onClick={() => setRemoveRoleTarget(null)}
            >
              {t("removeRole.cancel")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              loading={detailBusy}
              disabled={detailBusy || removeRoleTarget == null}
              onClick={() => void confirmRemoveRole()}
            >
              {t("removeRole.confirm")}
            </Button>
          </div>
        }
      >
        <p className="font-sans text-sm text-foreground">
          {t("removeRole.message", { role: removeRoleTarget ?? "" })}
        </p>
      </Modal>

      <Snackbar
        open={snackbar.open}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        message={snackbar.message}
        variant={snackbar.variant}
      />
    </AdminPageFrame>
  )
}
