import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MaintenanceScreen } from "@/components/maintenance/maintenance-screen"

const COPY = {
  title: "ApplicanTree está en mantenimiento",
  description: "Estamos haciendo mejoras. Volvemos en un momento.",
  loadingLabel: "Cargando…",
}

describe("MaintenanceScreen", () => {
  it("shows the logo, illustration, title, and a loading status", () => {
    const { container } = render(<MaintenanceScreen {...COPY} />)

    expect(screen.getByRole("img", { name: "ApplicanTree" })).toHaveClass(
      "h-28",
      "sm:h-40"
    )
    expect(
      container.querySelector('img[src="/ilustrations/mantenimiento.svg"]')
    ).toBeTruthy()
    expect(screen.getByRole("heading", { name: COPY.title })).toHaveClass(
      "font-display",
      "font-extrabold"
    )
    expect(screen.getByText(COPY.description)).toHaveClass(
      "font-serif",
      "font-bold",
      "italic"
    )

    const status = screen.getByRole("status")
    expect(status).toHaveTextContent(COPY.loadingLabel)
    expect(status.querySelector(".animate-spin")).toHaveClass(
      "motion-reduce:animate-none"
    )
    expect(container.querySelector("a")).toBeNull()
  })
})
