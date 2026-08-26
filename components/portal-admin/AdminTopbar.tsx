"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Menu } from "lucide-react"
import ProductBrand from "@/components/branding/ProductBrand"
import {
  PortalTopbarActions,
  PortalTopbarCrumbs,
} from "@/components/navigation/portal-topbar"
import { resolveAdminPortalNavLabelKey } from "@/lib/admin-portal-nav"
import { PORTAL_SELECTION_PATH } from "@/lib/portal-access"
import { segmentToTitle } from "@/lib/pageTitles"
import {
  buildTopbarTrail,
  formatTopbarTrailText,
  type TopbarCrumb,
} from "@/lib/topbar-breadcrumbs"

const DESKTOP_PADDING = "px-8"
const MOBILE_PADDING = "px-4"
const ADMIN_HOME_HREF = "/portal-admin/usuarios"

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

export default function AdminTopbar({
  variant = "desktop",
  breadcrumbLabel: breadcrumbLabelProp,
  breadcrumbTrail = null,
}: AdminTopbarProps) {
  const t = useTranslations("Topbar")
  const tNav = useTranslations("Navigation")
  const tSidebar = useTranslations("Sidebar")
  const pathname = usePathname()
  const isDesktop = variant === "desktop"
  const isTablet = variant === "tablet"
  const isMobile = variant === "mobile"

  const breadcrumbLabel =
    breadcrumbLabelProp ??
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
    ADMIN_HOME_HREF,
    breadcrumbTrail,
    breadcrumbLabel,
  )
  const breadcrumbScreenReaderText = formatTopbarTrailText(crumbs)

  const heightClass =
    variant === "mobile"
      ? "h-14"
      : variant === "tablet"
        ? "h-14 md:h-16"
        : "h-16"

  return (
    <header
      className={`glass-navbar flex shrink-0 items-center justify-between ${heightClass} ${paddingClass}`}
      role="banner"
    >
      <div className="flex min-w-0 items-center gap-4">
        {isTablet || isMobile ? (
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            aria-label={t("openMenu")}
          >
            <Menu className="h-5 w-5 text-foreground" aria-hidden />
          </button>
        ) : null}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isDesktop ? (
            <PortalTopbarCrumbs
              crumbs={crumbs}
              ariaLabel={t("breadcrumb")}
            />
          ) : null}
          {isTablet || isMobile ? (
            <Link
              href={PORTAL_SELECTION_PATH}
              className="flex min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
              aria-label={tSidebar("goToPortalSelection")}
            >
              <ProductBrand
                layout="inline"
                tone="onLight"
                density="topbarMobile"
                className="min-w-0 shrink"
              />
            </Link>
          ) : null}
          {!isDesktop ? (
            <span className="sr-only">{breadcrumbScreenReaderText}</span>
          ) : null}
        </div>
      </div>
      <PortalTopbarActions />
    </header>
  )
}
