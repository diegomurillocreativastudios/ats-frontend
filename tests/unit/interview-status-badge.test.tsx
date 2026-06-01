import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { InterviewStatusBadge } from "@/components/rrhh/interviews/interview-status-badge"

describe("InterviewStatusBadge", () => {
  it("muestra etiqueta en español para Scheduled", () => {
    render(<InterviewStatusBadge status="Scheduled" />)
    expect(screen.getByTestId("interview-status-badge")).toHaveTextContent(
      "Programada"
    )
  })

  it("expone el estado en data-status para pruebas", () => {
    render(<InterviewStatusBadge status="Completed" />)
    expect(screen.getByTestId("interview-status-badge")).toHaveAttribute(
      "data-status",
      "Completed"
    )
  })

  it("usa label del API cuando se pasa label", () => {
    render(
      <InterviewStatusBadge
        status="Cancelled"
        label="Cancelada (API)"
      />
    )
    expect(screen.getByTestId("interview-status-badge")).toHaveTextContent(
      "Cancelada (API)"
    )
  })
})
