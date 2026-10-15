import { getTranslations } from "next-intl/server"
import { AdminPresentationRemindersContent } from "@/components/portal-admin/AdminPresentationRemindersContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal.presentationReminders")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function PortalAdminPresentationRemindersPage() {
  return <AdminPresentationRemindersContent />
}
