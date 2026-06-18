import { getTranslations } from "next-intl/server"
import { AdminInterviewsCalendarContent } from "@/components/portal-admin/interviews/AdminInterviewsCalendarContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal.interviewsCalendar")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function PortalAdminEntrevistasGeneralPage() {
  return <AdminInterviewsCalendarContent />
}
