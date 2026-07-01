/**
 * Etiquetas de progreso simulado para POST tailor-to-vacancy (portal candidato).
 */
export const PROFILE_TAILORING_PROGRESS_COMPLETED_LABEL = "Completado"

export const PROFILE_TAILORING_PROGRESS_STEPS = [
  "Analizando la vacante",
  "Revisando tu perfil actual",
  "Adaptando contenido con IA",
  "Alineando habilidades y experiencia",
  "Generando resumen de cambios",
  "Calculando encaje estimado",
  "Guardando versión",
  PROFILE_TAILORING_PROGRESS_COMPLETED_LABEL,
] as const

export type ProfileTailoringProgressStepLabel =
  (typeof PROFILE_TAILORING_PROGRESS_STEPS)[number]

export function getProfileTailoringStepIndexFromPercent(percent: number): number {
  const p = Math.min(100, Math.max(0, percent))
  if (p >= 100) return 7
  if (p <= 12) return 0
  if (p <= 24) return 1
  if (p <= 36) return 2
  if (p <= 48) return 3
  if (p <= 62) return 4
  if (p <= 76) return 5
  return 6
}

export function getProfileTailoringStatusLabelFromPercent(percent: number): string {
  return PROFILE_TAILORING_PROGRESS_STEPS[getProfileTailoringStepIndexFromPercent(percent)]
}
