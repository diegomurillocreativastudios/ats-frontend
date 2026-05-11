"use client"

import { useLayoutEffect, type ReactNode } from "react"
import RRHHSidebar from "@/components/rrhh/RRHHSidebar"
import RRHHTopbar from "@/components/rrhh/RRHHTopbar"

export interface ReportesBreadcrumbSegment {
  label: string
  href?: string
}

interface RrhhReportsShellProps {
  children: ReactNode
  breadcrumbLabel: string
  breadcrumbTrail?: ReportesBreadcrumbSegment[] | null
}

export default function RrhhReportsShell({
  children,
  breadcrumbLabel,
  breadcrumbTrail = null,
}: RrhhReportsShellProps) {
  useLayoutEffect(() => {
    const htmlOverflow = document.documentElement.style.overflow
    const bodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    return () => {
      document.documentElement.style.overflow = htmlOverflow
      document.body.style.overflow = bodyOverflow
    }
  }, [])

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full min-h-0 min-w-0 lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar
            variant="desktop"
            breadcrumbLabel={breadcrumbLabel}
            breadcrumbTrail={breadcrumbTrail}
          />
          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
            {children}
          </main>
        </div>
      </div>
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar
          variant="tablet"
          breadcrumbLabel={breadcrumbLabel}
          breadcrumbTrail={breadcrumbTrail}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
          {children}
        </main>
      </div>
    </div>
  )
}
