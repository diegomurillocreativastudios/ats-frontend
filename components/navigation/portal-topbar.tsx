"use client"

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { ChevronRight, LogOut, Shield } from "lucide-react"
import LanguageSwitcher from "@/components/language-switcher"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getInitials } from "@/lib/getInitials"
import { logoutToLogin } from "@/lib/logout-to-login"
import { isAdminRole } from "@/lib/roles"
import {
  formatSidebarDisplayName,
  resolveSidebarRoleLabelKey,
} from "@/lib/sidebar-user-display"
import type { TopbarCrumb } from "@/lib/topbar-breadcrumbs"

const TOPBAR_MENU_ITEM_CLASS =
  "flex w-full items-center gap-2 px-3 py-2.5 text-left font-sans text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-inset"

const CRUMB_LINK_CLASS =
  "rounded font-sans text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"

interface PortalTopbarCrumbsProps {
  crumbs: TopbarCrumb[]
  ariaLabel: string
}

interface PortalTopbarActionsProps {
  includeAdminShortcut?: boolean
}

interface TopbarAccountMenuProps {
  includeAdminShortcut?: boolean
}

/**
 * Desktop breadcrumb trail. The last item is the current page.
 */
export function PortalTopbarCrumbs({
  crumbs,
  ariaLabel,
}: PortalTopbarCrumbsProps) {
  return (
    <nav
      className="flex min-w-0 flex-wrap items-center gap-2"
      aria-label={ariaLabel}
    >
      {crumbs.map((segment, index) => {
        const isLast = index === crumbs.length - 1
        const showLink = Boolean(segment.href) && !isLast

        return (
          <Fragment key={`${segment.label}-${index}`}>
            {index > 0 ? (
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            ) : null}
            {showLink ? (
              <Link href={segment.href!} className={CRUMB_LINK_CLASS}>
                {segment.label}
              </Link>
            ) : (
              <span
                className={`min-w-0 truncate font-sans text-sm ${
                  isLast
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
                aria-current={isLast ? "page" : undefined}
              >
                {segment.label}
              </span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}

/**
 * Language and account — shared hit target and spacing.
 */
export function PortalTopbarActions({
  includeAdminShortcut = false,
}: PortalTopbarActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <LanguageSwitcher />
      <TopbarAccountMenu includeAdminShortcut={includeAdminShortcut} />
    </div>
  )
}

function TopbarAccountMenu({
  includeAdminShortcut = false,
}: TopbarAccountMenuProps) {
  const t = useTranslations("Topbar")
  const tSidebar = useTranslations("Sidebar")
  const tCommon = useTranslations("Common")
  const tActions = useTranslations("Actions")
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
    : user?.role?.trim() || tSidebar("roleRecruiter")
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
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full p-0 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
        aria-label={
          loading
            ? t("userMenu")
            : `${displayName}, ${roleLabel}. ${t("userMenu")}`
        }
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
      >
        {loading ? (
          <span
            className="h-9 w-9 animate-pulse rounded-full bg-muted"
            aria-hidden
          />
        ) : (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-vo-purple to-vo-magenta font-sans text-[11px] font-semibold text-white"
            aria-hidden
          >
            {initials}
          </span>
        )}
      </button>
      {isMenuOpen ? (
        <div
          className="glass-panel absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-xl py-1"
          role="menu"
        >
          {showAdminShortcut ? (
            <button
              type="button"
              onClick={handleGoToAdmin}
              className={TOPBAR_MENU_ITEM_CLASS}
              role="menuitem"
            >
              <Shield className="h-4 w-4 shrink-0" aria-hidden />
              {t("adminShortcut")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className={TOPBAR_MENU_ITEM_CLASS}
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
