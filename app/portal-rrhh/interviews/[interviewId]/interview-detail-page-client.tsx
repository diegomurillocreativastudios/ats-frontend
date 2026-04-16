"use client"

import { useParams, useSearchParams } from "next/navigation"
import { RrhhInterviewsShell } from "@/components/rrhh/interviews/rrhh-interviews-shell"
import { InterviewDetailPanel } from "@/components/rrhh/interviews/interview-detail-panel"

export function InterviewDetailPageClient() {
  const params = useParams()
  const searchParams = useSearchParams()
  const raw = params?.interviewId
  const interviewId = Array.isArray(raw) ? raw[0] : raw ?? ""
  const vacancyIdFromQuery = searchParams.get("vacancyId")

  const trail =
    interviewId && vacancyIdFromQuery
      ? [
          { label: "Entrevistas", href: "/portal-rrhh/entrevistas" },
          {
            label: "Vacante",
            href: `/portal-rrhh/vacantes/${encodeURIComponent(vacancyIdFromQuery)}`,
          },
          {
            label: "Listado",
            href: `/portal-rrhh/entrevistas/${encodeURIComponent(vacancyIdFromQuery)}`,
          },
          { label: "Detalle" },
        ]
      : [{ label: "Entrevistas", href: "/portal-rrhh/entrevistas" }]

  return (
    <RrhhInterviewsShell breadcrumbLabel="Detalle entrevista" breadcrumbTrail={trail}>
      {interviewId ? (
        <InterviewDetailPanel
          interviewId={interviewId}
          vacancyIdFromQuery={vacancyIdFromQuery}
        />
      ) : (
        <p className="p-8 font-inter text-sm text-destructive" role="alert">
          Falta el identificador de la entrevista.
        </p>
      )}
    </RrhhInterviewsShell>
  )
}
