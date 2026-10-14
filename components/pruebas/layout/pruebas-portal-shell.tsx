"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { MockDemoNotice } from "@/components/pruebas/shared/mock-demo-notice"
import { PruebasSidebar } from "@/components/pruebas/layout/pruebas-sidebar"
import { PruebasTopbar } from "@/components/pruebas/layout/pruebas-topbar"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"

interface PruebasPortalShellProps {
  children: ReactNode
}

function isPruebasHomePath(pathname: string | null): boolean {
  if (!pathname) return false
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname
  return normalized === PRUEBAS_HOME_HREF
}

/**
 * Viewport-locked shell for Portal Pruebas: sidebar from lg, compact topbar
 * below that, demo notice once above page content (except Inicio, which uses
 * live dashboard data), and a single scrolling main.
 */
export function PruebasPortalShell({ children }: PruebasPortalShellProps) {
  const t = useTranslations("PruebasPortal")
  const pathname = usePathname()
  const showDemoNotice = !isPruebasHomePath(pathname)

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
          {showDemoNotice ? (
            <div className="px-4 pt-4 md:px-6 lg:px-8">
              <MockDemoNotice label={t("demoNotice")} />
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  )
}
