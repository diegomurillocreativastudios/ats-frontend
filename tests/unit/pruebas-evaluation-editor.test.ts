import { describe, expect, it } from "vitest"

import {
  attachQuestionId,
  emptyEditorForm,
  filterCompatibleQuestions,
  formsEqual,
  incompatibleQuestionIds,
  isQuestionCompatible,
  isStepValid,
  nextPublishedVersionNumber,
  removeQuestionId,
  reorderQuestionIds,
  totalTechnicalPoints,
  uniqueDimensions,
  validateConfigStep,
  validateInfoStep,
  validateQuestionsStep,
} from "@/lib/pruebas/evaluation-editor"
import type {
  MockAssessmentVersion,
  MockQuestion,
} from "@/lib/pruebas/types"

const technicalQuestions: MockQuestion[] = [
  {
    id: "q1",
    kind: "single_choice",
    prompt: "A",
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ],
    correctOptionId: "a",
    points: 2,
  },
  {
    id: "q2",
    kind: "open",
    prompt: "Open",
    rubric: "Rubric",
    maxPoints: 5,
  },
]

const likert: MockQuestion = {
  id: "qL",
  kind: "likert",
  prompt: "L",
  scaleMin: 1,
  scaleMax: 5,
  dimension: "Análisis",
  reversed: false,
}

describe("question compatibility", () => {
  it("allows scored kinds for technical and only likert for psychometric", () => {
    expect(isQuestionCompatible("technical", "single_choice")).toBe(true)
    expect(isQuestionCompatible("technical", "open")).toBe(true)
    expect(isQuestionCompatible("technical", "numeric")).toBe(false)
    expect(isQuestionCompatible("technical", "likert")).toBe(false)
    expect(isQuestionCompatible("psychometric", "likert")).toBe(true)
    expect(isQuestionCompatible("psychometric", "numeric")).toBe(false)
  })

  it("filters bank and reports incompatible attached ids", () => {
    const bank = [...technicalQuestions, likert]
    expect(filterCompatibleQuestions("psychometric", bank)).toEqual([likert])
    expect(
      incompatibleQuestionIds("psychometric", ["q1", "qL"], bank),
    ).toEqual(["q1"])
  })
})

describe("step validation", () => {
  it("validates info limits", () => {
    expect(
      validateInfoStep({
        title: "",
        description: "ok",
        kind: "technical",
      }),
    ).toEqual({ titleRequired: true })

    expect(
      validateInfoStep({
        title: "x".repeat(121),
        description: "ok",
        kind: "technical",
      }),
    ).toEqual({ titleTooLong: true })

    expect(
      Object.keys(
        validateInfoStep({
          title: "Title",
          description: "Description",
          kind: "technical",
        }),
      ),
    ).toHaveLength(0)
  })

  it("validates config integers and instructions", () => {
    expect(
      validateConfigStep({
        instructions: "  ",
        durationMinutes: 45,
        maxAttempts: 1,
      }),
    ).toEqual({ instructionsRequired: true })

    expect(
      validateConfigStep({
        instructions: "Go",
        durationMinutes: 0,
        maxAttempts: 9,
      }),
    ).toEqual({ durationInvalid: true, attemptsInvalid: true })
  })

  it("requires at least one compatible question", () => {
    const form = emptyEditorForm("technical")
    expect(validateQuestionsStep(form, technicalQuestions)).toEqual({
      questionsRequired: true,
    })

    form.questionIds = ["q1"]
    expect(validateQuestionsStep(form, technicalQuestions)).toEqual({})

    form.kind = "psychometric"
    form.questionIds = ["q1"]
    expect(validateQuestionsStep(form, technicalQuestions)).toEqual({
      questionsIncompatible: true,
    })
  })

  it("isStepValid for preview after all steps pass", () => {
    const form = {
      ...emptyEditorForm("technical"),
      title: "T",
      description: "D",
      instructions: "I",
      durationMinutes: 30,
      maxAttempts: 2,
      questionIds: ["q1"],
    }
    expect(isStepValid("preview", form, technicalQuestions)).toBe(true)
    expect(isStepValid("questions", form, [])).toBe(false)
  })
})

describe("version and scoring helpers", () => {
  it("computes next published version number", () => {
    const versions: MockAssessmentVersion[] = [
      {
        id: "v1",
        testId: "t1",
        versionNumber: 1,
        instructions: "",
        durationMinutes: 10,
        maxAttempts: 1,
        publishedAt: "2026-01-01T00:00:00.000Z",
        questionIds: [],
      },
      {
        id: "v0",
        testId: "t1",
        versionNumber: 0,
        instructions: "",
        durationMinutes: 10,
        maxAttempts: 1,
        questionIds: [],
      },
    ]
    expect(nextPublishedVersionNumber(versions, "t1")).toBe(2)
    expect(nextPublishedVersionNumber([], "t1")).toBe(1)
  })

  it("sums technical points and lists dimensions", () => {
    expect(totalTechnicalPoints(technicalQuestions)).toBe(7)
    expect(uniqueDimensions([likert])).toEqual(["Análisis"])
  })
})

describe("question id list helpers", () => {
  it("attaches, removes and reorders without duplicates", () => {
    expect(attachQuestionId(["a"], "a")).toEqual(["a"])
    expect(attachQuestionId(["a"], "b")).toEqual(["a", "b"])
    expect(removeQuestionId(["a", "b"], "a")).toEqual(["b"])
    expect(reorderQuestionIds(["a", "b", "c"], 1, "up")).toEqual([
      "b",
      "a",
      "c",
    ])
    expect(reorderQuestionIds(["a", "b"], 0, "up")).toEqual(["a", "b"])
  })

  it("compares forms", () => {
    const a = emptyEditorForm()
    const b = emptyEditorForm()
    expect(formsEqual(a, b)).toBe(true)
    b.title = "x"
    expect(formsEqual(a, b)).toBe(false)
  })
})
