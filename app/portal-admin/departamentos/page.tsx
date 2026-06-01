import { AdminVacancyCatalogContent } from "@/components/portal-admin/AdminVacancyCatalogContent"

export const metadata = {
  title: "Departamentos",
  description: "Gestión del catálogo global de departamentos de vacantes",
}

export default function PortalAdminDepartmentCatalogPage() {
  return <AdminVacancyCatalogContent catalog="departments" />
}
