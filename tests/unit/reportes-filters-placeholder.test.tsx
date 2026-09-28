import { afterEach, describe, expect, it } from "vitest"
import { fireEvent, screen } from "@testing-library/react"

import ReportesFiltersPlaceholder, {
  ReportesFilterControl,
  hasActiveReportFilterValues,
} from "@/components/rrhh/reportes/reportes-filters-placeholder"
import { renderWithIntl } from "@/tests/helpers/render-with-intl"
import { stubMatchMedia } from "@/tests/helpers/stub-match-media"

function renderFilters() {
  return renderWithIntl(
    <ReportesFiltersPlaceholder>
      <ReportesFilterControl label="Cliente" controlId="filtro-cliente">
        <input id="filtro-cliente" />
      </ReportesFilterControl>
    </ReportesFiltersPlaceholder>,
  )
}

describe("ReportesFiltersPlaceholder", () => {
  afterEach(() => {
    stubMatchMedia(false)
  })

  it("en desktop deja los campos visibles sin botón Filtros", () => {
    stubMatchMedia(false)
    renderFilters()

    expect(screen.queryByRole("button", { name: "Filtros" })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Cliente")).toBeVisible()
  })

  it("bajo 1024px abre los campos en un modal", () => {
    stubMatchMedia(true)
    renderFilters()

    expect(screen.queryByLabelText("Cliente")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Filtros" }))
    expect(screen.getByRole("dialog", { name: "Filtros" })).toBeInTheDocument()
    expect(screen.getByLabelText("Cliente")).toBeVisible()
    expect(screen.getByText(/query params/i)).toBeVisible()
  })
})

describe("hasActiveReportFilterValues", () => {
  it("detecta valores vacíos y aplicados", () => {
    expect(hasActiveReportFilterValues({ clientId: "", dateFrom: "" })).toBe(false)
    expect(hasActiveReportFilterValues({ clientId: "acme" })).toBe(true)
  })
})
