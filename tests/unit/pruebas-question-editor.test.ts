import { describe, expect, it } from "vitest"

import {
  blankQuestion,
  filterQuestions,
  isQuestionValid,
  normalizeQuestionForSave,
  switchQuestionKind,
  validateQuestion,
} from "@/lib/pruebas/question-editor"
import type { MockQuestion } from "@/lib/pruebas/types"

describe("question-editor validation", () => {
  it("rejects empty prompt and accepts a valid single choice", () => {
    const empty = blankQuestion("single_choice")
    expect(validateQuestion(empty).promptRequired).toBe(true)
    expect(isQuestionValid(empty)).toBe(false)

    const valid: MockQuestion = {
      ...blankQuestion("single_choice"),
      prompt: "¿Cuál es 2+2?",
      options: [
        { id: "a", label: "3" },
        { id: "b", label: "4" },
      ],
      correctOptionId: "b",
      points: 2,
    }
    expect(validateQuestion(valid)).toEqual({})
    expect(isQuestionValid(valid)).toBe(true)
  })

  it("requires at least one correct option for multiple choice", () => {
    const question: MockQuestion = {
      id: "q",
      kind: "multiple_choice",
      prompt: "Selecciona",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      correctOptionIds: [],
      points: 1,
    }
    expect(validateQuestion(question).correctOptionsRequired).toBe(true)
  })

  it("requires dimension for likert and never asks for points", () => {
    const question = blankQuestion("likert", "Me adapto rápido")
    expect(validateQuestion(question).dimensionRequired).toBe(true)
    expect(validateQuestion(question).pointsRange).toBeUndefined()
    const withDim = { ...question, dimension: "Adaptabilidad" }
    expect(validateQuestion(withDim)).toEqual({})
  })

  it("requires rubric for open questions", () => {
    const question = blankQuestion("open", "Describe un caso")
    expect(validateQuestion(question).rubricRequired).toBe(true)
  })

  it("rejects negative tolerance for numeric", () => {
    const question: MockQuestion = {
      ...blankQuestion("numeric", "15% de 200"),
      expected: 30,
      tolerance: -1,
      points: 2,
    }
    expect(validateQuestion(question).toleranceRange).toBe(true)
  })
})

describe("question-editor kind switch", () => {
  it("keeps the prompt and drops incompatible fields", () => {
    const single = blankQuestion("single_choice", "Enunciado demo")
    const likert = switchQuestionKind(single, "likert")
    expect(likert.kind).toBe("likert")
    expect(likert.prompt).toBe("Enunciado demo")
    if (likert.kind === "likert") {
      expect(likert.dimension).toBe("")
      expect("points" in likert).toBe(false)
      expect("correctOptionId" in likert).toBe(false)
    }
  })
})

describe("filterQuestions", () => {
  it("filters by kind and prompt query", () => {
    const rows: MockQuestion[] = [
      blankQuestion("single_choice", "Secuencia numérica"),
      blankQuestion("likert", "Prefiero datos"),
      blankQuestion("open", "Describe un caso"),
    ]
    expect(filterQuestions(rows, { query: "datos", kind: null })).toHaveLength(1)
    expect(
      filterQuestions(rows, { query: "", kind: "likert" }).map((q) => q.kind),
    ).toEqual(["likert"])
  })
})

describe("normalizeQuestionForSave", () => {
  it("trims prompt and option labels", () => {
    const question = normalizeQuestionForSave({
      ...blankQuestion("single_choice", "  Hola  "),
      options: [
        { id: "a", label: "  A  " },
        { id: "b", label: " B " },
      ],
      correctOptionId: "a",
      points: 1,
    })
    expect(question.prompt).toBe("Hola")
    if (question.kind === "single_choice") {
      expect(question.options[0]?.label).toBe("A")
    }
  })
})
