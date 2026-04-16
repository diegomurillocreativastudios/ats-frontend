"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { useParams } from "next/navigation"
import { RrhhInterviewsShell } from "@/components/rrhh/interviews/rrhh-interviews-shell"
import { InterviewList } from "@/components/rrhh/interviews/interview-list"
import { useRecruiterVacancySummary } from "@/hooks/use-recruiter-vacancy-summary"

export default function EntrevistasByVacancyPage() {
  const params = useParams()
  const raw = params?.vacancyId
  const vacancyId = Array.isArray(raw) ? raw[0] : raw ?? ""

  const vacancySummary = useRecruiterVacancySummary(vacancyId)

  const trail =
    vacancyId.length > 0
      ? [
          { label: "Entrevistas", href: "/portal-rrhh/entrevistas" },
          {
            label: vacancySummary.loading
              ? "…"
              : vacancySummary.title?.trim() || "Vacante",
          },
        ]
      : [{ label: "Entrevistas", href: "/portal-rrhh/entrevistas" }]

  return (
    <RrhhInterviewsShell breadcrumbLabel="Entrevistas" breadcrumbTrail={trail}>
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
              <p className="font-inter text-sm text-muted-foreground">
                Cargando…
              </p>
            </div>
          }
        >
          <InterviewList vacancyId={vacancyId} vacancySummary={vacancySummary} />
        </Suspense>
      ) : (
        <p className="p-8 font-inter text-sm text-destructive" role="alert">
          Falta el identificador de la vacante.
        </p>
      )}
    </RrhhInterviewsShell>
  )
}
