import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { RrhhPortalShell } from "@/components/rrhh/rrhh-portal-shell"
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
    { label: t("breadcrumb"), href: "/portal-rrhh/configuracion" },
    { label: t("calendarPage.title") },
  ]

  return (
    <RrhhPortalShell
      breadcrumbLabel={t("calendarPage.title")}
      breadcrumbTrail={trail}
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        }
      >
        <CalendarSettingsClient />
      </Suspense>
    </RrhhPortalShell>
  )
}
