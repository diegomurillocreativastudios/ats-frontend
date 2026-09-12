"use client"

import type { ReactNode } from "react"
import CandidateSidebar from "@/components/candidato/CandidateSidebar"
import CandidateTopbar from "@/components/candidato/CandidateTopbar"

interface CandidatePortalShellProps {
  children: ReactNode
  breadcrumbLabel?: string
  /**
   * When true, main does not scroll itself (child owns scroll).
   */
  lockMainScroll?: boolean
}

/**
 * Shared candidate portal chrome: viewport-locked shell, sidebar from `lg`,
 * compact topbar below that, and a single scrolling main.
 */
export function CandidatePortalShell({
  children,
  breadcrumbLabel = "Inicio",
  lockMainScroll = false,
}: CandidatePortalShellProps) {
  const mainOverflowClass = lockMainScroll
    ? "overflow-hidden overscroll-y-none"
    : "overflow-x-hidden overflow-y-auto overscroll-y-contain"

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background font-sans text-foreground">
      <div className="hidden h-full min-h-0 shrink-0 lg:flex">
        <CandidateSidebar />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-y-none">
        <div className="hidden lg:block">
          <CandidateTopbar variant="desktop" breadcrumbLabel={breadcrumbLabel} />
        </div>
        <div className="lg:hidden">
          <CandidateTopbar variant="tablet" breadcrumbLabel={breadcrumbLabel} />
        </div>
        <main
          className={`flex min-h-0 min-w-0 flex-1 flex-col bg-background ${mainOverflowClass}`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
