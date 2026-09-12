import { afterEach, describe, expect, it } from "vitest"
import { fireEvent, screen } from "@testing-library/react"

import { ResponsiveFilters } from "@/components/ui/responsive-filters"
import { renderWithIntl } from "@/tests/helpers/render-with-intl"
import { stubMatchMedia } from "@/tests/helpers/stub-match-media"

function renderFilters() {
  return renderWithIntl(
    <ResponsiveFilters
      toggleLabel="Filtros"
      title="Filtros"
      regionLabel="Filtros de prueba"
    >
      <label htmlFor="filtro-demo">
        Cliente
        <input id="filtro-demo" />
      </label>
    </ResponsiveFilters>,
  )
}

describe("ResponsiveFilters", () => {
  afterEach(() => {
    stubMatchMedia(false)
  })

  it("en desktop muestra los campos en línea y no el botón Filtros", () => {
    stubMatchMedia(false)
    renderFilters()

    expect(screen.queryByRole("button", { name: "Filtros" })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Cliente")).toBeVisible()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("bajo 1024px abre los campos en un modal y no empuja el listado", () => {
    stubMatchMedia(true)
    renderFilters()

    const toggle = screen.getByRole("button", { name: "Filtros" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByLabelText("Cliente")).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("dialog", { name: "Filtros" })).toBeInTheDocument()
    expect(screen.getByLabelText("Cliente")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Cliente")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Filtros" })).toBeInTheDocument()
  })
})
