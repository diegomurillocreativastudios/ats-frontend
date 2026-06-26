/** Badge de estado de vacante — paleta earth (emerald/amber/arena en globals.css). */
export const VACANCY_STATUS_STYLES = {
  activa: { bgClass: "bg-emerald-100", textClass: "text-emerald-800" },
  cerrada: { bgClass: "bg-muted", textClass: "text-gray-600" },
  pausada: { bgClass: "bg-amber-100", textClass: "text-amber-800" },
  borrador: { bgClass: "bg-gray-100", textClass: "text-gray-700" },
  open: { bgClass: "bg-emerald-100", textClass: "text-emerald-800" },
  closed: { bgClass: "bg-muted", textClass: "text-gray-600" },
  paused: { bgClass: "bg-amber-100", textClass: "text-amber-800" },
} as const

export type VacancyStatusStyleKey = keyof typeof VACANCY_STATUS_STYLES
