import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { VacancyListFilters } from "@/components/rrhh/VacancyListFilters"
import { EMPTY_VACANCY_LIST_FILTERS } from "@/lib/vacancies/filter-vacancy-list"
import esMessages from "@/messages/es.json"
import { stubMatchMedia } from "@/tests/helpers/stub-match-media"

vi.mock("@/lib/api/admin-vacancy-catalogs", () => ({
  listAdminVacancyCatalog: vi.fn(async () => []),
}))

vi.mock("@/lib/api/recruiter-companies", () => ({
  listRecruiterCompanies: vi.fn(async () => []),
}))

function renderFilters() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <VacancyListFilters
        value={EMPTY_VACANCY_LIST_FILTERS}
        onChange={() => {}}
      />
    </NextIntlClientProvider>,
  )
}

describe("VacancyListFilters", () => {
  afterEach(() => {
    stubMatchMedia(false)
  })

  it("en desktop deja los campos visibles sin botón Filtros", () => {
    stubMatchMedia(false)
    renderFilters()

    expect(screen.queryByRole("button", { name: "Filtros" })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Nombre")).toBeVisible()
    expect(screen.getByLabelText("Filtrar por Empresa")).toBeVisible()
  })

  it("bajo 1024px abre los campos en un modal", () => {
    stubMatchMedia(true)
    renderFilters()

    const toggle = screen.getByRole("button", { name: "Filtros" })
    expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.getByRole("dialog", { name: "Filtros" })).toBeInTheDocument()
    expect(screen.getByLabelText("Nombre")).toBeVisible()
    expect(screen.getByLabelText("Filtrar por Empresa")).toBeVisible()
  })
})
