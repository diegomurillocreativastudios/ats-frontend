import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import AdminEmpresasContent from "@/components/portal-admin/AdminEmpresasContent"
import type { AdminCompany } from "@/lib/api/admin-companies"

const companiesApiMocks = vi.hoisted(() => ({
  fetchAdminCompaniesList: vi.fn(),
  fetchAdminCompanyById: vi.fn(),
  createAdminCompany: vi.fn(),
  updateAdminCompany: vi.fn(),
}))

vi.mock("@/lib/api/admin-companies", () => ({
  fetchAdminCompaniesList: companiesApiMocks.fetchAdminCompaniesList,
  fetchAdminCompanyById: companiesApiMocks.fetchAdminCompanyById,
  createAdminCompany: companiesApiMocks.createAdminCompany,
  updateAdminCompany: companiesApiMocks.updateAdminCompany,
}))

function buildCompany(overrides: Partial<AdminCompany> = {}): AdminCompany {
  return {
    companyId: "00000000-0000-0000-0000-000000000099",
    name: "Acme Corp",
    industry: "Software",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("AdminEmpresasContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    companiesApiMocks.fetchAdminCompaniesList.mockResolvedValue({
      page: 1,
      pageSize: 20,
      totalCount: 0,
      items: [],
    })
  })

  it("renders empty state when there are no companies", async () => {
    render(<AdminEmpresasContent />)

    expect(await screen.findByText("Aún no hay empresas")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Crear empresa/i }).length).toBeGreaterThanOrEqual(1)
  })

  it("submits create and reloads the list", async () => {
    const created = buildCompany({ name: "Nueva Co", industry: "QA" })

    companiesApiMocks.fetchAdminCompaniesList
      .mockResolvedValueOnce({ page: 1, pageSize: 20, totalCount: 0, items: [] })
      .mockResolvedValueOnce({ page: 1, pageSize: 20, totalCount: 1, items: [created] })
    companiesApiMocks.createAdminCompany.mockResolvedValueOnce(created)

    render(<AdminEmpresasContent />)
    await screen.findByText("Aún no hay empresas")

    fireEvent.click(screen.getAllByRole("button", { name: /Crear empresa/i })[0])
    fireEvent.change(await screen.findByLabelText(/^Nombre/i), {
      target: { value: "Nueva Co" },
    })
    fireEvent.change(await screen.findByLabelText(/Industria/i), {
      target: { value: "QA" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))

    await waitFor(() => {
      expect(companiesApiMocks.createAdminCompany).toHaveBeenCalledWith({
        name: "Nueva Co",
        industry: "QA",
        isActive: true,
      })
    })
    expect(await screen.findByText("Nueva Co")).toBeInTheDocument()
  })

  it("applies includeInactive filter on list fetch", async () => {
    render(<AdminEmpresasContent />)
    await screen.findByText("Aún no hay empresas")

    fireEvent.click(screen.getByLabelText(/Incluir inactivas/i))
    fireEvent.click(screen.getByRole("button", { name: /Aplicar filtros/i }))

    await waitFor(() => {
      expect(companiesApiMocks.fetchAdminCompaniesList).toHaveBeenLastCalledWith(
        expect.objectContaining({ includeInactive: true, page: 1 })
      )
    })
  })

  it("deactivates a company from the row action", async () => {
    const active = buildCompany()
    const inactive = buildCompany({ isActive: false })

    companiesApiMocks.fetchAdminCompaniesList
      .mockResolvedValueOnce({ page: 1, pageSize: 20, totalCount: 1, items: [active] })
      .mockResolvedValueOnce({ page: 1, pageSize: 20, totalCount: 1, items: [inactive] })
    companiesApiMocks.updateAdminCompany.mockResolvedValueOnce(inactive)

    render(<AdminEmpresasContent />)
    await screen.findByText("Acme Corp")

    fireEvent.click(screen.getByRole("button", { name: "Desactivar" }))

    await waitFor(() => {
      expect(companiesApiMocks.updateAdminCompany).toHaveBeenCalledWith(
        active.companyId,
        {
          name: active.name,
          industry: active.industry,
          isActive: false,
        }
      )
    })
  })
})
