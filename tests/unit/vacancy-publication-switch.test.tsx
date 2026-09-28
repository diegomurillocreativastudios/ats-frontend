import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

import { VacancyPublicationSwitch } from "@/components/rrhh/vacancy-publication-switch"

describe("VacancyPublicationSwitch", () => {
  it("exposes checked state with a visible label and toggles on click", () => {
    const onCheckedChange = vi.fn()
    render(
      <VacancyPublicationSwitch
        checked
        onCheckedChange={onCheckedChange}
        label="Publicada en el portal"
        description="Los candidatos pueden verla."
      />
    )

    const control = screen.getByRole("switch", { name: "Publicada en el portal" })
    expect(control).toHaveAttribute("aria-checked", "true")
    expect(control).toHaveAccessibleDescription("Los candidatos pueden verla.")

    fireEvent.click(control)
    expect(onCheckedChange).toHaveBeenCalledWith(false)
  })

  it("is a native button, so keyboard activation works", () => {
    render(
      <VacancyPublicationSwitch checked={false} onCheckedChange={vi.fn()} label="Publicada" />
    )

    const control = screen.getByRole("switch", { name: "Publicada" })
    expect(control.tagName).toBe("BUTTON")
    expect(control).toHaveAttribute("type", "button")
    expect(control).toHaveAttribute("aria-checked", "false")
  })

  it("stays disabled and explains why when read-only", () => {
    const onCheckedChange = vi.fn()
    render(
      <VacancyPublicationSwitch
        checked
        onCheckedChange={onCheckedChange}
        label="Publicada"
        description="Visible"
        disabled
        disabledReason="Vacante finalizada"
      />
    )

    const control = screen.getByRole("switch", { name: "Publicada" })
    expect(control).toBeDisabled()
    expect(control).toHaveAccessibleDescription("Vacante finalizada")
    fireEvent.click(control)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it("marks busy and blocks repeated toggles", () => {
    const onCheckedChange = vi.fn()
    render(
      <VacancyPublicationSwitch
        checked
        onCheckedChange={onCheckedChange}
        label="Publicada"
        isBusy
      />
    )

    const control = screen.getByRole("switch", { name: "Publicada" })
    expect(control).toHaveAttribute("aria-busy", "true")
    expect(control).toBeDisabled()
  })
})

describe("VacancyPublicationSwitch compact", () => {
  it("uses the dynamic state as name and keeps the helper for screen readers only", () => {
    const onCheckedChange = vi.fn()
    render(
      <VacancyPublicationSwitch
        checked
        onCheckedChange={onCheckedChange}
        label="Publicado"
        description="Visible en el portal de oportunidades."
        variant="compact"
      />
    )

    const control = screen.getByRole("switch", { name: "Publicado" })
    expect(control).toHaveAttribute("aria-checked", "true")
    expect(control).toHaveAccessibleDescription("Visible en el portal de oportunidades.")
    expect(screen.getByText("Visible en el portal de oportunidades.")).toHaveClass("sr-only")
    expect(control).toHaveClass("min-h-11")

    fireEvent.click(control)
    expect(onCheckedChange).toHaveBeenCalledWith(false)
  })

  it("reports the archived state as unchecked", () => {
    render(
      <VacancyPublicationSwitch
        checked={false}
        onCheckedChange={vi.fn()}
        label="Archivado"
        variant="compact"
      />
    )

    expect(screen.getByRole("switch", { name: "Archivado" })).toHaveAttribute(
      "aria-checked",
      "false"
    )
  })

  it("shows the read-only reason visibly and blocks toggles", () => {
    const onCheckedChange = vi.fn()
    render(
      <VacancyPublicationSwitch
        checked
        onCheckedChange={onCheckedChange}
        label="Publicado"
        description="Visible"
        disabled
        disabledReason="Vacante finalizada"
        variant="compact"
      />
    )

    const control = screen.getByRole("switch", { name: "Publicado" })
    expect(control).toBeDisabled()
    expect(control).toHaveAccessibleDescription("Vacante finalizada")
    expect(screen.getByText("Vacante finalizada")).not.toHaveClass("sr-only")
    fireEvent.click(control)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it("marks busy while the update is in flight", () => {
    render(
      <VacancyPublicationSwitch
        checked={false}
        onCheckedChange={vi.fn()}
        label="Archivado"
        isBusy
        variant="compact"
      />
    )

    const control = screen.getByRole("switch", { name: "Archivado" })
    expect(control).toHaveAttribute("aria-busy", "true")
    expect(control).toBeDisabled()
  })
})
