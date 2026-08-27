"use client"

import { useTranslations } from "next-intl"
import { AdminPageFrame } from "@/components/portal-admin/admin-page-chrome"
import EstadosModal from "@/components/rrhh/EstadosModal"

export function AdminStageStatusesContent() {
  const t = useTranslations("AdminPortal.statuses.page")

  return (
    <AdminPageFrame ariaLabel={t("regionAria")}>
      <EstadosModal variant="inline" />
    </AdminPageFrame>
  )
}
