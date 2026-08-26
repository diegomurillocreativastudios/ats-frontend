"use client"

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { ChevronsUpDown, LogOut, Shield, type LucideIcon } from "lucide-react"
import ProductBrand from "@/components/branding/ProductBrand"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getInitials } from "@/lib/getInitials"
import { logoutToLogin } from "@/lib/logout-to-login"
import { PORTAL_SELECTION_PATH } from "@/lib/portal-access"
import { isAdminRole } from "@/lib/roles"
import {
  formatSidebarDisplayName,
  resolveSidebarRoleLabelKey,
  type SidebarRoleLabelKey,
} from "@/lib/sidebar-user-display"

const NAV_ITEM_BASE_CLASS =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"

const NAV_ITEM_ACTIVE_CLASS =
  "bg-ats-terracotta-soft font-medium text-[var(--color-green-deep)]"

const NAV_ITEM_IDLE_CLASS =
  "text-gray-600 hover:bg-muted hover:text-foreground"

interface PortalSidebarFrameProps {
  ariaLabel: string
  brandAriaLabel: string
  children: ReactNode
  footer: ReactNode
}

interface SidebarNavItemProps {
  href: string
  icon: LucideIcon
  label: string
  isActive: boolean
}

interface SidebarUserFooterProps {
  fallbackRoleKey: SidebarRoleLabelKey
  includeAdminShortcut?: boolean
}

/**
 * Shared portal sidebar chrome: one gutter, brand aligned with nav, account pinned to the bottom.
 */
export function PortalSidebarFrame({
  ariaLabel,
  brandAriaLabel,
  children,
  footer,
}: PortalSidebarFrameProps) {
  return (
    <aside
      className="glass-sidebar flex h-full min-h-0 w-[260px] shrink-0 flex-col self-stretch overflow-hidden px-4 py-5"
      aria-label={ariaLabel}
    >
      <Link
        href={PORTAL_SELECTION_PATH}
        className="flex w-full min-w-0 items-center rounded-lg px-3 py-1 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
        aria-label={brandAriaLabel}
      >
        <ProductBrand
          layout="inline"
          tone="onLight"
          density="sidebar"
          className="w-full min-w-0"
        />
      </Link>
      <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
        {children}
      </div>
      <div className="mt-4 shrink-0 border-t border-(--glass-hairline) pt-4">
        {footer}
      </div>
    </aside>
  )
}

/**
 * Primary or utility nav row. Icons sit in a fixed slot so optical weight stays even.
 */
export function SidebarNavItem({
  href,
  icon: Icon,
  label,
  isActive,
}: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      className={`${NAV_ITEM_BASE_CLASS} ${isActive ? NAV_ITEM_ACTIVE_CLASS : NAV_ITEM_IDLE_CLASS}`}
      aria-current={isActive ? "page" : undefined}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center"
        aria-hidden
      >
        <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
      </span>
      {label}
    </Link>
  )
}

/**
 * Account control at the bottom of a portal sidebar (opens upward).
 */
export function SidebarUserFooter({
  fallbackRoleKey,
  includeAdminShortcut = false,
}: SidebarUserFooterProps) {
  const tSidebar = useTranslations("Sidebar")
  const tCommon = useTranslations("Common")
  const tActions = useTranslations("Actions")
  const tTopbar = useTranslations("Topbar")
  const { user, loading } = useCurrentUser()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName =
    formatSidebarDisplayName(user?.name, user?.email) ?? tCommon("userFallback")
  const initials = getInitials(user?.name, user?.email)
  const roleKey = resolveSidebarRoleLabelKey(user?.role)
  const roleLabel = roleKey
    ? tSidebar(roleKey)
    : user?.role?.trim() || tSidebar(fallbackRoleKey)
  const showAdminShortcut = includeAdminShortcut && isAdminRole(user?.role)

  useEffect(() => {
    if (!isMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isMenuOpen])

  const handleToggleMenu = () => {
    setIsMenuOpen((open) => !open)
  }

  const handleMenuButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && isMenuOpen) {
      event.preventDefault()
      setIsMenuOpen(false)
    }
  }

  const handleLogout = async () => {
    setIsMenuOpen(false)
    await logoutToLogin(router)
  }

  const handleGoToAdmin = () => {
    setIsMenuOpen(false)
    router.push("/portal-admin")
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={handleToggleMenu}
        onKeyDown={handleMenuButtonKeyDown}
        className={`${NAV_ITEM_BASE_CLASS} ${NAV_ITEM_IDLE_CLASS} w-full text-left`}
        aria-label={
          loading
            ? tSidebar("accountMenu")
            : `${displayName}, ${roleLabel}. ${tSidebar("accountMenu")}`
        }
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
      >
        {loading ? (
          <span
            className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted"
            aria-hidden
          />
        ) : (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-vo-purple to-vo-magenta font-sans text-xs font-semibold text-white"
            aria-hidden
          >
            {initials}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span
            className="block truncate font-sans text-sm font-medium text-foreground"
            title={loading ? undefined : displayName}
          >
            {loading ? tCommon("loading") : displayName}
          </span>
          <span className="block truncate font-sans text-xs text-muted-foreground">
            {loading ? "\u00a0" : roleLabel}
          </span>
        </span>
        <ChevronsUpDown
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </button>
      {isMenuOpen ? (
        <div
          className="glass-panel absolute bottom-full left-0 right-0 z-50 mb-2 rounded-xl py-1"
          role="menu"
        >
          {showAdminShortcut ? (
            <button
              type="button"
              onClick={handleGoToAdmin}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-sans text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-inset"
              role="menuitem"
            >
              <Shield className="h-4 w-4 shrink-0" aria-hidden />
              {tTopbar("adminShortcut")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-sans text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-inset"
            role="menuitem"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            {tActions("logout")}
          </button>
        </div>
      ) : null}
    </div>
  )
}
