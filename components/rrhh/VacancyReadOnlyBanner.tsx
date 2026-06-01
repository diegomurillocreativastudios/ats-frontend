import { Eye, CheckCircle2 } from "lucide-react"
import type { VacancyRecruiterReadOnlyReason } from "@/lib/vacancies/read-vacancy-recruiter-read-only"

interface VacancyReadOnlyBannerProps {
  reason?: VacancyRecruiterReadOnlyReason
}

const COPY = {
  vacancy: {
    title: "Vacante inactiva — solo lectura",
    body: "Podés consultar toda la información, pero no realizar cambios ni acciones sobre esta vacante.",
    icon: Eye,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-950",
    iconColor: "text-amber-700",
    bodyTextColor: "text-amber-900/90",
  },
  company: {
    title: "Empresa inactiva — solo lectura",
    body: "La empresa de esta vacante está inactiva. Podés consultar candidatos y etapas, pero no ejecutar búsqueda ni análisis preliminar con IA ni otras acciones de edición.",
    icon: Eye,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-950",
    iconColor: "text-amber-700",
    bodyTextColor: "text-amber-900/90",
  },
  done: {
    title: "Proceso finalizado — solo lectura",
    body: "Esta vacante ha completado su proceso de reclutamiento. Podés consultar toda la información y resultados, pero no realizar cambios.",
    icon: CheckCircle2,
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    textColor: "text-emerald-950",
    iconColor: "text-emerald-700",
    bodyTextColor: "text-emerald-900/90",
  },
} as const

export function VacancyReadOnlyBanner({ reason = "vacancy" }: VacancyReadOnlyBannerProps) {
  const copy = reason === "done" ? COPY.done : reason === "company" ? COPY.company : COPY.vacancy
  const Icon = copy.icon

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border ${copy.borderColor} ${copy.bgColor} px-4 py-3 ${copy.textColor}`}
      role="status"
      aria-live="polite"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${copy.iconColor}`} aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <p className="font-sans text-sm font-semibold">{copy.title}</p>
        <p className={`font-sans text-sm ${copy.bodyTextColor}`}>{copy.body}</p>
      </div>
    </div>
  )
}
