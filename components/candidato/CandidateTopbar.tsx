"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { Menu } from "lucide-react"
import ProductBrand from "@/components/branding/ProductBrand"
import {
  PortalTopbarActions,
  PortalTopbarCrumbs,
} from "@/components/navigation/portal-topbar"
import { PORTAL_SELECTION_PATH } from "@/lib/portal-access"
import {
  buildTopbarTrail,
  formatTopbarTrailText,
} from "@/lib/topbar-breadcrumbs"

const DESKTOP_PADDING = "px-8"
const MOBILE_PADDING = "px-4"
const CANDIDATE_HOME_HREF = "/portal-candidato"

interface CandidateTopbarProps {
  variant?: "desktop" | "tablet" | "mobile"
  /** Current page label (e.g. "Inicio", "Documentos"). Desktop only. */
  breadcrumbLabel?: string
}

export default function CandidateTopbar({
  variant = "desktop",
  breadcrumbLabel = "Inicio",
}: CandidateTopbarProps) {
  const t = useTranslations("Topbar")
  const tSidebar = useTranslations("Sidebar")
  const isDesktop = variant === "desktop"
  const isTablet = variant === "tablet"
  const isMobile = variant === "mobile"

  const paddingClass =
    variant === "desktop"
      ? DESKTOP_PADDING
      : variant === "tablet"
        ? "px-4 md:px-5"
        : MOBILE_PADDING

  const portalLabel = t("portalCandidate")
  const crumbs = buildTopbarTrail(
    portalLabel,
    CANDIDATE_HOME_HREF,
    null,
    breadcrumbLabel,
  )
  const breadcrumbScreenReaderText = formatTopbarTrailText(crumbs)

  const heightClass =
    variant === "mobile" ? "h-14" : variant === "tablet" ? "h-14 md:h-16" : "h-16"

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
        <div className="flex min-w-0 items-center gap-2">
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
      <PortalTopbarActions includeAdminShortcut />
    </header>
  )
}
