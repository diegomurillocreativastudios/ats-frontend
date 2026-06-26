import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import RRHHSidebar from "@/components/rrhh/RRHHSidebar"
import RRHHTopbar from "@/components/rrhh/RRHHTopbar"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { CalendarSettingsClient } from "./calendar-settings-client"

export async function generateMetadata() {
  const t = await getTranslations("RecruiterPortal.settings.calendarPage")
  return {
    title: t("title"),
    description: t("pageDescription"),
  }
}

export default async function CalendarSettingsPage() {
  const t = await getTranslations("RecruiterPortal.settings")
  const trail = [
    { label: t("portalCrumb"), href: "/portal-rrhh/entrevistas" },
    { label: t("breadcrumb"), href: "/portal-rrhh/configuracion" },
    { label: t("calendarPage.title") },
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
            breadcrumbLabel={t("calendarPage.title")}
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
          breadcrumbLabel={t("calendarPage.title")}
          breadcrumbTrail={trail}
        />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {main}
        </main>
      </div>
    </div>
  )
}
