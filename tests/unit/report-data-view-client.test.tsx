import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { ReportDataViewClient } from "@/components/rrhh/reportes/report-data-view-client"
import { fetchTemplateById } from "@/lib/templates/technical-sheet-template"
import { fetchRecruiterReportForCatalogItem } from "@/lib/api/recruiter-report-runtime"
import {
    listRecruiterCompanies,
    listRecruiterVacancies,
} from "@/lib/api/recruiter-reports"
import type { ReportCatalogItem } from "@/lib/api/recruiter-reports-catalog"

vi.mock("@/lib/api/recruiter-report-runtime", async (importOriginal) => {
    const actual = await importOriginal<
        typeof import("@/lib/api/recruiter-report-runtime")
    >()
    return {
        ...actual,
        fetchRecruiterReportForCatalogItem: vi.fn(),
    }
})

vi.mock("@/lib/api/recruiter-reports", async (importOriginal) => {
    const actual = await importOriginal<
        typeof import("@/lib/api/recruiter-reports")
    >()
    return {
        ...actual,
        listRecruiterCompanies: vi.fn(),
        listRecruiterVacancies: vi.fn(),
    }
})

vi.mock("@/lib/templates/technical-sheet-template", async (importOriginal) => {
    const actual = await importOriginal<
        typeof import("@/lib/templates/technical-sheet-template")
    >()
    return {
        ...actual,
        fetchTemplateById: vi.fn(),
    }
})

vi.mock("@/components/rrhh/reportes/rrhh-reports-shell", () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="rrhh-reports-shell">{children}</div>
    ),
}))

const baseItem: ReportCatalogItem = {
    reportKey: "vacancy-progress-by-client",
    name: "Avance de vacantes por cliente",
    description: "Control de procesos activos.",
    endpoint: "/api/recruiter/reports/vacancy-progress-by-client",
    filters: [
        { key: "clientId", label: "Cliente", type: "select-company" },
        { key: "dateFrom", label: "Desde", type: "date" },
    ],
    linkedTemplate: null,
}

describe("ReportDataViewClient", () => {
    beforeEach(() => {
        vi.mocked(fetchRecruiterReportForCatalogItem).mockReset()
        vi.mocked(listRecruiterCompanies).mockReset()
        vi.mocked(listRecruiterVacancies).mockReset()
        vi.mocked(fetchTemplateById).mockReset()

        vi.mocked(listRecruiterCompanies).mockResolvedValue([
            { id: "company-1", name: "Acme Corp" },
        ])
        vi.mocked(listRecruiterVacancies).mockResolvedValue([])
        vi.mocked(fetchTemplateById).mockResolvedValue(null)
    })

    it("calls the catalog endpoint on mount with default filters", async () => {
        vi.mocked(fetchRecruiterReportForCatalogItem).mockResolvedValueOnce({
            rows: [{ vacancyTitle: "Senior Developer" }],
            totalCount: 1,
            extras: null,
        })

        render(<ReportDataViewClient catalogItem={baseItem} />)

        await waitFor(() => {
            expect(fetchRecruiterReportForCatalogItem).toHaveBeenCalledWith(
                baseItem,
                expect.objectContaining({ clientId: "", dateFrom: "" })
            )
        })

        expect(screen.queryByRole("table")).not.toBeInTheDocument()
    })

    it("reapplies filters when the user clicks Aplicar", async () => {
        vi.mocked(fetchRecruiterReportForCatalogItem).mockResolvedValue({
            rows: [],
            totalCount: 0,
            extras: null,
        })

        render(<ReportDataViewClient catalogItem={baseItem} />)

        const select = await screen.findByLabelText(/Cliente/i)
        await waitFor(() => {
            expect(
                within(select).getByRole("option", { name: "Acme Corp" })
            ).toBeInTheDocument()
        })

        fireEvent.change(select, { target: { value: "company-1" } })
        fireEvent.click(
            screen.getByRole("button", { name: /Aplicar filtros/i })
        )

        await waitFor(() => {
            expect(fetchRecruiterReportForCatalogItem).toHaveBeenLastCalledWith(
                baseItem,
                expect.objectContaining({ clientId: "company-1" })
            )
        })
    })

    it("shows the empty state when the endpoint returns zero rows", async () => {
        vi.mocked(fetchRecruiterReportForCatalogItem).mockResolvedValueOnce({
            rows: [],
            totalCount: 0,
            extras: null,
        })

        render(<ReportDataViewClient catalogItem={baseItem} />)

        expect(
            await screen.findByText(
                /No hay vacantes que coincidan con los filtros/i
            )
        ).toBeInTheDocument()
    })

    it("shows an error state with a retry action when the request fails", async () => {
        vi.mocked(fetchRecruiterReportForCatalogItem).mockRejectedValueOnce(
            Object.assign(new Error("boom"), { status: 500 })
        )

        render(<ReportDataViewClient catalogItem={baseItem} />)

        expect(
            await screen.findByText(/No se pudo cargar el reporte/i)
        ).toBeInTheDocument()

        expect(
            screen.getByRole("button", { name: /Reintentar/i })
        ).toBeInTheDocument()
    })
})
