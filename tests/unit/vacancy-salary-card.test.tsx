import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { VacancySalaryCard } from "@/components/rrhh/vacancy-salary-card"
import esMessages from "@/messages/es.json"

function renderWithIntl(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe("VacancySalaryCard", () => {
  it("shows a formatted amount without a currency hint", () => {
    renderWithIntl(
      <VacancySalaryCard
        isEditing={false}
        salary="650"
        editValue=""
        onEditChange={() => {}}
      />
    )

    expect(screen.getByRole("heading", { name: "Salario" })).toBeInTheDocument()
    expect(screen.getByText(/650/)).toBeInTheDocument()
    expect(screen.queryByText("Dólares (USD)")).not.toBeInTheDocument()
  })

  it("shows a monthly caption when the text includes a period", () => {
    renderWithIntl(
      <VacancySalaryCard
        isEditing={false}
        salary="1200 / mes"
        editValue=""
        onEditChange={() => {}}
      />
    )

    expect(screen.getByText("Mensual")).toBeInTheDocument()
  })
})
