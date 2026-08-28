import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { VacancyReadOnlyIdentity } from "@/components/rrhh/vacancy-read-only-identity"
import esMessages from "@/messages/es.json"

describe("VacancyReadOnlyIdentity", () => {
  it("shows title, status, company, and labeled facts", () => {
    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <VacancyReadOnlyIdentity
          title="Piloto titular de Fórmula 1"
          companyName="Mercedes Benz"
          department="Estrategia de carrera"
          modality="Presencial"
          countryCode="DE"
          stateCode="BW"
          createdAtLabel="Creada el 13 ago 2026"
          statusLabel="Activa"
          statusClassName="bg-emerald-100 text-emerald-800"
          titleClassName="text-2xl"
        />
      </NextIntlClientProvider>
    )

    expect(screen.getByRole("heading", { name: "Piloto titular de Fórmula 1" })).toBeInTheDocument()
    expect(screen.getByText("Activa")).toBeInTheDocument()
    expect(screen.getByText("Mercedes Benz")).toBeInTheDocument()
    expect(screen.getByText("Departamento")).toBeInTheDocument()
    expect(screen.getByText("Estrategia de carrera")).toBeInTheDocument()
    expect(screen.getByText("Modalidad")).toBeInTheDocument()
    expect(screen.getByText("Presencial")).toBeInTheDocument()
    expect(screen.getByText("Ubicación")).toBeInTheDocument()
    expect(screen.getByText("Creada el 13 ago 2026")).toBeInTheDocument()
  })
})
