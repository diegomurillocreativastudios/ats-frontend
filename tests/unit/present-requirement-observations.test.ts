import { describe, expect, it } from "vitest"

import type { RequirementAssessmentView } from "@/lib/vacancies/build-attribute-table-rows"
import {
  NO_GAP_REQUIREMENTS_NOTE,
  NO_MET_REQUIREMENTS_NOTE,
  pickHardGateMessages,
  presentRequirementObservations,
} from "@/lib/vacancies/present-requirement-observations"

function assessment(
  key: string,
  verdict: RequirementAssessmentView["verdict"],
  evidence: string | null = null
): RequirementAssessmentView {
  return { key, verdict, score: null, evidence, candidateValue: null }
}

describe("presentRequirementObservations", () => {
  it("splits each observation at the next requirement key and keeps continuation sentences", () => {
    const paragraph =
      "Inglés: la información analizada indica A2. El cumplimiento es parcial. " +
      "Inventarios: la información analizada no respalda el cumplimiento. Se observó: solo cursos introductorios. " +
      "Viajes: no hay información suficiente para confirmar este requisito. Se recomienda consultarlo durante la entrevista."

    const presentation = presentRequirementObservations(
      paragraph,
      [
        assessment("Inglés", "Partial", "A2"),
        assessment("Inventarios", "NotMet", "solo cursos introductorios"),
        assessment("Viajes", "Unavailable", "dato ignorado"),
      ],
      NO_GAP_REQUIREMENTS_NOTE
    )

    expect(presentation).toEqual({
      kind: "rows",
      rows: [
        {
          key: "Inglés",
          title: "Inglés",
          verdict: "Partial",
          body: "la información analizada indica A2. El cumplimiento es parcial.",
        },
        {
          key: "Inventarios",
          title: "Inventarios",
          verdict: "NotMet",
          body: "la información analizada no respalda el cumplimiento. Se observó: solo cursos introductorios.",
        },
        {
          key: "Viajes",
          title: "Viajes",
          verdict: "Unavailable",
          body: "no hay información suficiente para confirmar este requisito. Se recomienda consultarlo durante la entrevista.",
        },
      ],
    })
  })

  it("replaces underscores in the title and leaves a written token unchanged", () => {
    const presentation = presentRequirementObservations(
      "3_years_of_experience: cinco años en producto. reactjs: se cumple este requisito con la información analizada.",
      [
        assessment("3_years_of_experience", "Met"),
        assessment("reactjs", "Met"),
      ],
      NO_MET_REQUIREMENTS_NOTE
    )

    expect(presentation.kind).toBe("rows")
    if (presentation.kind !== "rows") return
    expect(presentation.rows.map((row) => row.title)).toEqual([
      "3 years of experience",
      "reactjs",
    ])
    expect(presentation.rows[0]?.body).toBe("cinco años en producto.")
    expect(presentation.rows[1]?.body).not.toContain("reactjs:")
  })

  it("keeps a requirement key that contains spaces", () => {
    const presentation = presentRequirementObservations(
      "Dominio del inglés: la información analizada indica A2-B1. El cumplimiento es parcial.",
      [assessment("Dominio del inglés", "Partial")],
      NO_GAP_REQUIREMENTS_NOTE
    )

    expect(presentation).toMatchObject({
      kind: "rows",
      rows: [
        {
          title: "Dominio del inglés",
          body: "la información analizada indica A2-B1. El cumplimiento es parcial.",
        },
      ],
    })
  })

  it("returns the whole paragraph when it does not start with the assessment key", () => {
    const paragraph = "Destaca en Office y el perfil respalda «Excel». Conviene revisar viajes."
    expect(
      presentRequirementObservations(
        paragraph,
        [assessment("Office", "Met"), assessment("Viajes", "Unavailable")],
        NO_MET_REQUIREMENTS_NOTE
      )
    ).toEqual({ kind: "prose", text: paragraph })
  })

  it("returns the whole paragraph when a later requirement key is missing", () => {
    const paragraph = "Office: Excel. Inglés: A2."
    expect(
      presentRequirementObservations(
        paragraph,
        [
          assessment("Office", "Met"),
          assessment("Inglés", "Partial"),
          assessment("Viajes", "Unavailable"),
        ],
        NO_GAP_REQUIREMENTS_NOTE
      )
    ).toEqual({ kind: "prose", text: paragraph })
  })

  it("returns the whole paragraph when there are no assessments", () => {
    const paragraph = "Programa junior Mercedes. Experiencia en F2 y FRECA."
    expect(
      presentRequirementObservations(paragraph, [], NO_MET_REQUIREMENTS_NOTE)
    ).toEqual({ kind: "prose", text: paragraph })
  })

  it("shows the engine empty phrases as notes, without rows", () => {
    expect(
      presentRequirementObservations(
        NO_MET_REQUIREMENTS_NOTE,
        [assessment("Inglés", "NotMet")],
        NO_MET_REQUIREMENTS_NOTE
      )
    ).toEqual({ kind: "empty-note", text: NO_MET_REQUIREMENTS_NOTE })

    expect(
      presentRequirementObservations(NO_GAP_REQUIREMENTS_NOTE, [], NO_GAP_REQUIREMENTS_NOTE)
    ).toEqual({ kind: "empty-note", text: NO_GAP_REQUIREMENTS_NOTE })
  })

  it("keeps text after the last key inside that row", () => {
    const presentation = presentRequirementObservations(
      "Office: Excel. Hay más contexto en la misma observación.",
      [assessment("Office", "Met", "Excel")],
      NO_MET_REQUIREMENTS_NOTE
    )

    expect(presentation).toMatchObject({
      kind: "rows",
      rows: [{ body: "Excel. Hay más contexto en la misma observación." }],
    })
  })
})

describe("pickHardGateMessages", () => {
  it("returns failed hard-gate messages in order and skips the qualitative paragraph", () => {
    expect(
      pickHardGateMessages({
        negativeReasons: [
          { source: "qualitative", message: "Inglés: el cumplimiento es parcial." },
          { source: "hard_gate", signal: "min_score", message: "Por debajo del mínimo." },
          { Source: "hard_gate", Message: "Fuera de la región." },
          { source: "hard_gate", message: "   " },
        ],
      })
    ).toEqual(["Por debajo del mínimo.", "Fuera de la región."])
  })

  it("returns nothing when negative reasons are not a list", () => {
    expect(pickHardGateMessages({ negativeReasons: "Por debajo del mínimo." })).toEqual([])
    expect(pickHardGateMessages({})).toEqual([])
    expect(pickHardGateMessages(null)).toEqual([])
  })
})
