"use client"

import type { ReactNode } from "react"
import AdminSidebar from "@/components/portal-admin/AdminSidebar"
import AdminTopbar from "@/components/portal-admin/AdminTopbar"

/**
 * Same chrome as candidate / RRHH: viewport-locked shell, sidebar on large
 * screens, tablet topbar below that, and a single scrolling main.
 */
export function PortalAdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background font-sans text-foreground">
      <div className="hidden h-full min-h-0 shrink-0 lg:flex">
        <AdminSidebar />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-y-none">
        <div className="hidden lg:block">
          <AdminTopbar variant="desktop" />
        </div>
        <div className="lg:hidden">
          <AdminTopbar variant="tablet" />
        </div>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
