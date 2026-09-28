"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useResolvedRecruiterVacancyPath } from "@/hooks/use-resolved-recruiter-vacancy-path"

/** Compatibilidad: el alta abre el modal en el listado de entrevistas de la vacante. */
export default function LegacyVacancyInterviewsNewRedirect() {
  const params = useParams()
  const router = useRouter()
  const raw = params?.id
  const pathSegment = Array.isArray(raw) ? raw[0] : raw ?? ""
  const resolved = useResolvedRecruiterVacancyPath(pathSegment, {
    replaceCanonical: false,
  })

  useEffect(() => {
    if (resolved.loading) return
    if (resolved.vacancyId) {
      router.replace(
        `/portal-rrhh/entrevistas/${encodeURIComponent(resolved.vacancyId)}?nueva=1`
      )
    }
  }, [resolved.loading, resolved.vacancyId, router])

  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-vo-purple" aria-hidden />
    </div>
  )
}
