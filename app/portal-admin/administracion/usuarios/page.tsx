import { getTranslations } from "next-intl/server"
import AdminUsuariosContent from "@/components/portal-admin/AdminUsuariosContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal.users")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function PortalAdminUsuariosPage() {
  return <AdminUsuariosContent />
}
