import { beforeEach, describe, expect, it, vi } from "vitest"

const apiGet = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGet(...args),
  },
}))

import {
  getPublicVacancyByPathSegment,
  getPublicVacancyDetail,
} from "@/lib/api/public-vacancies"

const VACANCY_ID = "1d2f9cbe-9079-4794-8569-eff14f0f8943"

function httpError(status: number): Error & { status: number } {
  const err = new Error(`Solicitud fallida (${status})`) as Error & { status: number }
  err.status = status
  return err
}

describe("public vacancy detail getters", () => {
  beforeEach(() => {
    apiGet.mockReset()
  })

  it("returns null when the vacancy is unpublished or missing (404) by id", async () => {
    apiGet.mockRejectedValueOnce(httpError(404))

    await expect(getPublicVacancyDetail(VACANCY_ID)).resolves.toBeNull()
    expect(apiGet).toHaveBeenCalledWith(`/api/vacantes/${VACANCY_ID}`)
  })

  it("returns null on 404 by public slug", async () => {
    apiGet.mockRejectedValueOnce(httpError(404))

    await expect(getPublicVacancyByPathSegment("aoj-9920")).resolves.toBeNull()
    expect(apiGet).toHaveBeenCalledWith("/api/vacantes/by-public-slug/aoj-9920")
  })

  it("routes Guid path segments through the id endpoint", async () => {
    apiGet.mockRejectedValueOnce(httpError(404))

    await expect(getPublicVacancyByPathSegment(VACANCY_ID)).resolves.toBeNull()
    expect(apiGet).toHaveBeenCalledWith(`/api/vacantes/${VACANCY_ID}`)
  })

  it("rethrows server, auth, and rate-limit errors", async () => {
    for (const status of [401, 403, 429, 500]) {
      apiGet.mockRejectedValueOnce(httpError(status))
      await expect(getPublicVacancyDetail(VACANCY_ID)).rejects.toMatchObject({ status })
    }
  })

  it("rethrows network errors without a status", async () => {
    apiGet.mockRejectedValueOnce(new TypeError("Failed to fetch"))

    await expect(getPublicVacancyByPathSegment("aoj-9920")).rejects.toThrow("Failed to fetch")
  })
})
