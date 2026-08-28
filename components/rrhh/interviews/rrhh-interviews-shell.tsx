"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import RRHHSidebar from "@/components/rrhh/RRHHSidebar"
import RRHHTopbar from "@/components/rrhh/RRHHTopbar"

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
    <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden overscroll-y-none bg-background font-sans text-foreground">
      <div className="hidden min-h-0 flex-1 lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-y-none">
          <RRHHTopbar
            variant="desktop"
            breadcrumbLabel={breadcrumbLabel}
            breadcrumbTrail={breadcrumbTrail}
          />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-y-none bg-background">
            {children}
          </main>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-y-none lg:hidden">
        <RRHHTopbar
          variant="tablet"
          breadcrumbLabel={breadcrumbLabel}
          breadcrumbTrail={breadcrumbTrail}
        />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-y-none bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
