"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ArrowLeft, Loader2 } from "lucide-react"
import { RrhhPortalShell } from "@/components/rrhh/rrhh-portal-shell"
import { TechnicalSheetPanel } from "@/components/rrhh/technical-sheet/technical-sheet-panel"
import { useRecruiterVacancySummary } from "@/hooks/use-recruiter-vacancy-summary"
import { useResolvedRecruiterVacancyPath } from "@/hooks/use-resolved-recruiter-vacancy-path"
import { buildRecruiterVacancyPath } from "@/lib/vacancies/vacancy-public-path"

export default function VacancyCandidateTechnicalSheetPage() {
  const t = useTranslations("RecruiterPortal.technicalSheet")
  const tVacancies = useTranslations("RecruiterPortal.vacancies")
  const params = useParams()
  const rawVacancy = params?.id
  const rawCandidate = params?.candidateProfileId
  const pathSegment = Array.isArray(rawVacancy) ? rawVacancy[0] : rawVacancy ?? ""
  const candidateProfileId = Array.isArray(rawCandidate)
    ? rawCandidate[0]
    : rawCandidate ?? ""

  const resolved = useResolvedRecruiterVacancyPath(pathSegment, {
    pathSuffix: candidateProfileId
      ? `candidatos/${encodeURIComponent(candidateProfileId)}/technical-sheet`
      : "",
  })
  const vacancyId = resolved.vacancyId
  const vacancySummary = useRecruiterVacancySummary(vacancyId)

  const candidateLabel = useMemo(() => {
    const opt = vacancySummary.applicantOptions.find(
      (o) => o.candidateProfileId === candidateProfileId
    )
    if (opt?.label?.trim()) return opt.label.trim()
    if (candidateProfileId) return `Candidato (${candidateProfileId.slice(0, 8)}…)`
    return null
  }, [vacancySummary.applicantOptions, candidateProfileId])

  const backHref = buildRecruiterVacancyPath({
    id: vacancyId || pathSegment,
    publicSlug: resolved.publicSlug,
  })

  const trail =
    pathSegment !== ""
      ? [
          { label: tVacancies("breadcrumb"), href: "/portal-rrhh/vacantes" },
          {
            label:
              resolved.loading || vacancySummary.loading
                ? "…"
                : vacancySummary.title?.trim() ||
                  tVacancies("results.page.vacancyFallback"),
            href: backHref,
          },
          { label: t("page.breadcrumb") },
        ]
      : [{ label: tVacancies("breadcrumb"), href: "/portal-rrhh/vacantes" }]

  if (!pathSegment || !candidateProfileId) {
    return (
      <RrhhPortalShell breadcrumbLabel="RRHH" breadcrumbTrail={trail}>
        <div className="p-4 md:p-8">
          <p className="font-sans text-sm text-destructive" role="alert">
            {t("errors.missingParams")}
          </p>
        </div>
      </RrhhPortalShell>
    )
  }

  if (resolved.loading) {
    return (
      <RrhhPortalShell breadcrumbLabel="RRHH" breadcrumbTrail={trail}>
        <div
          className="flex flex-col items-center justify-center gap-3 p-8"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-vo-purple" aria-hidden />
        </div>
      </RrhhPortalShell>
    )
  }

  if (resolved.error || !vacancyId) {
    return (
      <RrhhPortalShell breadcrumbLabel="RRHH" breadcrumbTrail={trail}>
        <div className="p-4 md:p-8">
          <p className="font-sans text-sm text-destructive" role="alert">
            {t("errors.missingParams")}
          </p>
        </div>
      </RrhhPortalShell>
    )
  }

  return (
    <RrhhPortalShell breadcrumbLabel="RRHH" breadcrumbTrail={trail}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-2 rounded-sm font-sans text-sm font-medium text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {t("actions.backToVacancy")}
        </Link>
        <TechnicalSheetPanel
          enabled
          vacancyId={vacancyId}
          candidateProfileId={candidateProfileId}
          vacancyTitle={vacancySummary.title}
          candidateLabel={candidateLabel}
        />
      </div>
    </RrhhPortalShell>
  )
}
