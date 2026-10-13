import { afterEach, describe, expect, it } from "vitest"

import { MOCK_IDS, MOCK_NOW } from "@/lib/pruebas/mock-fixtures"
import { blankQuestion } from "@/lib/pruebas/question-editor"
import {
  MockServiceError,
  assign,
  createCompatibleQuestion,
  createLink,
  createQuestion,
  debugSnapshotStore,
  duplicateTest,
  editPublishedTest,
  getQuestion,
  getTest,
  isQuestionUsedByPublishedVersion,
  listLinks,
  listQuestions,
  listTests,
  listVersions,
  publishTest,
  resetMockStore,
  setLinkActive,
  setMockScenario,
  updateDraftTest,
  updateQuestion,
} from "@/lib/pruebas/mock-service"

afterEach(() => {
  resetMockStore()
})

describe("mock-service scenarios", () => {
  it("populated lists seeded tests", async () => {
    setMockScenario("populated")
    const tests = await listTests()
    expect(tests.length).toBeGreaterThan(0)
    expect(tests.some((item) => item.id === MOCK_IDS.testTechnical)).toBe(true)
  })

  it("empty returns no rows and not_found on get", async () => {
    setMockScenario("empty")
    await expect(listTests()).resolves.toEqual([])
    await expect(getTest(MOCK_IDS.testTechnical)).rejects.toMatchObject({
      code: "not_found",
    })
  })

  it("error rejects with scenario_error without mutating", async () => {
    setMockScenario("populated")
    const before = debugSnapshotStore().assignments.length
    setMockScenario("error")
    await expect(listTests()).rejects.toBeInstanceOf(MockServiceError)
    await expect(listTests()).rejects.toMatchObject({ code: "scenario_error" })
    setMockScenario("populated")
    expect(debugSnapshotStore().assignments.length).toBe(before)
  })

  it("loading hangs until the scenario changes", async () => {
    setMockScenario("loading")
    let resolved = false
    const pending = listTests().then((tests) => {
      resolved = true
      return tests
    })
    await Promise.resolve()
    expect(resolved).toBe(false)
    setMockScenario("populated")
    const tests = await pending
    expect(resolved).toBe(true)
    expect(tests.length).toBeGreaterThan(0)
  })
})

describe("publish and edit immutability", () => {
  it("publish freezes the version and edit clones a draft", async () => {
    setMockScenario("populated")
    const publishedBefore = debugSnapshotStore().versions.find(
      (item) => item.id === MOCK_IDS.versionTechnicalV1
    )!
    const publishedSnapshot = {
      publishedAt: publishedBefore.publishedAt,
      questionIds: [...publishedBefore.questionIds],
      versionNumber: publishedBefore.versionNumber,
    }

    const { draft } = await editPublishedTest(MOCK_IDS.testTechnical)
    expect(draft.publishedAt).toBeUndefined()
    expect(draft.questionIds).toEqual(publishedSnapshot.questionIds)

    const frozen = debugSnapshotStore().versions.find(
      (item) => item.id === MOCK_IDS.versionTechnicalV1
    )!
    expect(frozen.publishedAt).toBe(publishedSnapshot.publishedAt)
    expect(frozen.questionIds).toEqual(publishedSnapshot.questionIds)
    expect(frozen.versionNumber).toBe(publishedSnapshot.versionNumber)

    await updateDraftTest(MOCK_IDS.testTechnical, {
      title: "Razonamiento lógico (revisión)",
      questionIds: [MOCK_IDS.qSingle],
    })

    const stillFrozen = debugSnapshotStore().versions.find(
      (item) => item.id === MOCK_IDS.versionTechnicalV1
    )!
    expect(stillFrozen.questionIds).toHaveLength(6)
    expect(stillFrozen.questionIds).toEqual(publishedSnapshot.questionIds)

    const republished = await publishTest(MOCK_IDS.testTechnical)
    expect(republished.versionNumber).toBe(2)
    expect(republished.publishedAt).toBe(MOCK_NOW)
    expect(republished.questionIds).toEqual([MOCK_IDS.qSingle])

    const v1 = debugSnapshotStore().versions.find(
      (item) => item.id === MOCK_IDS.versionTechnicalV1
    )!
    expect(v1.questionIds).toHaveLength(6)
  })
})

describe("createCompatibleQuestion", () => {
  it("creates single choice for technical and likert for psychometric", async () => {
    setMockScenario("populated")
    const before = (await listQuestions()).length
    const technical = await createCompatibleQuestion("technical")
    expect(technical.kind).toBe("single_choice")
    const psycho = await createCompatibleQuestion("psychometric")
    expect(psycho.kind).toBe("likert")
    if (psycho.kind === "likert") {
      expect(psycho.dimension).toBe("Análisis")
    }
    expect((await listQuestions()).length).toBe(before + 2)
  })
})

describe("question bank CRUD", () => {
  it("creates, reads and updates with q-bank ids", async () => {
    setMockScenario("populated")
    const created = await createQuestion({
      ...blankQuestion("true_false", "Todo primo es impar"),
      correct: false,
      points: 1,
    })
    expect(created.id.startsWith("q-bank-")).toBe(true)
    expect(created.kind).toBe("true_false")

    const fetched = await getQuestion(created.id)
    expect(fetched.prompt).toBe("Todo primo es impar")

    const updated = await updateQuestion(created.id, {
      ...fetched,
      prompt: "Todo primo mayor que 2 es impar",
    })
    expect(updated.prompt).toBe("Todo primo mayor que 2 es impar")
    expect(updated.id).toBe(created.id)
  })

  it("detects when a seed question is used by a published version", async () => {
    setMockScenario("populated")
    const versions = await listVersions()
    expect(
      isQuestionUsedByPublishedVersion(MOCK_IDS.qSingle, versions),
    ).toBe(true)
    expect(
      isQuestionUsedByPublishedVersion("q-missing", versions),
    ).toBe(false)
  })
})

describe("duplicateTest", () => {
  it("creates a draft copy without mutating the source or copying links", async () => {
    setMockScenario("populated")
    const sourceBefore = await getTest(MOCK_IDS.testTechnical)
    const linksBefore = await listLinks()
    const sourceVersionsBefore = await listVersions(MOCK_IDS.testTechnical)

    const copy = await duplicateTest(
      MOCK_IDS.testTechnical,
      "Copia de Razonamiento lógico",
    )

    expect(copy.lifecycleStatus).toBe("draft")
    expect(copy.title).toBe("Copia de Razonamiento lógico")
    expect(copy.id).not.toBe(MOCK_IDS.testTechnical)

    const sourceAfter = await getTest(MOCK_IDS.testTechnical)
    expect(sourceAfter).toEqual(sourceBefore)

    const copyVersions = await listVersions(copy.id)
    expect(copyVersions).toHaveLength(1)
    expect(copyVersions[0]?.publishedAt).toBeUndefined()
    expect(copyVersions[0]?.questionIds).toEqual(
      sourceVersionsBefore.find((item) => item.publishedAt)?.questionIds,
    )

    const linksAfter = await listLinks()
    expect(linksAfter).toEqual(linksBefore)
    expect(
      linksAfter.every((link) => link.testVersionId !== copyVersions[0]?.id),
    ).toBe(true)
  })

  it("duplicates a draft from its unpublished version", async () => {
    setMockScenario("populated")
    const draftVersions = await listVersions(MOCK_IDS.testDraft)
    const draftVersion = draftVersions.find((item) => !item.publishedAt)!

    const copy = await duplicateTest(MOCK_IDS.testDraft, "Copia borrador")
    const copyVersions = await listVersions(copy.id)
    expect(copyVersions[0]?.questionIds).toEqual(draftVersion.questionIds)
    expect(copyVersions[0]?.instructions).toBe(draftVersion.instructions)
  })
})

describe("createLink and setLinkActive", () => {
  it("rejects duplicate pairs including inactive links", async () => {
    setMockScenario("populated")
    const before = (await listLinks()).length
    await expect(
      createLink({
        vacancyId: MOCK_IDS.vacancyOpen,
        testVersionId: MOCK_IDS.versionPsychoV1,
      }),
    ).rejects.toMatchObject({ code: "duplicate_link" })
    expect((await listLinks()).length).toBe(before)
  })

  it("rejects closed vacancies and unpublished versions", async () => {
    setMockScenario("populated")
    await expect(
      createLink({
        vacancyId: MOCK_IDS.vacancyClosed,
        testVersionId: MOCK_IDS.versionTechnicalV1,
      }),
    ).rejects.toMatchObject({ code: "vacancy_closed" })

    await expect(
      createLink({
        vacancyId: MOCK_IDS.vacancyOpen,
        testVersionId: MOCK_IDS.versionDraft,
      }),
    ).rejects.toMatchObject({ code: "version_not_published" })

    await expect(
      createLink({
        vacancyId: MOCK_IDS.vacancyOpen,
        testVersionId: MOCK_IDS.versionArchivedV1,
      }),
    ).rejects.toMatchObject({ code: "test_not_published" })
  })

  it("creates a link after publishing a draft and can deactivate without deleting", async () => {
    setMockScenario("populated")
    await publishTest(MOCK_IDS.testDraft)
    const publishedVersion = (await listVersions(MOCK_IDS.testDraft)).find(
      (item) => item.publishedAt,
    )!
    const link = await createLink({
      vacancyId: MOCK_IDS.vacancyOpen,
      testVersionId: publishedVersion.id,
    })
    expect(link.active).toBe(true)
    expect(link.linkedAt).toBe(MOCK_NOW)

    const deactivated = await setLinkActive(link.id, false)
    expect(deactivated.active).toBe(false)
    expect(deactivated.linkedAt).toBe(MOCK_NOW)
    expect((await listLinks()).some((item) => item.id === link.id)).toBe(true)
  })
})

describe("assign all-or-nothing", () => {
  it("rejects the whole batch when any application is ineligible", async () => {
    setMockScenario("populated")
    const before = debugSnapshotStore().assignments.length
    const result = await assign({
      vacancyId: MOCK_IDS.vacancyOpen,
      testVersionId: MOCK_IDS.versionTechnicalV1,
      applicationIds: [MOCK_IDS.appSofia, MOCK_IDS.appMaria],
      expiresAt: "2026-10-27T18:00:00.000Z",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failures.some((item) => item.reason === "duplicate_assignment")).toBe(
        true
      )
    }
    expect(debugSnapshotStore().assignments.length).toBe(before)
  })

  it("creates assignments when every application is eligible", async () => {
    setMockScenario("populated")
    const before = debugSnapshotStore().assignments.length
    const result = await assign({
      vacancyId: MOCK_IDS.vacancyOpen,
      testVersionId: MOCK_IDS.versionTechnicalV1,
      applicationIds: [MOCK_IDS.appSofia],
      expiresAt: "2026-10-27T18:00:00.000Z",
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.assignments).toHaveLength(1)
      expect(result.assignments[0].applicationId).toBe(MOCK_IDS.appSofia)
    }
    expect(debugSnapshotStore().assignments.length).toBe(before + 1)
  })
})
