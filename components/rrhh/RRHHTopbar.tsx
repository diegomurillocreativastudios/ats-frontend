"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Menu } from "lucide-react"
import RRHHSidebar from "@/components/rrhh/RRHHSidebar"
import { PortalNavDrawer } from "@/components/navigation/portal-nav-drawer"
import {
  PORTAL_COMPACT_TOPBAR_LAYOUT_CLASS,
  PORTAL_DESKTOP_TOPBAR_LAYOUT_CLASS,
  PortalTopbarActions,
  PortalTopbarBrandLink,
  PortalTopbarCrumbs,
} from "@/components/navigation/portal-topbar"
import { PORTAL_SELECTION_PATH } from "@/lib/portal-access"
import {
  buildTopbarTrail,
  formatTopbarTrailText,
  type TopbarCrumb,
} from "@/lib/topbar-breadcrumbs"

const DESKTOP_PADDING = "px-8"
const MOBILE_PADDING = "px-4"
const RRHH_HOME_HREF = "/portal-rrhh/candidatos"

interface RRHHTopbarProps {
  variant?: "desktop" | "tablet" | "mobile"
  breadcrumbLabel?: string
  breadcrumbTrail?: TopbarCrumb[] | null
}

export default function RRHHTopbar({
  variant = "desktop",
  breadcrumbLabel = "Dashboard",
  breadcrumbTrail = null,
}: RRHHTopbarProps) {
  const t = useTranslations("Topbar")
  const tSidebar = useTranslations("Sidebar")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const showCompactChrome = variant === "tablet" || variant === "mobile"

  const paddingClass =
    variant === "desktop"
      ? DESKTOP_PADDING
      : variant === "tablet"
        ? "px-4 md:px-5"
        : MOBILE_PADDING

  const portalLabel = t("portalRRHH")
  const crumbs = buildTopbarTrail(
    portalLabel,
    RRHH_HOME_HREF,
    breadcrumbTrail,
    breadcrumbLabel,
  )
  const breadcrumbScreenReaderText = formatTopbarTrailText(crumbs)

  const heightClass =
    variant === "mobile" ? "h-14" : variant === "tablet" ? "h-14 md:h-16" : "h-16"

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
              <PortalTopbarActions includeAdminShortcut />
            </div>
          </>
        ) : (
          <>
            <PortalTopbarCrumbs crumbs={crumbs} ariaLabel={t("breadcrumb")} />
            <PortalTopbarActions includeAdminShortcut />
          </>
        )}
      </header>
      {showCompactChrome ? (
        <PortalNavDrawer isOpen={isMenuOpen} onClose={handleCloseMenu}>
          <RRHHSidebar />
        </PortalNavDrawer>
      ) : null}
    </>
  )
}
