import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import esMessages from "@/messages/es.json"
import { VacancyAiSearchLoadingState } from "@/components/rrhh/vacancy-ai-search-loading-state"

describe("VacancyAiSearchLoadingState", () => {
  it("shows an active search loader with step copy and progress", () => {
    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <VacancyAiSearchLoadingState />
      </NextIntlClientProvider>
    )

    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-busy", "true")
    expect(status).toHaveTextContent("Actualizando búsqueda con IA")
    expect(status).toHaveTextContent("Explorando el banco de talento")
    expect(
      screen.getByRole("progressbar", {
        name: "Progreso de la búsqueda preliminar con IA",
      })
    ).toBeInTheDocument()
  })
})
