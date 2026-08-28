"use client"

import { useTranslations } from "next-intl"
import { AdminPageFrame } from "@/components/portal-admin/admin-page-chrome"
import { InterviewModalitiesCrudModal } from "@/components/rrhh/interviews/interview-modalities-crud-modal"
import { InterviewStatusesCrudModal } from "@/components/rrhh/interviews/interview-statuses-crud-modal"
import { InterviewTypesCrudModal } from "@/components/rrhh/interviews/interview-types-crud-modal"

export type AdminInterviewCatalogKind = "types" | "modalities" | "statuses"

interface AdminInterviewCatalogContentProps {
  catalog: AdminInterviewCatalogKind
}

const PAGE_DESCRIPTION_KEY = {
  types: "pages.types.description",
  modalities: "pages.modalities.description",
  statuses: "pages.statuses.description",
} as const

export function AdminInterviewCatalogContent({
  catalog,
}: AdminInterviewCatalogContentProps) {
  const tCatalog = useTranslations("AdminPortal.interviews.catalog")
  const headingId = `portal-admin-interview-${catalog}-heading`

  return (
    <AdminPageFrame labelledBy={headingId}>
      {catalog === "types" ? (
        <InterviewTypesCrudModal
          variant="inline"
          headingId={headingId}
          pageDescription={tCatalog(PAGE_DESCRIPTION_KEY.types)}
        />
      ) : null}
      {catalog === "modalities" ? (
        <InterviewModalitiesCrudModal
          variant="inline"
          headingId={headingId}
          pageDescription={tCatalog(PAGE_DESCRIPTION_KEY.modalities)}
        />
      ) : null}
      {catalog === "statuses" ? (
        <InterviewStatusesCrudModal
          variant="inline"
          headingId={headingId}
          pageDescription={tCatalog(PAGE_DESCRIPTION_KEY.statuses)}
        />
      ) : null}
    </AdminPageFrame>
  )
}
