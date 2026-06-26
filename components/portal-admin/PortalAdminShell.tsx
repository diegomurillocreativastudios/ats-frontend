"use client"

import type { ReactNode } from "react"
import AdminSidebar from "@/components/portal-admin/AdminSidebar"
import AdminTopbar from "@/components/portal-admin/AdminTopbar"

export function PortalAdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col font-sans text-foreground md:flex-row">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="ambient-orb ambient-orb--green left-[-120px] top-[-80px] h-[420px] w-[420px]" />
        <div className="ambient-orb ambient-orb--blue right-[-160px] top-[20%] h-[460px] w-[460px]" />
        <div className="ambient-orb ambient-orb--violet bottom-[-140px] left-[40%] h-[420px] w-[420px]" />
      </div>
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
