"use client"

import { Suspense, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { useParams } from "next/navigation"
import { RrhhInterviewsShell } from "@/components/rrhh/interviews/rrhh-interviews-shell"
import { InterviewList } from "@/components/rrhh/interviews/interview-list"
import { useRecruiterVacancySummary } from "@/hooks/use-recruiter-vacancy-summary"
import { formatEntrevistasByVacancyDocumentTitle } from "@/lib/pageTitles"

export default function EntrevistasByVacancyPage() {
  const t = useTranslations("RecruiterPortal.interviews")
  const params = useParams()
  const raw = params?.vacancyId
  const vacancyId = Array.isArray(raw) ? raw[0] : raw ?? ""

  const vacancySummary = useRecruiterVacancySummary(vacancyId)

  useEffect(() => {
    if (!vacancyId) return
    if (vacancySummary.loading) return
    document.title = formatEntrevistasByVacancyDocumentTitle(
      vacancySummary.error ? null : vacancySummary.title
    )
  }, [
    vacancyId,
    vacancySummary.loading,
    vacancySummary.title,
    vacancySummary.error,
  ])

  const trail =
    vacancyId.length > 0
      ? [
          { label: t("breadcrumb"), href: "/portal-rrhh/entrevistas" },
          {
            label: vacancySummary.loading
              ? "…"
              : vacancySummary.title?.trim() || t("page.vacancyFallback"),
          },
        ]
      : [{ label: t("breadcrumb"), href: "/portal-rrhh/entrevistas" }]

  return (
    <RrhhInterviewsShell breadcrumbLabel={t("breadcrumb")} breadcrumbTrail={trail}>
      {vacancyId ? (
        <Suspense
          fallback={
            <div
              className="flex flex-col items-center justify-center gap-3 py-16"
              role="status"
              aria-live="polite"
            >
              <Loader2
                className="h-8 w-8 animate-spin text-vo-purple"
                aria-hidden
              />
              <p className="font-sans text-sm text-muted-foreground">
                {t("page.suspenseLoading")}
              </p>
            </div>
          }
        >
          <InterviewList vacancyId={vacancyId} vacancySummary={vacancySummary} />
        </Suspense>
      ) : (
        <p className="p-8 font-sans text-sm text-destructive" role="alert">
          {t("errors.missingVacancyId")}
        </p>
      )}
    </RrhhInterviewsShell>
  )
}
