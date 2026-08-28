"use client"

import type { ReactNode } from "react"
import { PublicOpportunitiesNavbar } from "@/components/public/PublicOpportunitiesNavbar"
import { publicOpportunitiesTheme as theme } from "@/lib/public-opportunities-theme"

interface PublicOpportunitiesShellProps {
  children: ReactNode
  background?: ReactNode
  overlays?: ReactNode
  id?: string
  isChromeInert?: boolean
}

/**
 * Viewport-locked shell for the public opportunities portal:
 * the navbar stays visible and only the main region scrolls.
 */
export function PublicOpportunitiesShell({
  children,
  background,
  overlays,
  id,
  isChromeInert = false,
}: PublicOpportunitiesShellProps) {
  return (
    <div id={id} className={theme.page}>
      {background ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {background}
        </div>
      ) : null}

      <div
        inert={isChromeInert ? true : undefined}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <PublicOpportunitiesNavbar />
        <main className={theme.pageScroll}>{children}</main>
      </div>

      {overlays}
    </div>
  )
}
