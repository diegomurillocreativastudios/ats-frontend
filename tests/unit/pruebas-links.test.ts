import { describe, expect, it } from "vitest"

import {
  buildLinkListRows,
  buildPublishedVersionOptions,
  partitionVacanciesForLinking,
  resolveLatestPublishedVersionId,
} from "@/lib/pruebas/links"
import { MOCK_IDS, createMockFixtures } from "@/lib/pruebas/mock-fixtures"

describe("buildPublishedVersionOptions", () => {
  it("includes only published versions of published tests", () => {
    const store = createMockFixtures()
    const options = buildPublishedVersionOptions(store.tests, store.versions)
    const ids = options.map((item) => item.versionId)

    expect(ids).toContain(MOCK_IDS.versionTechnicalV1)
    expect(ids).toContain(MOCK_IDS.versionPsychoV1)
    expect(ids).not.toContain(MOCK_IDS.versionDraft)
    expect(ids).not.toContain(MOCK_IDS.versionArchivedV1)
  })
})

describe("partitionVacanciesForLinking", () => {
  it("keeps open vacancies and notes closed ones", () => {
    const store = createMockFixtures()
    const { open, excluded } = partitionVacanciesForLinking(
      store.vacancies,
      store.companies,
    )

    expect(open.map((item) => item.vacancyId)).toEqual([MOCK_IDS.vacancyOpen])
    expect(open[0]?.companyName).toBe("Applican Demo")
    expect(excluded).toEqual([
      {
        vacancyId: MOCK_IDS.vacancyClosed,
        title: "Inventario de almacén",
        reason: "closed",
      },
    ])
  })
})

describe("buildLinkListRows", () => {
  it("sorts by linkedAt descending and resolves titles", () => {
    const store = createMockFixtures()
    const rows = buildLinkListRows(
      store.links,
      store.tests,
      store.versions,
      store.vacancies,
      store.companies,
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]?.link.id).toBe(MOCK_IDS.linkInactive)
    expect(rows[0]?.testTitle).toBe("Perfil de dimensiones")
    expect(rows[1]?.link.id).toBe(MOCK_IDS.linkActive)
    expect(rows[1]?.vacancyTitle).toBe("Analista de datos")
  })
})

describe("resolveLatestPublishedVersionId", () => {
  it("returns the highest published version and ignores drafts", () => {
    const store = createMockFixtures()
    expect(
      resolveLatestPublishedVersionId(MOCK_IDS.testTechnical, store.versions),
    ).toBe(MOCK_IDS.versionTechnicalV1)
    expect(
      resolveLatestPublishedVersionId(MOCK_IDS.testDraft, store.versions),
    ).toBeNull()
  })
})
