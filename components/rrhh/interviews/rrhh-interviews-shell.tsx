"use client"

import type { ReactNode } from "react"
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
  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar
            variant="desktop"
            breadcrumbLabel={breadcrumbLabel}
            breadcrumbTrail={breadcrumbTrail}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <div className="flex h-full flex-col overflow-hidden lg:hidden">
        <RRHHTopbar
          variant="tablet"
          breadcrumbLabel={breadcrumbLabel}
          breadcrumbTrail={breadcrumbTrail}
        />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
