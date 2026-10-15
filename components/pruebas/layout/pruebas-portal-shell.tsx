"use client"

import type { ReactNode } from "react"
import { PruebasSidebar } from "@/components/pruebas/layout/pruebas-sidebar"
import { PruebasTopbar } from "@/components/pruebas/layout/pruebas-topbar"

interface PruebasPortalShellProps {
  children: ReactNode
}

/**
 * Viewport-locked shell for Portal Pruebas: sidebar from lg, compact topbar
 * below that, and a single scrolling main.
 */
export function PruebasPortalShell({ children }: PruebasPortalShellProps) {
  return (
    <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background font-sans text-foreground">
      <div className="hidden h-full min-h-0 shrink-0 lg:flex">
        <PruebasSidebar />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-y-none">
        <div className="hidden lg:block">
          <PruebasTopbar variant="desktop" />
        </div>
        <div className="lg:hidden">
          <PruebasTopbar variant="tablet" />
        </div>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
