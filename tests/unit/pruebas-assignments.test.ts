import { describe, expect, it } from "vitest"

import {
  buildActiveLinkedVersionOptions,
  buildAssignmentCandidateRows,
  defaultExpiresAtYmd,
  expiresAtIsoFromYmd,
  isAllowedAttemptsValid,
  isExpiresAtValid,
} from "@/lib/pruebas/assignments"
import { MOCK_IDS, MOCK_NOW, createMockFixtures } from "@/lib/pruebas/mock-fixtures"

describe("buildActiveLinkedVersionOptions", () => {
  it("includes only active links for the vacancy", () => {
    const store = createMockFixtures()
    const options = buildActiveLinkedVersionOptions(
      MOCK_IDS.vacancyOpen,
      store.links,
      store.tests,
      store.versions,
    )
    const ids = options.map((item) => item.versionId)

    expect(ids).toEqual([MOCK_IDS.versionTechnicalV1])
    expect(ids).not.toContain(MOCK_IDS.versionPsychoV1)
  })

  it("returns empty when vacancy has no active links", () => {
    const store = createMockFixtures()
    expect(
      buildActiveLinkedVersionOptions(
        MOCK_IDS.vacancyClosed,
        store.links,
        store.tests,
        store.versions,
      ),
    ).toEqual([])
  })
})

describe("buildAssignmentCandidateRows", () => {
  it("classifies applications and omits candidates without an application", () => {
    const store = createMockFixtures()
    const rows = buildAssignmentCandidateRows({
      vacancyId: MOCK_IDS.vacancyOpen,
      testVersionId: MOCK_IDS.versionTechnicalV1,
      applications: store.applications,
      candidates: store.candidates,
      vacancies: store.vacancies,
      links: store.links,
      tests: store.tests,
      versions: store.versions,
      assignments: store.assignments,
    })

    const byId = new Map(rows.map((row) => [row.applicationId, row]))
    expect(byId.get(MOCK_IDS.appSofia)?.isEligible).toBe(true)
    expect(byId.get(MOCK_IDS.appMaria)?.reason).toBe("duplicate_assignment")
    expect(byId.get(MOCK_IDS.appCarlos)?.reason).toBe("duplicate_assignment")
    expect(byId.get(MOCK_IDS.appHired)?.isEligible).toBe(false)
    expect(byId.get(MOCK_IDS.appHired)?.reason).toBe("application_inactive")
    expect(rows.some((row) => row.candidateProfileId === MOCK_IDS.candidateLuis)).toBe(
      false,
    )
  })
})

describe("assignment expiry helpers", () => {
  it("defaults to 14 days after MOCK_NOW", () => {
    expect(defaultExpiresAtYmd(MOCK_NOW)).toBe("2026-10-27")
    expect(expiresAtIsoFromYmd("2026-10-27", MOCK_NOW)).toBe(
      "2026-10-27T18:00:00.000Z",
    )
    expect(isExpiresAtValid("2026-10-27", MOCK_NOW)).toBe(true)
    expect(isExpiresAtValid("2026-10-12", MOCK_NOW)).toBe(false)
    expect(isAllowedAttemptsValid(1)).toBe(true)
    expect(isAllowedAttemptsValid(0)).toBe(false)
  })
})
