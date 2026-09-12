"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Menu } from "lucide-react"
import AdminSidebar from "@/components/portal-admin/AdminSidebar"
import { PortalNavDrawer } from "@/components/navigation/portal-nav-drawer"
import {
  PORTAL_COMPACT_TOPBAR_LAYOUT_CLASS,
  PORTAL_DESKTOP_TOPBAR_LAYOUT_CLASS,
  PortalTopbarActions,
  PortalTopbarBrandLink,
  PortalTopbarCrumbs,
} from "@/components/navigation/portal-topbar"
import {
  resolveAdminPortalBreadcrumbTrail,
  resolveAdminPortalNavLabelKey,
} from "@/lib/admin-portal-nav"
import { PORTAL_HOME_HREF, PORTAL_SELECTION_PATH } from "@/lib/portal-access"
import { segmentToTitle } from "@/lib/pageTitles"
import {
  buildTopbarTrail,
  formatTopbarTrailText,
  type TopbarCrumb,
} from "@/lib/topbar-breadcrumbs"

const DESKTOP_PADDING = "px-8"
const MOBILE_PADDING = "px-4"

interface AdminTopbarProps {
  variant?: "desktop" | "tablet" | "mobile"
  breadcrumbLabel?: string
  breadcrumbTrail?: TopbarCrumb[] | null
}

function defaultBreadcrumbLabel(
  pathname: string,
  homeLabel: string,
  adminShortcutLabel: string,
  tNav: (key: string) => string,
): string {
  const normalized =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname
  if (normalized === "/portal-admin") return homeLabel

  const navLabelKey = resolveAdminPortalNavLabelKey(pathname)
  if (navLabelKey) return tNav(navLabelKey)

  const segments = normalized.split("/").filter(Boolean)
  const last = segments[segments.length - 1]
  if (!last) return adminShortcutLabel
  if (last === "portal-admin") return homeLabel
  return segmentToTitle(last)
}

function defaultAdminBreadcrumbTrail(
  pathname: string,
  tNav: (key: string) => string,
): TopbarCrumb[] {
  const trail = resolveAdminPortalBreadcrumbTrail(pathname)
  return trail.map((item, index) => ({
    label: tNav(item.labelKey),
    href: index === trail.length - 1 ? undefined : item.href,
  }))
}

export default function AdminTopbar({
  variant = "desktop",
  breadcrumbLabel: breadcrumbLabelProp,
  breadcrumbTrail = null,
}: AdminTopbarProps) {
  const t = useTranslations("Topbar")
  const tNav = useTranslations("Navigation")
  const tSidebar = useTranslations("Sidebar")
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const showCompactChrome = variant === "tablet" || variant === "mobile"

  const resolvedTrail =
    breadcrumbTrail ?? defaultAdminBreadcrumbTrail(pathname, tNav)
  const breadcrumbLabel =
    breadcrumbLabelProp ??
    resolvedTrail[resolvedTrail.length - 1]?.label ??
    defaultBreadcrumbLabel(pathname, tNav("home"), t("adminShortcut"), tNav)

  const paddingClass =
    variant === "desktop"
      ? DESKTOP_PADDING
      : variant === "tablet"
        ? "px-4 md:px-5"
        : MOBILE_PADDING

  const portalLabel = t("portalAdmin")
  const crumbs = buildTopbarTrail(
    portalLabel,
    PORTAL_HOME_HREF.admin,
    resolvedTrail,
    breadcrumbLabel,
  )
  const breadcrumbScreenReaderText = formatTopbarTrailText(crumbs)

  const heightClass =
    variant === "mobile"
      ? "h-14"
      : variant === "tablet"
        ? "h-14 md:h-16"
        : "h-16"

  const handleOpenMenu = () => {
    setIsMenuOpen(true)
  }

  const handleCloseMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <>
      <header
        className={`glass-navbar shrink-0 ${
          showCompactChrome
            ? PORTAL_COMPACT_TOPBAR_LAYOUT_CLASS
            : PORTAL_DESKTOP_TOPBAR_LAYOUT_CLASS
        } ${heightClass} ${paddingClass}`}
        role="banner"
      >
        {showCompactChrome ? (
          <>
            <div className="flex items-center justify-self-start">
              <button
                type="button"
                onClick={handleOpenMenu}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                aria-label={t("openMenu")}
                aria-expanded={isMenuOpen}
                aria-haspopup="dialog"
              >
                <Menu className="h-5 w-5 text-foreground" aria-hidden />
              </button>
              <span className="sr-only">{breadcrumbScreenReaderText}</span>
            </div>
            <PortalTopbarBrandLink
              href={PORTAL_SELECTION_PATH}
              ariaLabel={tSidebar("goToPortalSelection")}
            />
            <div className="justify-self-end">
              <PortalTopbarActions />
            </div>
          </>
        ) : (
          <>
            <PortalTopbarCrumbs crumbs={crumbs} ariaLabel={t("breadcrumb")} />
            <PortalTopbarActions />
          </>
        )}
      </header>
      {showCompactChrome ? (
        <PortalNavDrawer isOpen={isMenuOpen} onClose={handleCloseMenu}>
          <AdminSidebar />
        </PortalNavDrawer>
      ) : null}
    </>
  )
}
