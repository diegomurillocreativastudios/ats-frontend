import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { VacancyPublicationSwitch } from "@/components/rrhh/vacancy-publication-switch"
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

    const facts = screen.getByText("Departamento").closest("dl")
    expect(facts).toHaveClass("grid-cols-1", "@min-[22rem]/identity:grid-cols-2")
    expect(facts?.parentElement).toHaveClass("@container/identity")
    expect(screen.getByRole("heading", { name: "Piloto titular de Fórmula 1" })).toHaveClass("wrap-break-word")
    expect(screen.queryByText("No publicada")).not.toBeInTheDocument()
  })

  it("renders the title accessory in the same row as the status", () => {
    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <VacancyReadOnlyIdentity
          title="Analista"
          companyName="Creativa"
          department="Operaciones"
          modality="Remoto"
          createdAtLabel="Creada el 1 sep 2026"
          statusLabel="Activa"
          statusClassName="bg-emerald-100 text-emerald-800"
          titleClassName="text-2xl"
          titleAccessory={
            <VacancyPublicationSwitch
              checked={false}
              onCheckedChange={() => {}}
              label={esMessages.RecruiterPortal.vacancies.detail.publication.archived}
              variant="compact"
            />
          }
        />
      </NextIntlClientProvider>
    )

    const control = screen.getByRole("switch", { name: "Archivado" })
    const row = screen.getByText("Activa").parentElement
    expect(row).toContainElement(control)
    expect(screen.queryByText("No publicada")).not.toBeInTheDocument()
  })
})
