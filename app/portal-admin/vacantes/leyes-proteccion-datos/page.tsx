import { getTranslations } from "next-intl/server"
import { AdminDataProtectionLawsContent } from "@/components/portal-admin/AdminDataProtectionLawsContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal.dataProtectionLaws")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function PortalAdminDataProtectionLawsPage() {
  return <AdminDataProtectionLawsContent />
}
