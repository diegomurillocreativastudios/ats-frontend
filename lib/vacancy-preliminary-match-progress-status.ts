/**
 * Etapas simuladas del POST de matching preliminar en vista de vacante (RRHH).
 */
export const VACANCY_PRELIMINARY_MATCH_PROGRESS_STEPS = [
  "Potenciando tu búsqueda",
  "La IA está midiendo el encaje",
  "Alineando perfil con tu vacante",
  "Validando requisitos críticos",
  "Generando insight de match",
  "Sincronizando resultados",
] as const

export type VacancyPreliminaryMatchProgressStepLabel =
  (typeof VACANCY_PRELIMINARY_MATCH_PROGRESS_STEPS)[number]

export function getVacancyPreliminaryMatchStepIndexFromPercent(percent: number): number {
  const p = Math.min(100, Math.max(0, percent))
  if (p >= 100) return 5
  if (p <= 14) return 0
  if (p <= 28) return 1
  if (p <= 42) return 2
  if (p <= 56) return 3
  if (p <= 72) return 4
  return 5
}

export function getVacancyPreliminaryMatchStatusLabelFromPercent(
  percent: number
): string {
  return VACANCY_PRELIMINARY_MATCH_PROGRESS_STEPS[
    getVacancyPreliminaryMatchStepIndexFromPercent(percent)
  ]
}
