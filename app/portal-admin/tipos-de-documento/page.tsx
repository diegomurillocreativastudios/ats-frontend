import { getTranslations } from "next-intl/server"
import { AdminIdentityDocumentTypesContent } from "@/components/portal-admin/AdminIdentityDocumentTypesContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal.documentTypes")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function PortalAdminIdentityDocumentTypesPage() {
  return <AdminIdentityDocumentTypesContent />
}
