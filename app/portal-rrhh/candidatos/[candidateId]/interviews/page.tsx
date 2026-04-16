"use client"

import { useParams } from "next/navigation"
import { RrhhInterviewsShell } from "@/components/rrhh/interviews/rrhh-interviews-shell"
import { CandidateInterviewList } from "@/components/rrhh/interviews/candidate-interview-list"

export default function CandidateInterviewsPage() {
  const params = useParams()
  const raw = params?.candidateId
  const candidateProfileId = Array.isArray(raw) ? raw[0] : raw ?? ""

  const trail = candidateProfileId
    ? [
        { label: "Candidatos", href: "/portal-rrhh/candidatos" },
        {
          label: "Perfil",
          href: `/portal-rrhh/candidatos/${encodeURIComponent(candidateProfileId)}`,
        },
        { label: "Entrevistas" },
      ]
    : null

  return (
    <RrhhInterviewsShell
      breadcrumbLabel="Entrevistas"
      breadcrumbTrail={trail}
    >
      {candidateProfileId ? (
        <CandidateInterviewList candidateProfileId={candidateProfileId} />
      ) : (
        <p className="p-8 font-inter text-sm text-destructive" role="alert">
          Falta el identificador del candidato.
        </p>
      )}
    </RrhhInterviewsShell>
  )
}
