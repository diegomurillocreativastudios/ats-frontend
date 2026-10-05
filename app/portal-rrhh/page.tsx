import { getTranslations } from "next-intl/server"
import { RecruiterDashboard } from "@/components/rrhh/dashboard/recruiter-dashboard"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.recruiterDashboard")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function PortalRRHHRootPage() {
  return <RecruiterDashboard />
}
