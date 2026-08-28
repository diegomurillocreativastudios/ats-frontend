import { describe, it, expect } from "vitest"
import {
  getVacancyPreliminarySearchStepIndexFromPercent,
  getVacancyPreliminarySearchStepKeyFromPercent,
  VACANCY_PRELIMINARY_SEARCH_PROGRESS_STEP_KEYS,
} from "@/lib/vacancy-preliminary-search-progress-status"

describe("vacancy preliminary search progress", () => {
  it("exposes four i18n step keys", () => {
    expect(VACANCY_PRELIMINARY_SEARCH_PROGRESS_STEP_KEYS).toHaveLength(4)
  })

  it("starts on the scanning step at low percent", () => {
    expect(getVacancyPreliminarySearchStepIndexFromPercent(0)).toBe(0)
    expect(getVacancyPreliminarySearchStepIndexFromPercent(22)).toBe(0)
    expect(getVacancyPreliminarySearchStepKeyFromPercent(8)).toBe(
      "searchLoadingStepScanning"
    )
  })

  it("advances through matching, ranking, and preparing", () => {
    expect(getVacancyPreliminarySearchStepIndexFromPercent(23)).toBe(1)
    expect(getVacancyPreliminarySearchStepIndexFromPercent(48)).toBe(1)
    expect(getVacancyPreliminarySearchStepIndexFromPercent(49)).toBe(2)
    expect(getVacancyPreliminarySearchStepIndexFromPercent(74)).toBe(2)
    expect(getVacancyPreliminarySearchStepIndexFromPercent(75)).toBe(3)
    expect(getVacancyPreliminarySearchStepKeyFromPercent(90)).toBe(
      "searchLoadingStepPreparing"
    )
  })

  it("clamps completed progress to the last step", () => {
    expect(getVacancyPreliminarySearchStepIndexFromPercent(100)).toBe(3)
    expect(getVacancyPreliminarySearchStepIndexFromPercent(140)).toBe(3)
    expect(getVacancyPreliminarySearchStepIndexFromPercent(-10)).toBe(0)
  })
})
