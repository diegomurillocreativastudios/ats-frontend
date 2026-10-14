import { describe, expect, it } from "vitest"

import { getPageTitle } from "@/lib/pageTitles"

describe("getPageTitle — Portal Pruebas", () => {
  it("titula el dashboard del portal", () => {
    expect(getPageTitle("/portal-pruebas")).toBe(
      "ApplicanTree | Portal Pruebas | Dashboard",
    )
  })

  it("titula secciones conocidas", () => {
    expect(getPageTitle("/portal-pruebas/evaluaciones")).toBe(
      "ApplicanTree | Portal Pruebas | Evaluaciones",
    )
    expect(getPageTitle("/portal-pruebas/preguntas")).toBe(
      "ApplicanTree | Portal Pruebas | Banco de preguntas",
    )
  })

  it("omite ids opacos de demostración en el título", () => {
    expect(getPageTitle("/portal-pruebas/evaluaciones/test-razonamiento")).toBe(
      "ApplicanTree | Portal Pruebas | Evaluaciones",
    )
    expect(
      getPageTitle("/portal-pruebas/revision/asg-diego-pending-review"),
    ).toBe("ApplicanTree | Portal Pruebas | Revisión")
  })
})
