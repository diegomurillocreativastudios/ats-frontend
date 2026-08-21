import { describe, expect, it } from "vitest"

import {
  countVacancyDetailItems,
  parseVacancyDetails,
} from "@/lib/vacancies/parse-vacancy-details"

const CYBER_DETAILS = `Requisitos:
Formación en Ingeniería en Sistemas, Ciencias de la Computación o afín.
Experiencia de 1 a 3 años en ciberseguridad, preferiblemente en entornos corporativos o financieros.
Conocimiento de ISO 27001, NIST y SOC 2.
Experiencia en análisis y respuesta a incidentes de seguridad.
Gestión de riesgos y controles de proveedores.
Participación en auditorías internas o externas.
Deseable experiencia en el sector financiero.`

describe("parseVacancyDetails", () => {
  it("turns a section heading plus qualitative lines into a titled list", () => {
    expect(parseVacancyDetails(CYBER_DETAILS)).toEqual({
      kind: "list",
      sections: [
        {
          title: "Requisitos",
          items: [
            "Formación en Ingeniería en Sistemas, Ciencias de la Computación o afín.",
            "Experiencia de 1 a 3 años en ciberseguridad, preferiblemente en entornos corporativos o financieros.",
            "Conocimiento de ISO 27001, NIST y SOC 2.",
            "Experiencia en análisis y respuesta a incidentes de seguridad.",
            "Gestión de riesgos y controles de proveedores.",
            "Participación en auditorías internas o externas.",
            "Deseable experiencia en el sector financiero.",
          ],
        },
      ],
    })
  })

  it("keeps key-value lines as pairs", () => {
    expect(
      parseVacancyDetails("Departamento: Security\nModalidad: Híbrido")
    ).toEqual({
      kind: "pairs",
      pairs: [
        { key: "Departamento", value: "Security" },
        { key: "Modalidad", value: "Híbrido" },
      ],
    })
  })

  it("splits middot facts into a list", () => {
    expect(
      parseVacancyDetails("Tiempo completo · Híbrido · San Salvador")
    ).toEqual({
      kind: "list",
      sections: [
        {
          title: null,
          items: ["Tiempo completo", "Híbrido", "San Salvador"],
        },
      ],
    })
  })

  it("strips bullets before grouping facts", () => {
    expect(
      parseVacancyDetails("- Turno rotativo\n- Guardia semanal\n- Disponibilidad de viaje")
    ).toEqual({
      kind: "list",
      sections: [
        {
          title: null,
          items: ["Turno rotativo", "Guardia semanal", "Disponibilidad de viaje"],
        },
      ],
    })
  })

  it("splits a prose paragraph into sentences", () => {
    expect(
      parseVacancyDetails(
        "Se requiere inglés intermedio. La vacante reporta al CISO regional."
      )
    ).toEqual({
      kind: "list",
      sections: [
        {
          title: null,
          items: [
            "Se requiere inglés intermedio.",
            "La vacante reporta al CISO regional.",
          ],
        },
      ],
    })
  })

  it("keeps a single sentence as prose", () => {
    expect(parseVacancyDetails("Rol híbrido con base en San Salvador.")).toEqual({
      kind: "prose",
      text: "Rol híbrido con base en San Salvador.",
    })
  })

  it("returns empty for blank values", () => {
    expect(parseVacancyDetails("")).toEqual({ kind: "empty" })
    expect(parseVacancyDetails(null)).toEqual({ kind: "empty" })
  })

  it("counts list items for the card badge", () => {
    expect(countVacancyDetailItems(parseVacancyDetails(CYBER_DETAILS))).toBe(7)
  })

  it("does not turn wrapped sentence fragments into extra bullets", () => {
    const wrapped = `No buscamos:
Un analista financiero puramente de escritorio sin capacidad comercial;
Alguien orientado exclusivamente a colocar crédito sin preocupación por la capacidad de pago o la calidad
de cartera.
Experiencia mínima sugerida 2 años comprobables, idealmente entre 2 y 3 años, en colocación de créditos,
microfinanzas, MIPYME o productos financieros relacionados.`

    expect(parseVacancyDetails(wrapped)).toEqual({
      kind: "list",
      sections: [
        {
          title: "No buscamos",
          items: [
            "Un analista financiero puramente de escritorio sin capacidad comercial;",
            "Alguien orientado exclusivamente a colocar crédito sin preocupación por la capacidad de pago o la calidad de cartera.",
            "Experiencia mínima sugerida 2 años comprobables, idealmente entre 2 y 3 años, en colocación de créditos, microfinanzas, MIPYME o productos financieros relacionados.",
          ],
        },
      ],
    })
  })
})
