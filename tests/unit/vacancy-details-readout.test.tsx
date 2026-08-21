import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import {
  VacancyDetailsCard,
  VacancyDetailsReadout,
} from "@/components/rrhh/vacancy-details-readout"
import esMessages from "@/messages/es.json"

const CYBER_DETAILS = `Requisitos:
Formación en Ingeniería en Sistemas, Ciencias de la Computación o afín.
Experiencia de 1 a 3 años en ciberseguridad, preferiblemente en entornos corporativos o financieros.
Conocimiento de ISO 27001, NIST y SOC 2.`

function renderWithIntl(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe("VacancyDetailsReadout", () => {
  it("lists qualitative facts without turning Requisitos into a chip", () => {
    renderWithIntl(<VacancyDetailsReadout value={CYBER_DETAILS} />)

    expect(screen.queryByRole("heading", { name: "Requisitos" })).not.toBeInTheDocument()
    expect(screen.queryByText("Requisitos:")).not.toBeInTheDocument()
    expect(screen.getByText("Formación en Ingeniería en Sistemas, Ciencias de la Computación o afín.")).toBeInTheDocument()
    expect(screen.getByText("Conocimiento de ISO 27001, NIST y SOC 2.")).toBeInTheDocument()
  })

  it("keeps a wrapped sentence as a single list item", () => {
    renderWithIntl(
      <VacancyDetailsReadout
        value={`Alguien orientado exclusivamente a colocar crédito sin preocupación por la capacidad de pago o la calidad\nde cartera.`}
      />
    )

    expect(
      screen.getByText(
        "Alguien orientado exclusivamente a colocar crédito sin preocupación por la capacidad de pago o la calidad de cartera."
      )
    ).toBeInTheDocument()
    expect(screen.queryByText("de cartera.", { exact: true })).not.toBeInTheDocument()
  })

  it("shows section titles only when there is more than one group", () => {
    renderWithIntl(
      <VacancyDetailsReadout
        value={`Requisitos:\nISO 27001.\nResponsabilidades:\nMonitoreo de incidentes.`}
      />
    )

    expect(screen.getByRole("heading", { name: "Requisitos" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Responsabilidades" })).toBeInTheDocument()
  })

  it("renders short tags as chips", () => {
    renderWithIntl(
      <VacancyDetailsReadout value="Tiempo completo · Híbrido · San Salvador" />
    )

    expect(screen.getByText("Tiempo completo")).toBeInTheDocument()
    expect(screen.getByText("Híbrido")).toBeInTheDocument()
    expect(screen.getByText("San Salvador")).toBeInTheDocument()
  })

  it("renders labeled pairs", () => {
    renderWithIntl(
      <VacancyDetailsReadout value={"Departamento: Security\nModalidad: Híbrido"} />
    )

    expect(screen.getByText("Departamento")).toBeInTheDocument()
    expect(screen.getByText("Security")).toBeInTheDocument()
    expect(screen.getByText("Modalidad")).toBeInTheDocument()
  })
})

describe("VacancyDetailsCard", () => {
  it("shows the item count next to the card title", () => {
    renderWithIntl(
      <VacancyDetailsCard
        isEditing={false}
        details={CYBER_DETAILS}
        editValue=""
        onEditChange={() => {}}
      />
    )

    expect(
      screen.getByRole("heading", { name: /Detalles de la vacante/ })
    ).toBeInTheDocument()
    expect(screen.getByText("3 criterios")).toBeInTheDocument()
    expect(screen.getByLabelText("Detalles de la vacante")).toBeInTheDocument()
  })
})
