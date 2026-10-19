import { describe, expect, it } from "vitest"

import {
  blankQuestion,
  filterQuestions,
  isQuestionValid,
  normalizeQuestionForSave,
  readChoiceDraft,
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

  it("keeps written options when switching between single and multiple choice", () => {
    const single: MockQuestion = {
      ...blankQuestion("single_choice", "Que es React.js"),
      options: [
        { id: "a", label: "Una librería" },
        { id: "b", label: "Un lenguaje" },
        { id: "c", label: "Un framework" },
      ],
      correctOptionId: "a",
      points: 4,
    }

    const multiple = switchQuestionKind(single, "multiple_choice")
    expect(multiple.kind).toBe("multiple_choice")
    if (multiple.kind !== "multiple_choice") return
    expect(multiple.prompt).toBe("Que es React.js")
    expect(multiple.options.map((option) => option.label)).toEqual([
      "Una librería",
      "Un lenguaje",
      "Un framework",
    ])
    expect(multiple.correctOptionIds).toEqual(["a"])
    expect(multiple.points).toBe(4)

    const back = switchQuestionKind(
      { ...multiple, correctOptionIds: ["a", "c"] },
      "single_choice",
    )
    expect(back.kind).toBe("single_choice")
    if (back.kind !== "single_choice") return
    expect(back.options.map((option) => option.label)).toEqual([
      "Una librería",
      "Un lenguaje",
      "Un framework",
    ])
    expect(back.correctOptionId).toBe("a")
    expect(back.points).toBe(4)
  })

  it("restores options after leaving a choice type and coming back", () => {
    const single: MockQuestion = {
      ...blankQuestion("single_choice", "Enunciado"),
      options: [
        { id: "a", label: "Sí" },
        { id: "b", label: "No" },
      ],
      correctOptionId: "b",
      points: 2,
    }
    const draft = readChoiceDraft(single)
    const likert = switchQuestionKind(single, "likert", draft)
    expect(likert.kind).toBe("likert")

    const restored = switchQuestionKind(likert, "multiple_choice", draft)
    expect(restored.kind).toBe("multiple_choice")
    if (restored.kind !== "multiple_choice") return
    expect(restored.prompt).toBe("Enunciado")
    expect(restored.options.map((option) => option.label)).toEqual(["Sí", "No"])
    expect(restored.correctOptionIds).toEqual(["b"])
    expect(restored.points).toBe(2)
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
