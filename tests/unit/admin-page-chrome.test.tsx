import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { Building2 } from "lucide-react"
import {
  AdminDataTable,
  AdminEmptyState,
  AdminErrorPanel,
  AdminPageFrame,
  ADMIN_TR_CLASS,
} from "@/components/portal-admin/admin-page-chrome"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { renderWithIntl as render } from "@/tests/helpers/render-with-intl"

describe("admin page chrome", () => {
  it("keeps title and primary action on the same row in split headers", () => {
    render(
      <AdminPageFrame labelledBy="admin-chrome-heading">
        <PortalPageHeader
          id="admin-chrome-heading"
          layout="split"
          title="Departamentos"
          description="Catálogo de departamentos"
          actions={<button type="button">Crear departamento</button>}
        />
      </AdminPageFrame>
    )

    const heading = screen.getByRole("heading", { name: "Departamentos" })
    const header = heading.closest("header")

    expect(header).toHaveClass("sm:flex-row")
    expect(header).toHaveClass("sm:justify-between")
    expect(
      screen.getByRole("button", { name: "Crear departamento" })
    ).toBeInTheDocument()
  })

  it("renders a shared empty state with brand icon treatment", () => {
    render(
      <AdminEmptyState
        icon={Building2}
        title="Aún no hay departamentos creados"
        description="Crea el primero para usarlo en vacantes."
        action={<button type="button">Crear departamento</button>}
      />
    )

    expect(
      screen.getByRole("heading", { name: "Aún no hay departamentos creados" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Crear departamento" })
    ).toBeInTheDocument()
  })

  it("renders table rows with the shared hover class", () => {
    render(
      <AdminDataTable ariaLabel="Catálogo">
        <tbody>
          <tr className={ADMIN_TR_CLASS}>
            <td>Ingeniería</td>
          </tr>
        </tbody>
      </AdminDataTable>
    )

    const table = screen.getByRole("table", { name: "Catálogo" })
    expect(table).toBeInTheDocument()
    expect(screen.getByText("Ingeniería").closest("tr")).toHaveClass(
      "hover:bg-ats-terracotta-soft/40"
    )
  })

  it("renders a retry action in the error panel", () => {
    const handleRetry = vi.fn()

    render(
      <AdminErrorPanel
        message="No se pudo cargar el catálogo"
        onRetry={handleRetry}
        retryLabel="Reintentar"
      />
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo cargar el catálogo"
    )
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument()
  })
})
