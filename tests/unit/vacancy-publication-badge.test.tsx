import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { VacancyPublicationBadge } from "@/components/rrhh/vacancy-publication-badge"

describe("VacancyPublicationBadge", () => {
  it("renders the published state with text and icon", () => {
    const { container } = render(<VacancyPublicationBadge isPublished label="Publicado" />)

    const badge = screen.getByText("Publicado")
    expect(badge).toHaveAttribute("data-published", "true")
    expect(badge).toHaveClass("bg-vo-purple/10")
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("renders the archived state with the amber treatment", () => {
    render(<VacancyPublicationBadge isPublished={false} label="Archivado" />)

    const badge = screen.getByText("Archivado")
    expect(badge).toHaveAttribute("data-published", "false")
    expect(badge).toHaveClass("bg-amber-50", "text-amber-800")
  })
})
