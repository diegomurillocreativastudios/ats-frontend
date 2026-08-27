import { describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { AdminStageStatusesContent } from "@/components/portal-admin/AdminStageStatusesContent"
import { renderWithIntl as render } from "@/tests/helpers/render-with-intl"

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(async () => [
      {
        id: "status-active",
        name: "Active",
        isDefault: true,
        final: false,
      },
      {
        id: "status-discarded",
        name: "Discarded",
        isDefault: false,
        final: true,
      },
    ]),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

describe("AdminStageStatusesContent", () => {
  it("mirrors the vacancy stages page chrome with labeled card actions", async () => {
    render(<AdminStageStatusesContent />)

    const heading = await screen.findByRole("heading", {
      name: "Estados de etapa",
    })
    const header = heading.closest("header")

    expect(header).toHaveClass("sm:flex-row")
    expect(header).toHaveClass("sm:justify-between")
    expect(
      screen.getByRole("button", { name: "Crear nuevo estado" })
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Active" })).toBeInTheDocument()
    })

    expect(
      screen.getByRole("button", { name: "Editar estado Active" })
    ).toHaveTextContent("Editar")
    expect(
      screen.getByRole("button", { name: "Eliminar estado Active" })
    ).toHaveTextContent("Eliminar")
    expect(
      screen.queryByText(/Al mover candidatos entre etapas/i)
    ).not.toBeInTheDocument()
  })
})
