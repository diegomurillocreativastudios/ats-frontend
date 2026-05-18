import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  fetchAdminCompaniesList,
  mapAdminCompany,
  type AdminCompany,
} from "@/lib/api/admin-companies"

const apiGet = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGet(...args),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

describe("mapAdminCompany", () => {
  it("maps camelCase payload", () => {
    const company = mapAdminCompany({
      companyId: "00000000-0000-0000-0000-000000000001",
      name: "Acme",
      industry: "Tech",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
    })

    expect(company).toEqual({
      companyId: "00000000-0000-0000-0000-000000000001",
      name: "Acme",
      industry: "Tech",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
    } satisfies AdminCompany)
  })

  it("maps snake_case payload", () => {
    const company = mapAdminCompany({
      company_id: "abc",
      name: "Beta",
      industry: null,
      is_active: false,
      created_at: "2025-01-02T12:00:00Z",
    })

    expect(company.companyId).toBe("abc")
    expect(company.name).toBe("Beta")
    expect(company.industry).toBeUndefined()
    expect(company.isActive).toBe(false)
    expect(company.createdAt).toBe("2025-01-02T12:00:00Z")
  })
})

describe("fetchAdminCompaniesList", () => {
  beforeEach(() => {
    apiGet.mockReset()
  })

  it("calls GET with page, pageSize and includeInactive query params", async () => {
    apiGet.mockResolvedValueOnce({
      page: 2,
      pageSize: 25,
      totalCount: 3,
      items: [],
    })

    await fetchAdminCompaniesList({
      page: 2,
      pageSize: 25,
      includeInactive: true,
    })

    expect(apiGet).toHaveBeenCalledWith(
      "/api/admin/companies?page=2&pageSize=25&includeInactive=true"
    )
  })

  it("omits includeInactive when false", async () => {
    apiGet.mockResolvedValueOnce({
      page: 1,
      pageSize: 20,
      totalCount: 0,
      items: [],
    })

    await fetchAdminCompaniesList({ page: 1, pageSize: 20, includeInactive: false })

    expect(apiGet).toHaveBeenCalledWith("/api/admin/companies?page=1&pageSize=20")
  })

  it("normalizes items array from list response", async () => {
    apiGet.mockResolvedValueOnce({
      page: 1,
      page_size: 10,
      total_count: 1,
      items: [
        {
          company_id: "id-1",
          name: "Co",
          is_active: true,
          created_at: "2024-06-01T00:00:00Z",
        },
      ],
    })

    const res = await fetchAdminCompaniesList({ page: 1, pageSize: 10 })

    expect(res.totalCount).toBe(1)
    expect(res.pageSize).toBe(10)
    expect(res.items[0]?.companyId).toBe("id-1")
    expect(res.items[0]?.name).toBe("Co")
  })
})
