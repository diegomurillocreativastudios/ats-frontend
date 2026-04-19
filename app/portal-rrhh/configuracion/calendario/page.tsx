import { Suspense } from "react"
import RRHHSidebar from "@/components/rrhh/RRHHSidebar"
import RRHHTopbar from "@/components/rrhh/RRHHTopbar"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { CalendarSettingsClient } from "./calendar-settings-client"

export default function CalendarSettingsPage() {
  const trail = [
    { label: "Portal RRHH", href: "/portal-rrhh/entrevistas" },
    { label: "Configuracion", href: "/portal-rrhh/configuracion" },
    { label: "Calendario" },
  ]

  const main = (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      }
    >
      <CalendarSettingsClient />
    </Suspense>
  )

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar
            variant="desktop"
            breadcrumbLabel="Calendario"
            breadcrumbTrail={trail}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            {main}
          </main>
        </div>
      </div>
      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar
          variant="tablet"
          breadcrumbLabel="Calendario"
          breadcrumbTrail={trail}
        />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {main}
        </main>
      </div>
    </div>
  )
}
