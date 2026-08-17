import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"

import { RequirementsDisplay } from "@/components/rrhh/requirements-display"
import esMessages from "@/messages/es.json"

function renderDisplay(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe("RequirementsDisplay", () => {
  it("shows readable names, expected level, and importance out of 10", () => {
    renderDisplay(
      <RequirementsDisplay
        value={{
          Tecnica_de_carrera: "Avanzado",
          Analisis_de_datos: "Avanzado",
          Resistencia_fisica: "Avanzado",
        }}
        attributeWeights={{
          Tecnica_de_carrera: 0.9,
          Analisis_de_datos: 0.8,
          Resistencia_fisica: 0.7,
        }}
      />
    )

    expect(screen.getByText("Habilidad")).toBeInTheDocument()
    expect(screen.getByText("Nivel esperado")).toBeInTheDocument()
    expect(screen.getAllByText("Importancia").length).toBeGreaterThan(0)
    expect(screen.getByText("Tecnica de carrera")).toBeInTheDocument()
    expect(screen.getByText("Analisis de datos")).toBeInTheDocument()
    expect(screen.getByText("Resistencia fisica")).toBeInTheDocument()
    expect(screen.getAllByText("Avanzado")).toHaveLength(1)
    expect(screen.getByText("9/10")).toBeInTheDocument()
    expect(screen.getByText("8/10")).toBeInTheDocument()
    expect(screen.getByText("7/10")).toBeInTheDocument()

    const items = screen.getAllByRole("listitem")
    expect(items[0]).toHaveTextContent("Tecnica de carrera")
    expect(items[1]).toHaveTextContent("Analisis de datos")
    expect(items[2]).toHaveTextContent("Resistencia fisica")
  })

  it("keeps the level column when expected levels differ", () => {
    renderDisplay(
      <RequirementsDisplay
        value={{
          Tecnica_de_carrera: "Avanzado",
          Analisis_de_datos: "Intermedio",
        }}
        attributeWeights={{
          Tecnica_de_carrera: 0.9,
          Analisis_de_datos: 0.6,
        }}
      />
    )

    expect(screen.getByText("Avanzado")).toBeInTheDocument()
    expect(screen.getByText("Intermedio")).toBeInTheDocument()
  })
})
