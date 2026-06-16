import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { ReportsHubClient } from "@/components/rrhh/reportes/reports-hub-client"
import { fetchReportsCatalog } from "@/lib/api/recruiter-reports-catalog"
import { fetchTemplatesList } from "@/lib/templates/technical-sheet-template"
import esMessages from "@/messages/es.json"

function renderHub() {
    return render(
        <NextIntlClientProvider locale="es" messages={esMessages}>
            <ReportsHubClient />
        </NextIntlClientProvider>
    )
}

vi.mock("@/lib/api/recruiter-reports-catalog", async (importOriginal) => {
    const actual = await importOriginal<
        typeof import("@/lib/api/recruiter-reports-catalog")
    >()
    return {
        ...actual,
        fetchReportsCatalog: vi.fn(),
    }
})

vi.mock("@/lib/templates/technical-sheet-template", async (importOriginal) => {
    const actual = await importOriginal<
        typeof import("@/lib/templates/technical-sheet-template")
    >()
    return {
        ...actual,
        fetchTemplatesList: vi.fn(),
    }
})

const baseCatalog = [
    {
        reportKey: "vacancy-progress-by-client",
        name: "Avance de vacantes por cliente",
        description: "Control de procesos activos y atrasados.",
        endpoint: "/api/recruiter/reports/vacancy-progress-by-client",
        linkedTemplate: { templateId: "16", name: "Reporte avance vacantes" },
    },
    {
        reportKey: "candidate-status-by-stage",
        name: "Estatus de candidatos por etapa",
        description: "Embudo y distribución en el pipeline.",
        endpoint: "/api/recruiter/reports/candidate-status-by-stage",
        linkedTemplate: null,
    },
    {
        reportKey: "technical-evaluations",
        name: "Evaluaciones técnicas",
        description: "Indicadores y ranking por puntaje.",
        endpoint: "/api/recruiter/reports/technical-evaluations",
        linkedTemplate: { templateId: "22", name: "Reporte evaluaciones" },
    },
]

describe("ReportsHubClient", () => {
    beforeEach(() => {
        vi.mocked(fetchReportsCatalog).mockReset()
        vi.mocked(fetchTemplatesList).mockReset()

        vi.mocked(fetchReportsCatalog).mockResolvedValue(baseCatalog)
        vi.mocked(fetchTemplatesList).mockResolvedValue([])
    })

    it("renders the catalog reports section once the catalog resolves", async () => {
        renderHub()

        const section = await screen.findByRole("region", {
            name: /Reportes disponibles para descargar/i,
        })

        await waitFor(() => {
            expect(
                within(section).getByText("Avance de vacantes por cliente")
            ).toBeInTheDocument()
        })

        expect(
            within(section).getByText("Estatus de candidatos por etapa")
        ).toBeInTheDocument()
        expect(
            within(section).getByText("Evaluaciones técnicas")
        ).toBeInTheDocument()

        expect(fetchReportsCatalog).toHaveBeenCalledTimes(1)
    })

    it("links catalog cards with a bound template to the template detail page", async () => {
        renderHub()

        const link = await screen.findByRole("link", {
            name: /Abrir reporte: Avance de vacantes por cliente/i,
        })

        expect(link).toHaveAttribute(
            "href",
            "/portal-rrhh/reportes/vacancy-progress-by-client"
        )
    })

    it("renders unbound catalog reports as a disabled card with a guidance message", async () => {
        renderHub()

        await screen.findByText("Estatus de candidatos por etapa")

        expect(
            screen.queryByRole("link", {
                name: /Abrir reporte: Estatus de candidatos por etapa/i,
            })
        ).not.toBeInTheDocument()

        expect(
            screen.getByText(/Vinculá una plantilla/i)
        ).toBeInTheDocument()
    })

    it("shows an error state with a retry action when the catalog fetch fails", async () => {
        vi.mocked(fetchReportsCatalog).mockRejectedValueOnce(
            Object.assign(new Error("boom"), { status: 500 })
        )

        renderHub()

        expect(
            await screen.findByText(
                /No se pudo cargar el catálogo de reportes/i
            )
        ).toBeInTheDocument()

        expect(
            screen.getByRole("button", { name: /Reintentar reportes/i })
        ).toBeInTheDocument()
    })
})
