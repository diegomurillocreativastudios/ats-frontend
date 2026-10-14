import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  listAssessmentTests,
  getAssessmentTestDetail,
  openAssessmentTestDraft,
  createAssessmentQuestion,
  updateAssessmentQuestion,
} = vi.hoisted(() => ({
  listAssessmentTests: vi.fn(),
  getAssessmentTestDetail: vi.fn(),
  openAssessmentTestDraft: vi.fn(),
  createAssessmentQuestion: vi.fn(),
  updateAssessmentQuestion: vi.fn(),
}))

vi.mock("@/lib/api/recruiter-assessments-tests", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/recruiter-assessments-tests")
  >("@/lib/api/recruiter-assessments-tests")
  return {
    ...actual,
    listAssessmentTests: (...args: unknown[]) => listAssessmentTests(...args),
    getAssessmentTestDetail: (...args: unknown[]) =>
      getAssessmentTestDetail(...args),
    openAssessmentTestDraft: (...args: unknown[]) =>
      openAssessmentTestDraft(...args),
    createAssessmentQuestion: (...args: unknown[]) =>
      createAssessmentQuestion(...args),
    updateAssessmentQuestion: (...args: unknown[]) =>
      updateAssessmentQuestion(...args),
  }
})

import {
  createQuestionForTest,
  filterQuestionsLocally,
  getQuestionForTest,
  listQuestionsForTest,
  updateQuestionForTest,
} from "@/lib/api/recruiter-assessments-questions"
import { normalizeAssessmentQuestion } from "@/lib/api/recruiter-assessments-tests"

beforeEach(() => {
  listAssessmentTests.mockReset()
  getAssessmentTestDetail.mockReset()
  openAssessmentTestDraft.mockReset()
  createAssessmentQuestion.mockReset()
  updateAssessmentQuestion.mockReset()
})

describe("listQuestionsForTest", () => {
  it("opens a draft when none exists", async () => {
    getAssessmentTestDetail.mockResolvedValueOnce({
      test: { id: "t1", title: "Test", kind: "technical" },
      openDraft: null,
      versions: [],
      currentQuestions: [],
    })
    openAssessmentTestDraft.mockResolvedValue({
      test: { id: "t1", title: "Test", kind: "technical" },
      openDraft: { id: "vd", testId: "t1", questionIds: ["q1"] },
      versions: [],
      currentQuestions: [
        {
          id: "q1",
          kind: "single_choice",
          prompt: "Q?",
          options: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
          ],
          correctOptionId: "a",
          points: 1,
        },
      ],
    })

    const result = await listQuestionsForTest("t1")
    expect(openAssessmentTestDraft).toHaveBeenCalledWith("t1")
    expect(result.questions).toHaveLength(1)
  })
})

describe("get/create/update for test", () => {
  it("loads a question from the draft and mutates via nested API", async () => {
    const question = {
      id: "q1",
      kind: "true_false" as const,
      prompt: "T?",
      correct: true,
      points: 1,
    }
    getAssessmentTestDetail.mockResolvedValue({
      test: { id: "t1", title: "Test", kind: "technical" },
      openDraft: { id: "vd", testId: "t1", questionIds: ["q1"] },
      versions: [],
      currentQuestions: [question],
    })
    createAssessmentQuestion.mockResolvedValue({ ...question, id: "q2" })
    updateAssessmentQuestion.mockResolvedValue({
      ...question,
      id: "q1-cloned",
    })

    await expect(getQuestionForTest("t1", "q1")).resolves.toMatchObject({
      id: "q1",
    })
    await expect(getQuestionForTest("t1", "missing")).rejects.toMatchObject({
      status: 404,
    })

    await createQuestionForTest("t1", question)
    expect(createAssessmentQuestion).toHaveBeenCalledWith("t1", question)

    const updated = await updateQuestionForTest("t1", "q1", question)
    expect(updated.id).toBe("q1-cloned")
  })
})

describe("filterQuestionsLocally", () => {
  it("filters by kind and query", () => {
    const rows = [
      {
        id: "1",
        kind: "open" as const,
        prompt: "Describe leadership",
        rubric: "x",
        maxPoints: 5,
      },
      {
        id: "2",
        kind: "likert" as const,
        prompt: "I adapt quickly",
        scaleMin: 1,
        scaleMax: 5,
        dimension: "Adapt",
        reversed: false,
      },
    ]
    expect(
      filterQuestionsLocally(rows, { query: "adapt", kind: null }),
    ).toHaveLength(1)
    expect(
      filterQuestionsLocally(rows, { query: "", kind: "open" }),
    ).toHaveLength(1)
  })
})

describe("normalizeAssessmentQuestion version link", () => {
  it("prefers questionId and keeps versionQuestionId", () => {
    const question = normalizeAssessmentQuestion({
      versionQuestionId: "link-1",
      questionId: "q-real",
      type: 0,
      prompt: "Pick one",
      points: 2,
      options: [
        { id: "o1", label: "A", isCorrect: true },
        { id: "o2", label: "B", isCorrect: false },
      ],
    })
    expect(question).toMatchObject({
      id: "q-real",
      versionQuestionId: "link-1",
      kind: "single_choice",
      correctOptionId: "o1",
    })
  })
})
