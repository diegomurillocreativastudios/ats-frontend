"use client"

import type { ReactNode } from "react"
import RRHHSidebar from "@/components/rrhh/RRHHSidebar"
import RRHHTopbar from "@/components/rrhh/RRHHTopbar"
import type { TopbarCrumb } from "@/lib/topbar-breadcrumbs"

interface RrhhPortalShellProps {
  children: ReactNode
  breadcrumbLabel: string
  breadcrumbTrail?: TopbarCrumb[] | null
  /**
   * When true, main does not scroll itself (child owns scroll).
   * Use for list pages that pin headers/pagination.
   */
  lockMainScroll?: boolean
  /** Allow horizontal scroll on main (e.g. kanban boards). */
  allowHorizontalOverflow?: boolean
}

/**
 * Shared RRHH chrome: viewport-locked shell, sidebar from `lg`, compact topbar
 * below that, and a single scrolling main.
 */
export function RrhhPortalShell({
  children,
  breadcrumbLabel,
  breadcrumbTrail = null,
  lockMainScroll = false,
  allowHorizontalOverflow = false,
}: RrhhPortalShellProps) {
  const overflowXClass = allowHorizontalOverflow
    ? "overflow-x-auto"
    : "overflow-x-hidden"
  const mainOverflowClass = lockMainScroll
    ? "overflow-hidden overscroll-y-none"
    : `${overflowXClass} overflow-y-auto overscroll-y-contain`

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background font-sans text-foreground">
      <div className="hidden h-full min-h-0 shrink-0 lg:flex">
        <RRHHSidebar />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-y-none">
        <div className="hidden lg:block">
          <RRHHTopbar
            variant="desktop"
            breadcrumbLabel={breadcrumbLabel}
            breadcrumbTrail={breadcrumbTrail}
          />
        </div>
        <div className="lg:hidden">
          <RRHHTopbar
            variant="tablet"
            breadcrumbLabel={breadcrumbLabel}
            breadcrumbTrail={breadcrumbTrail}
          />
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
