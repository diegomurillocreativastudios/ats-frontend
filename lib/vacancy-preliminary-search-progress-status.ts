export const VACANCY_PRELIMINARY_SEARCH_PROGRESS_STEP_KEYS = [
  "searchLoadingStepScanning",
  "searchLoadingStepMatching",
  "searchLoadingStepRanking",
  "searchLoadingStepPreparing",
] as const

export type VacancyPreliminarySearchProgressStepKey =
  (typeof VACANCY_PRELIMINARY_SEARCH_PROGRESS_STEP_KEYS)[number]

/**
 * Maps simulated search progress to a cycling status step.
 */
export function getVacancyPreliminarySearchStepIndexFromPercent(
  percent: number
): number {
  const p = Math.min(100, Math.max(0, percent))
  if (p >= 100) return 3
  if (p <= 22) return 0
  if (p <= 48) return 1
  if (p <= 74) return 2
  return 3
}

/**
 * Returns the i18n key for the current preliminary-search loading step.
 */
export function getVacancyPreliminarySearchStepKeyFromPercent(
  percent: number
): VacancyPreliminarySearchProgressStepKey {
  return VACANCY_PRELIMINARY_SEARCH_PROGRESS_STEP_KEYS[
    getVacancyPreliminarySearchStepIndexFromPercent(percent)
  ]
}
