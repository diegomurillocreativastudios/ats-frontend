import { getTranslations } from "next-intl/server"
import AdminEmpresasContent from "@/components/portal-admin/AdminEmpresasContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal.companies")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function PortalAdminEmpresasPage() {
  return <AdminEmpresasContent />
}
