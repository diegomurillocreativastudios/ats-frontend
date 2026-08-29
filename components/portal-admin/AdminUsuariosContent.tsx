"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
  Lock,
  LockOpen,
  Mail,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Modal from "@/components/ui/Modal"
import {
  AdminLoadingState,
  AdminStatusPill,
} from "@/components/portal-admin/admin-page-chrome"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { ListPaginationBar } from "@/components/ui/list-pagination-bar"
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
import { QUERY_PAGE_SIZE_DEFAULT } from "@/lib/api/query-paging"

const ASSIGNABLE_ROLES = ["Admin", "Recruiter", "Candidate"] as const

function isDistinctUserName(email: string, userName: string): boolean {
  const name = userName.trim()
  return name !== "" && name.toLowerCase() !== email.trim().toLowerCase()
}

/** Estilos de pill por rol. Candidate usa un relleno neutro para no verse vacío. */
function rolePillClass(role: string): string {
  switch (role) {
    case "Admin":
      return "border-vo-purple/35 bg-vo-purple/15 text-vo-purple"
    case "Recruiter":
      return "border-vo-magenta/35 bg-vo-magenta/15 text-vo-magenta"
    case "Candidate":
      return "border-vo-purple/30 bg-vo-purple/10 text-vo-purple"
    default:
      return "border-border bg-muted text-foreground"
  }
}

function roleDotClass(role: string): string {
  switch (role) {
    case "Admin":
      return "bg-vo-purple"
    case "Recruiter":
      return "bg-vo-magenta"
    case "Candidate":
      return "bg-ats-cobre-light"
    default:
      return "bg-muted-foreground"
  }
}

function userInitials(email: string, userName: string): string {
  const source = isDistinctUserName(email, userName)
    ? userName.trim()
    : email.trim()
  const token = source.split(/[@\s._-]+/).find((part) => part.length > 0)
  if (!token) return "?"
  if (token.length === 1) return token.toUpperCase()
  return token.slice(0, 2).toUpperCase()
}

const DETAIL_CARD_CLASS =
  "rounded-xl border border-border bg-muted/40"
const DETAIL_FOOTER_BTN_CLASS = "h-10 px-4 py-0"

const checkboxVoClass =
  "h-4 w-4 shrink-0 rounded border border-input accent-vo-purple text-vo-purple focus:outline-none focus:ring-2 focus:ring-vo-purple/50 focus:ring-offset-1 disabled:opacity-50"

const FILTER_CONTROL_CLASS =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-background font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

const FILTER_LABEL_CLASS =
  "font-sans text-xs font-medium leading-none text-muted-foreground"

const PRIMARY_ACTION_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"

const EMAIL_DEBOUNCE_MS = 350

function UserRolePills({
  roles,
  isMuted = false,
}: {
  roles: string[]
  isMuted?: boolean
}) {
  const t = useTranslations("AdminPortal.users")

  if (roles.length === 0) {
    return (
      <p className="font-sans text-sm text-muted-foreground">{t("cards.noRoles")}</p>
    )
  }

  return (
    <ul
      className="flex flex-wrap items-center gap-1.5"
      aria-label={t("cards.rolesLabel")}
    >
      {roles.map((role) => (
        <li key={role}>
          <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${
              isMuted
                ? "border-slate-200 bg-slate-100 text-slate-500"
                : rolePillClass(role)
            }`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                isMuted ? "bg-slate-400" : roleDotClass(role)
              }`}
              aria-hidden
            />
            {role}
          </span>
        </li>
      ))}
    </ul>
  )
}

function UserListFilters({
  email,
  role,
  lockedOnly,
  disabled,
  hasActiveFilters,
  onEmailChange,
  onRoleChange,
  onLockedOnlyChange,
  onClear,
}: {
  email: string
  role: string
  lockedOnly: boolean
  disabled?: boolean
  hasActiveFilters: boolean
  onEmailChange: (value: string) => void
  onRoleChange: (value: string) => void
  onLockedOnlyChange: (value: boolean) => void
  onClear: () => void
}) {
  const t = useTranslations("AdminPortal.users")

  return (
    <div
      className="rounded-xl border border-border bg-card p-3 md:p-4"
      aria-label={t("filters.regionLabel")}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="users-filter-email" className={FILTER_LABEL_CLASS}>
            {t("filters.emailLabel")}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="users-filter-email"
              type="search"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder={t("filters.emailPlaceholder")}
              disabled={disabled}
              className={`${FILTER_CONTROL_CLASS} pl-9 pr-3`}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="users-filter-role" className={FILTER_LABEL_CLASS}>
            {t("filters.roleLabel")}
          </label>
          <select
            id="users-filter-role"
            value={role}
            onChange={(event) => onRoleChange(event.target.value)}
            disabled={disabled}
            className={`${FILTER_CONTROL_CLASS} px-3`}
            aria-label={t("filters.filterByAria", { label: t("filters.roleLabel") })}
          >
            <option value="">{t("filters.allRoles")}</option>
            {ASSIGNABLE_ROLES.map((assignableRole) => (
              <option key={assignableRole} value={assignableRole}>
                {assignableRole}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="users-filter-lockout" className={FILTER_LABEL_CLASS}>
            {t("filters.lockoutLabel")}
          </label>
          <select
            id="users-filter-lockout"
            value={lockedOnly ? "locked" : ""}
            onChange={(event) =>
              onLockedOnlyChange(event.target.value === "locked")
            }
            disabled={disabled}
            className={`${FILTER_CONTROL_CLASS} px-3`}
            aria-label={t("filters.filterByAria", {
              label: t("filters.lockoutLabel"),
            })}
          >
            <option value="">{t("filters.allLockouts")}</option>
            <option value="locked">{t("filters.lockedOnly")}</option>
          </select>
        </div>
      </div>

      {hasActiveFilters ? (
        <div className="mt-3 flex justify-end border-t border-border pt-3">
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="font-sans text-sm font-medium text-vo-purple underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:opacity-50"
          >
            {t("filters.clearFilters")}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function UserListCard({
  user,
  onManage,
}: {
  user: AdminUserListItem
  onManage: (id: string) => void
}) {
  const t = useTranslations("AdminPortal.users")
  const isLocked = user.lockoutActive
  const showUserName = isDistinctUserName(user.email, user.userName)
  const initials = userInitials(user.email, user.userName)

  const handleManage = () => {
    onManage(user.id)
  }

  const zoneLabelClass = isLocked
    ? "font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-400"
    : "font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"

  return (
    <article
      className={
        isLocked
          ? "relative grid grid-cols-1 gap-4 overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50/95 p-5 lg:grid-cols-[minmax(16rem,1.15fr)_minmax(12rem,1.5fr)_minmax(9rem,auto)_auto] lg:items-center lg:gap-x-6"
          : "grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-5 lg:grid-cols-[minmax(16rem,1.15fr)_minmax(12rem,1.5fr)_minmax(9rem,auto)_auto] lg:items-center lg:gap-x-6"
      }
      aria-label={
        isLocked
          ? t("cards.cardLockedAria", { email: user.email })
          : t("cards.cardAria", { email: user.email })
      }
    >
      {isLocked ? (
        <div
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/40 via-transparent to-slate-100/50"
          aria-hidden
        />
      ) : null}

      <div className="relative flex min-w-0 items-center gap-4">
        <div
          className={
            isLocked
              ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-slate-100 font-sans text-sm font-semibold tracking-wide text-slate-500"
              : "flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-vo-purple/10 font-sans text-sm font-semibold tracking-wide text-vo-purple"
          }
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 space-y-1">
          <h3
            className={
              isLocked
                ? "truncate font-sans text-base font-semibold leading-tight text-slate-600"
                : "truncate font-sans text-base font-semibold leading-tight text-foreground"
            }
            title={user.email}
          >
            {user.email}
          </h3>
          {showUserName ? (
            <p
              className={
                isLocked
                  ? "truncate font-sans text-sm text-slate-500"
                  : "truncate font-sans text-sm text-muted-foreground"
              }
              title={user.userName}
            >
              {user.userName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative min-w-0 space-y-1.5">
        <p className={zoneLabelClass}>{t("cards.rolesLabel")}</p>
        <UserRolePills roles={user.roles} isMuted={isLocked} />
      </div>

      <div
        className="relative min-w-0 space-y-1.5"
        aria-label={t("cards.statusLabel")}
      >
        <p className={zoneLabelClass}>{t("cards.statusLabel")}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <AdminStatusPill tone={user.emailConfirmed ? "active" : "inactive"}>
            {user.emailConfirmed
              ? t("cards.confirmed")
              : t("cards.unconfirmed")}
          </AdminStatusPill>
          <AdminStatusPill tone={isLocked ? "danger" : "inactive"}>
            {isLocked ? t("cards.locked") : t("cards.unlocked")}
          </AdminStatusPill>
        </div>
      </div>

      <div className="relative flex items-center lg:justify-end">
        <button
          type="button"
          onClick={handleManage}
          aria-label={t("actions.manageAria", { email: user.email })}
          className={
            isLocked
              ? "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-background/90 px-5 font-sans text-sm font-medium text-slate-600 transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 lg:w-auto lg:px-6"
              : "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 lg:w-auto lg:px-6"
          }
        >
          {t("actions.manage")}
        </button>
      </div>
    </article>
  )
}

function UserListSection({
  loading,
  listError,
  items,
  hasActiveFilters,
  onRetry,
  onCreate,
  onManage,
}: {
  loading: boolean
  listError: string | null
  items: AdminUserListItem[]
  hasActiveFilters: boolean
  onRetry: () => void
  onCreate: () => void
  onManage: (id: string) => void
}) {
  const t = useTranslations("AdminPortal.users")

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent"
          aria-hidden
        />
        <p className="font-sans text-sm text-muted-foreground">
          {t("loadingStates.loading")}
        </p>
      </div>
    )
  }

  if (listError) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center"
        aria-label={t("aria.loadError")}
      >
        <p className="font-sans text-sm text-destructive" role="alert">
          {listError}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className={PRIMARY_ACTION_CLASS}
        >
          {t("actions.retry")}
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
        <Users className="h-12 w-12 text-muted-foreground" aria-hidden />
        <p className="font-sans text-sm text-muted-foreground">
          {hasActiveFilters
            ? t("emptyStates.noUsersFiltered")
            : t("emptyStates.noUsers")}
        </p>
        <button
          type="button"
          onClick={onCreate}
          className={PRIMARY_ACTION_CLASS}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t("actions.create")}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
      <ul className="flex flex-col gap-3" role="list">
        {items.map((user) => (
          <li key={user.id}>
            <UserListCard user={user} onManage={onManage} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function UserIdentityCard({
  email,
  userName,
  createdAt,
  emailLabel,
  userNameLabel,
  createdAtLabel,
}: {
  email: string
  userName: string
  createdAt: string | null
  emailLabel: string
  userNameLabel: string
  createdAtLabel: string
}) {
  const showUserName = isDistinctUserName(email, userName)
  const initials = userInitials(email, userName)

  return (
    <div className={`flex items-center gap-4 p-4 ${DETAIL_CARD_CLASS}`}>
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-vo-purple/15 font-sans text-sm font-semibold tracking-wide text-vo-purple"
        aria-hidden
      >
        {initials}
      </div>
      <dl className="min-w-0 flex-1 space-y-1">
        <div>
          <dt className="sr-only">{emailLabel}</dt>
          <dd
            className="truncate font-sans text-sm font-semibold text-foreground"
            title={email}
          >
            {email}
          </dd>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-xs text-muted-foreground">
          {showUserName ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <dt className="sr-only">{userNameLabel}</dt>
              <dd
                className="truncate font-medium text-foreground"
                title={userName}
              >
                {userName}
              </dd>
            </div>
          ) : null}
          {showUserName && createdAt ? (
            <span aria-hidden className="text-border">
              ·
            </span>
          ) : null}
          {createdAt ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <dt className="shrink-0">{createdAtLabel}</dt>
              <dd>{createdAt}</dd>
            </div>
          ) : null}
        </div>
      </dl>
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
      <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function UserAccountPanel({
  confirmedLabel,
  confirmedHint,
  confirmedPill,
  lockoutLabel,
  lockoutMeta,
  lockoutPill,
  lockoutHint,
  lockAction,
  isLocked = false,
}: {
  confirmedLabel: string
  confirmedHint: string
  confirmedPill: ReactNode
  lockoutLabel: string
  lockoutMeta?: string
  lockoutPill: ReactNode
  lockoutHint: string
  lockAction: ReactNode
  isLocked?: boolean
}) {
  const panelClass = isLocked
    ? "overflow-hidden rounded-xl border border-destructive/25 bg-destructive/5"
    : `overflow-hidden ${DETAIL_CARD_CLASS}`

  return (
    <div className={panelClass}>
      <div className="grid grid-cols-2">
        <div className="flex items-start justify-between gap-3 border-r border-border p-4">
          <div className="min-w-0 space-y-1">
            <p className="font-sans text-sm font-medium text-foreground">
              {confirmedLabel}
            </p>
            <p className="font-sans text-xs leading-5 text-muted-foreground">
              {confirmedHint}
            </p>
          </div>
          <div className="flex shrink-0 items-center">{confirmedPill}</div>
        </div>
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0 space-y-1">
            <p className="font-sans text-sm font-medium text-foreground">
              {lockoutLabel}
            </p>
            {lockoutMeta ? (
              <p className="font-sans text-xs leading-5 text-muted-foreground">
                {lockoutMeta}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center">{lockoutPill}</div>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center">
        {lockAction}
        <p className="font-sans text-xs leading-5 text-muted-foreground">
          {lockoutHint}
        </p>
      </div>
    </div>
  )
}

function formatDateUtc(value: string | null, locale: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
}

export default function AdminUsuariosContent() {
  const t = useTranslations("AdminPortal.users")
  const locale = useLocale()
  const [items, setItems] = useState<AdminUserListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(QUERY_PAGE_SIZE_DEFAULT)
  const [filterEmail, setFilterEmail] = useState("")
  const [appliedEmail, setAppliedEmail] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [filterLockedOnly, setFilterLockedOnly] = useState(false)

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
        role: filterRole || undefined,
        lockedOnly: filterLockedOnly || undefined,
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
  }, [page, pageSize, appliedEmail, filterRole, filterLockedOnly, t])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (filterEmail === appliedEmail) return
      setAppliedEmail(filterEmail)
      setPage(1)
    }, EMAIL_DEBOUNCE_MS)
    return () => window.clearTimeout(timeoutId)
  }, [filterEmail, appliedEmail])

  const handleEmailChange = (value: string) => {
    setFilterEmail(value)
  }

  const handleRoleChange = (value: string) => {
    setFilterRole(value)
    setPage(1)
  }

  const handleLockedOnlyChange = (value: boolean) => {
    setFilterLockedOnly(value)
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilterEmail("")
    setFilterRole("")
    setFilterLockedOnly(false)
    setAppliedEmail("")
    setPage(1)
  }

  const hasAppliedFilters =
    appliedEmail !== "" || filterRole !== "" || filterLockedOnly

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

  const handlePageChange = (nextPage: number) => setPage(nextPage)

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize)
    setPage(1)
  }

  const handleOpenCreate = () => {
    setCreateOpen(true)
  }

  const handleManageUser = (id: string) => {
    void openDetail(id)
  }

  const paginationLabels = {
    perPage: t("pagination.perPage"),
    pageSizeAria: t("pagination.pageSizeAria"),
    regionAria: t("pagination.regionAria"),
    summary: t("pagination.summary", { page, total: totalPages }),
    prev: t("pagination.prev"),
    next: t("pagination.next"),
    count: t("pagination.count", { count: totalCount }),
  }

  const renderPageHeader = () => (
    <PortalPageHeader
      id="portal-admin-usuarios-heading"
      className="shrink-0 gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between"
      title={t("page.title")}
      description={t("page.description")}
      actions={
        <button
          type="button"
          onClick={handleOpenCreate}
          className={`${PRIMARY_ACTION_CLASS} w-full sm:w-auto`}
          aria-label={t("actions.createAria")}
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t("actions.create")}</span>
          <span className="sm:hidden">{t("actions.createShort")}</span>
        </button>
      }
    />
  )

  const renderMainContent = () => (
    <section
      className="flex min-h-0 flex-1 flex-col gap-3"
      aria-label={t("page.listRegionLabel")}
    >
      <div className="shrink-0">
        <UserListFilters
          email={filterEmail}
          role={filterRole}
          lockedOnly={filterLockedOnly}
          disabled={loading}
          hasActiveFilters={hasAppliedFilters || filterEmail !== ""}
          onEmailChange={handleEmailChange}
          onRoleChange={handleRoleChange}
          onLockedOnlyChange={handleLockedOnlyChange}
          onClear={handleClearFilters}
        />
      </div>
      <UserListSection
        loading={loading}
        listError={listError}
        items={items}
        hasActiveFilters={hasAppliedFilters}
        onRetry={() => void loadList()}
        onCreate={handleOpenCreate}
        onManage={handleManageUser}
      />
      {!loading && !listError ? (
        <div className="shrink-0">
          <ListPaginationBar
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            loading={loading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            labels={paginationLabels}
          />
        </div>
      ) : null}
    </section>
  )

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <section
        className="shrink-0 px-4 pt-6 sm:px-6 lg:px-8"
        aria-label={t("page.headerRegionLabel")}
      >
        {renderPageHeader()}
      </section>
      <section
        className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2 sm:px-6 lg:px-8"
        aria-label={t("page.filtersAndListRegionLabel")}
      >
        {renderMainContent()}
      </section>

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
        contentClassName="modal-surface-solid"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className={DETAIL_FOOTER_BTN_CLASS}
              disabled={detailBusy || detailLoading || !detail}
              onClick={() => void handleSendReset()}
            >
              <Mail className="h-4 w-4" aria-hidden />
              {t("detail.sendReset")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={DETAIL_FOOTER_BTN_CLASS}
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
          <div className="flex flex-col gap-6">
            <UserIdentityCard
              email={detail.email}
              userName={detail.userName ?? ""}
              createdAt={formatDateUtc(detail.createdAtUtc, locale)}
              emailLabel={t("detail.emailLabel")}
              userNameLabel={t("detail.userNameLabel")}
              createdAtLabel={t("detail.createdAtLabel")}
            />

            <UserDetailSection title={t("detail.accountHeading")}>
              <UserAccountPanel
                confirmedLabel={t("table.emailOk")}
                confirmedHint={
                  detail.emailConfirmed
                    ? t("detail.emailConfirmedHint")
                    : t("detail.emailPendingHint")
                }
                confirmedPill={
                  <AdminStatusPill
                    tone={detail.emailConfirmed ? "active" : "inactive"}
                  >
                    {detail.emailConfirmed ? t("values.yes") : t("values.no")}
                  </AdminStatusPill>
                }
                lockoutLabel={t("table.lockout")}
                lockoutMeta={
                  detail.lockoutActive && detail.lockoutEnd
                    ? t("detail.lockoutUntil", {
                        date: formatDateUtc(detail.lockoutEnd, locale) ?? "",
                      })
                    : undefined
                }
                lockoutPill={
                  <AdminStatusPill
                    tone={detail.lockoutActive ? "danger" : "inactive"}
                  >
                    {detail.lockoutActive ? t("values.yes") : t("values.no")}
                  </AdminStatusPill>
                }
                lockoutHint={t("detail.lockoutHint")}
                isLocked={detail.lockoutActive}
                lockAction={
                  <Button
                    type="button"
                    variant="outline"
                    className={
                      detail.lockoutActive
                        ? "h-9 shrink-0 px-3 py-0 text-sm"
                        : "h-9 shrink-0 px-3 py-0 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
                    }
                    disabled={detailBusy}
                    onClick={() =>
                      void handleToggleLockout(!detail.lockoutActive)
                    }
                  >
                    {detail.lockoutActive ? (
                      <LockOpen className="h-4 w-4" aria-hidden />
                    ) : (
                      <Lock className="h-4 w-4" aria-hidden />
                    )}
                    {detail.lockoutActive
                      ? t("detail.unlockAction")
                      : t("detail.lockAction")}
                  </Button>
                }
              />
            </UserDetailSection>

            <UserDetailSection title={t("detail.rolesHeading")}>
              <div className={`space-y-3 p-4 ${DETAIL_CARD_CLASS}`}>
                <div className="flex flex-wrap gap-2">
                  {detail.roles.map((role) => (
                    <span
                      key={role}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${rolePillClass(role)}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${roleDotClass(role)}`}
                        aria-hidden
                      />
                      {role}
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-vo-purple/50"
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
                {ASSIGNABLE_ROLES.every((role) =>
                  detail.roles.includes(role)
                ) ? (
                  <p className="font-sans text-xs text-muted-foreground">
                    {t("detail.allRolesAssigned")}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3 border-t border-border pt-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-fit px-3 py-0 text-sm"
                      disabled={detailBusy}
                      onClick={() => void handleAddRoles()}
                    >
                      {t("detail.addRoles")}
                    </Button>
                  </div>
                )}
              </div>
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
        contentClassName="modal-surface-solid"
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
    </div>
  )
}
