"use client"

import type { ReactNode } from "react"
import AdminSidebar from "@/components/portal-admin/AdminSidebar"
import AdminTopbar from "@/components/portal-admin/AdminTopbar"

export function PortalAdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-inter text-foreground md:flex-row">
      <AdminSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="hidden md:block">
          <AdminTopbar variant="desktop" />
        </div>
        <div className="md:hidden">
          <AdminTopbar variant="tablet" />
        </div>
        {children}
      </div>
    </div>
  )
}
