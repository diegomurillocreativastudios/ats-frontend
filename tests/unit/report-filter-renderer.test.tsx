import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import { renderWithIntl as render } from "@/tests/helpers/render-with-intl"
import { ReportFilterRenderer } from "@/components/rrhh/reportes/report-filter-renderer"

vi.mock("@/lib/api/recruiter-reports", () => ({
  listRecruiterCompanies: vi.fn().mockResolvedValue([{ id: "c1", name: "Acme" }]),
  listRecruiterVacancies: vi.fn().mockResolvedValue([]),
  listRecruiterStages: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/lib/api/admin-users", () => ({
  fetchAdminUsersAllByRole: vi.fn().mockResolvedValue([]),
}))

describe("ReportFilterRenderer", () => {
  it("renders text and date fields from schema", () => {
    render(
      <ReportFilterRenderer
        schema={{
          fields: [
            { key: "q", label: "Buscar", type: "text" },
            { key: "dateFrom", label: "Desde", type: "date" },
          ],
        }}
        value={{ q: "hiring", dateFrom: "2026-05-01" }}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByLabelText("Buscar")).toHaveValue("hiring")
    expect(screen.getByRole("button", { name: "Desde" })).toBeInTheDocument()
  })

  it("calls onChange when a text field changes", () => {
    const onChange = vi.fn()

    render(
      <ReportFilterRenderer
        schema={{ fields: [{ key: "q", label: "Buscar", type: "text" }] }}
        value={{ q: "" }}
        onChange={onChange}
      />
    )

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "abc" } })
    expect(onChange).toHaveBeenCalledWith({ q: "abc" })
  })
})
