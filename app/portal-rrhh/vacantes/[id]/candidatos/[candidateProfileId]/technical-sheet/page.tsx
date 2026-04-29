"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import RRHHSidebar from "@/components/rrhh/RRHHSidebar"
import RRHHTopbar from "@/components/rrhh/RRHHTopbar"
import { TechnicalSheetPanel } from "@/components/rrhh/technical-sheet/technical-sheet-panel"
import { useRecruiterVacancySummary } from "@/hooks/use-recruiter-vacancy-summary"

export default function VacancyCandidateTechnicalSheetPage() {
  const params = useParams()
  const rawVacancy = params?.id
  const rawCandidate = params?.candidateProfileId
  const vacancyId = Array.isArray(rawVacancy) ? rawVacancy[0] : rawVacancy ?? ""
  const candidateProfileId = Array.isArray(rawCandidate)
    ? rawCandidate[0]
    : rawCandidate ?? ""

  const vacancySummary = useRecruiterVacancySummary(vacancyId)

  const candidateLabel = useMemo(() => {
    const opt = vacancySummary.applicantOptions.find(
      (o) => o.candidateProfileId === candidateProfileId
    )
    if (opt?.label?.trim()) return opt.label.trim()
    if (candidateProfileId) return `Candidato (${candidateProfileId.slice(0, 8)}…)`
    return null
  }, [vacancySummary.applicantOptions, candidateProfileId])

  const backHref =
    vacancyId !== ""
      ? `/portal-rrhh/vacantes/${encodeURIComponent(vacancyId)}`
      : "/portal-rrhh/vacantes"

  const trail =
    vacancyId !== ""
      ? [
          { label: "Vacantes", href: "/portal-rrhh/vacantes" },
          {
            label: vacancySummary.loading
              ? "…"
              : vacancySummary.title?.trim() || "Vacante",
            href: backHref,
          },
          { label: "Ficha técnica" },
        ]
      : [{ label: "Vacantes", href: "/portal-rrhh/vacantes" }]

  if (!vacancyId || !candidateProfileId) {
    return (
      <div className="flex h-screen overflow-hidden bg-background font-sans text-foreground">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar breadcrumbLabel="RRHH" breadcrumbTrail={trail} />
          <main className="min-w-0 flex-1 overflow-auto p-8">
            <p className="font-sans text-sm text-destructive" role="alert">
              Faltan parámetros de vacante o candidato en la URL.
            </p>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans text-foreground">
      <RRHHSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <RRHHTopbar breadcrumbLabel="RRHH" breadcrumbTrail={trail} />
        <main className="min-w-0 flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            <Link
              href={backHref}
              className="inline-flex w-fit items-center gap-2 font-sans text-sm font-medium text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded-sm"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Volver a la vacante
            </Link>
            <TechnicalSheetPanel
              enabled
              vacancyId={vacancyId}
              candidateProfileId={candidateProfileId}
              vacancyTitle={vacancySummary.title}
              candidateLabel={candidateLabel}
              variant="page"
            />
          </div>
        </main>
      </div>
    </div>
  )
}
