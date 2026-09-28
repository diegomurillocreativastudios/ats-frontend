"use client"

import { useLayoutEffect, type ReactNode } from "react"
import { RrhhPortalShell } from "@/components/rrhh/rrhh-portal-shell"

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
    <div data-rrhh-reports-shell>
      <RrhhPortalShell
        breadcrumbLabel={breadcrumbLabel}
        breadcrumbTrail={breadcrumbTrail}
        lockMainScroll
      >
        {children}
      </RrhhPortalShell>
    </div>
  )
}
