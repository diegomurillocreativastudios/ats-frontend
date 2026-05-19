import { Eye } from "lucide-react"
import type { VacancyRecruiterReadOnlyReason } from "@/lib/vacancies/read-vacancy-recruiter-read-only"

interface VacancyReadOnlyBannerProps {
  reason?: VacancyRecruiterReadOnlyReason
}

const COPY = {
  vacancy: {
    title: "Vacante inactiva — solo lectura",
    body: "Podés consultar toda la información, pero no realizar cambios ni acciones sobre esta vacante.",
  },
  company: {
    title: "Empresa inactiva — solo lectura",
    body: "La empresa de esta vacante está inactiva. Podés consultar candidatos y etapas, pero no ejecutar búsqueda ni análisis preliminar con IA ni otras acciones de edición.",
  },
} as const

export function VacancyReadOnlyBanner({ reason = "vacancy" }: VacancyReadOnlyBannerProps) {
  const copy = reason === "company" ? COPY.company : COPY.vacancy

  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"
      role="status"
      aria-live="polite"
    >
      <Eye className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <p className="font-sans text-sm font-semibold">{copy.title}</p>
        <p className="font-sans text-sm text-amber-900/90">{copy.body}</p>
      </div>
    </div>
  )
}
