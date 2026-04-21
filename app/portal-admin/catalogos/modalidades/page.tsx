import { AdminVacancyCatalogContent } from "@/components/portal-admin/AdminVacancyCatalogContent"

export const metadata = {
  title: "Modalidades",
  description: "Gestión del catálogo global de modalidades de vacantes",
}

export default function PortalAdminModalityCatalogPage() {
  return <AdminVacancyCatalogContent catalog="modalities" />
}
