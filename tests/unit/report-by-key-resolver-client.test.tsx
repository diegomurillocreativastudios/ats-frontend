import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { ReportByKeyResolverClient } from "@/components/rrhh/reportes/report-by-key-resolver-client"
import { fetchReportsCatalog } from "@/lib/api/recruiter-reports-catalog"

vi.mock("@/lib/api/recruiter-reports-catalog", async (importOriginal) => {
    const actual = await importOriginal<
        typeof import("@/lib/api/recruiter-reports-catalog")
    >()
    return {
        ...actual,
        fetchReportsCatalog: vi.fn(),
    }
})

vi.mock("@/components/rrhh/reportes/report-template-detail-client", () => ({
    ReportTemplateDetailClient: ({ templateId }: { templateId: string }) => (
        <div data-testid="report-template-detail">templateId:{templateId}</div>
    ),
}))

vi.mock("@/components/rrhh/reportes/report-data-view-client", () => ({
    ReportDataViewClient: ({
        catalogItem,
    }: {
        catalogItem: { reportKey: string; name: string }
    }) => (
        <div data-testid="report-data-view">
            reportKey:{catalogItem.reportKey}|name:{catalogItem.name}
        </div>
    ),
}))

vi.mock("@/components/rrhh/reportes/rrhh-reports-shell", () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="rrhh-reports-shell">{children}</div>
    ),
}))

const baseCatalog = [
    {
        reportKey: "vacancy-progress-by-client",
        name: "Avance de vacantes por cliente",
        description: "desc",
        endpoint: "/api/recruiter/reports/vacancy-progress-by-client",
        linkedTemplate: { templateId: "16", name: "Plantilla" },
    },
    {
        reportKey: "candidate-status-by-stage",
        name: "Estatus de candidatos por etapa",
        description: "desc",
        endpoint: "/api/recruiter/reports/candidate-status-by-stage",
        linkedTemplate: null,
    },
]

describe("ReportByKeyResolverClient", () => {
    beforeEach(() => {
        vi.mocked(fetchReportsCatalog).mockReset()
        vi.mocked(fetchReportsCatalog).mockResolvedValue(baseCatalog)
    })

    it("renders the data view when the reportKey matches a catalog entry", async () => {
        render(<ReportByKeyResolverClient reportKey="vacancy-progress-by-client" />)

        await waitFor(() => {
            expect(screen.getByTestId("report-data-view")).toHaveTextContent(
                "reportKey:vacancy-progress-by-client"
            )
        })
    })

    it("also renders the data view when the catalog entry has no linked template", async () => {
        render(<ReportByKeyResolverClient reportKey="candidate-status-by-stage" />)

        await waitFor(() => {
            expect(screen.getByTestId("report-data-view")).toHaveTextContent(
                "reportKey:candidate-status-by-stage"
            )
        })
    })

    it("shows the not-found state when the reportKey is unknown", async () => {
        render(<ReportByKeyResolverClient reportKey="not-a-real-report" />)

        expect(
            await screen.findByText(/Reporte no encontrado/i)
        ).toBeInTheDocument()
    })

    it("falls back to the template detail view for numeric segments", async () => {
        render(<ReportByKeyResolverClient reportKey="42" />)

        await waitFor(() => {
            expect(screen.getByTestId("report-template-detail")).toHaveTextContent(
                "templateId:42"
            )
        })
    })
})
