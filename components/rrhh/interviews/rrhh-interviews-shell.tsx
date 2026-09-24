"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { RrhhPortalShell } from "@/components/rrhh/rrhh-portal-shell"

export interface RrhhInterviewsShellProps {
  breadcrumbLabel: string
  breadcrumbTrail?: { label: string; href?: string }[] | null
  /**
   * When true, main does not scroll (the page owns an inner scroller).
   * Results is a long document and needs the main scroller.
   */
  lockMainScroll?: boolean
  children: ReactNode
}

export function RrhhInterviewsShell({
  breadcrumbLabel,
  breadcrumbTrail = null,
  lockMainScroll = true,
  children,
}: RrhhInterviewsShellProps) {
  useEffect(() => {
    const { style } = document.body
    const prevOverflow = style.overflow
    style.overflow = "hidden"
    return () => {
      style.overflow = prevOverflow
    }
  }, [])

  return (
    <RrhhPortalShell
      breadcrumbLabel={breadcrumbLabel}
      breadcrumbTrail={breadcrumbTrail}
      lockMainScroll={lockMainScroll}
    >
      {children}
    </RrhhPortalShell>
  )
}
