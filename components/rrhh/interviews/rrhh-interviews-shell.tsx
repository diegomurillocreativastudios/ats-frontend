"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { RrhhPortalShell } from "@/components/rrhh/rrhh-portal-shell"

export interface RrhhInterviewsShellProps {
  breadcrumbLabel: string
  breadcrumbTrail?: { label: string; href?: string }[] | null
  children: ReactNode
}

export function RrhhInterviewsShell({
  breadcrumbLabel,
  breadcrumbTrail = null,
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
      lockMainScroll
    >
      {children}
    </RrhhPortalShell>
  )
}
