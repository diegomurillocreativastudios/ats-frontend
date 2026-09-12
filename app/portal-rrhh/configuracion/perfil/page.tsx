import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { RrhhPortalShell } from "@/components/rrhh/rrhh-portal-shell"
import { ProfileSettingsClient } from "./profile-settings-client"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.recruiterProfile")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function RecruiterProfileSettingsPage() {
  const t = await getTranslations("RecruiterPortal.settings")
  const trail = [
    { label: t("breadcrumb"), href: "/portal-rrhh/configuracion" },
    { label: t("profilePage.title") },
  ]

  return (
    <RrhhPortalShell
      breadcrumbLabel={t("profilePage.title")}
      breadcrumbTrail={trail}
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        }
      >
        <ProfileSettingsClient />
      </Suspense>
    </RrhhPortalShell>
  )
}
