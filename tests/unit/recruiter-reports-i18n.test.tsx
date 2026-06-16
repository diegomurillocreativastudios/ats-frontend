import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

/**
 * Etapa 12 — i18n de la UI estática básica de Reportes RRHH.
 *
 * Verifica que el hub de reportes, las cards del catálogo y el botón de PDF
 * resuelven su texto estático desde `next-intl` (namespace
 * `RecruiterPortal.reports`) en `es` y `en`, manteniendo paridad en los 5
 * idiomas. NO se prueba data dinámica/IA ni texto libre del backend: los
 * nombres/descripciones del catálogo se renderizan verbatim y el handler de
 * descarga de PDF conserva su comportamiento original.
 */

const getMock = vi.fn(async () => [] as unknown[])

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...(args as [])),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const downloadMock = vi.fn(async () => undefined)

vi.mock("@/lib/pdf/download-report-view-as-pdf", () => ({
  downloadReportViewAsPdf: (...args: unknown[]) =>
    downloadMock(...(args as [])),
}))

import { ReportsHubClient } from "@/components/rrhh/reportes/reports-hub-client"
import { ReportesViewPdfButton } from "@/components/rrhh/reportes/reportes-view-pdf-button"

const messagesByLocale: Record<Locale, Record<string, unknown>> = {
  es: esMessages,
  en: enMessages,
  it: itMessages,
  de: deMessages,
  fr: frMessages,
}

function renderWithIntl(ui: React.ReactNode, locale: Locale) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe("ReportsHubClient i18n (Etapa 12)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMock.mockResolvedValue([])
  })

  it("renderiza encabezado del catálogo y estado vacío en español", async () => {
    renderWithIntl(<ReportsHubClient />, "es")

    expect(
      (await screen.findAllByText("Reportes")).length
    ).toBeGreaterThan(0)
    expect(
      await screen.findByText(
        "El catálogo de reportes aún no devuelve resultados."
      )
    ).toBeInTheDocument()
  })

  it("renderiza encabezado del catálogo y estado vacío en inglés", async () => {
    renderWithIntl(<ReportsHubClient />, "en")

    expect((await screen.findAllByText("Reports")).length).toBeGreaterThan(0)
    expect(
      await screen.findByText(
        "The reports catalog does not return results yet."
      )
    ).toBeInTheDocument()
  })

  it("traduce la UI estática de las cards pero no los datos del catálogo", async () => {
    getMock.mockResolvedValue([
      {
        reportKey: "vacancy-progress-by-client",
        name: "Avance de vacantes por cliente",
        description: "Reporte dinámico del backend",
        linkedTemplate: { templateId: "5", name: "Plantilla Trimestral" },
      },
      {
        reportKey: "salary-expectations",
        name: "Expectativas salariales",
        linkedTemplate: null,
      },
    ])

    renderWithIntl(<ReportsHubClient />, "es")

    expect(
      await screen.findByText("Avance de vacantes por cliente")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Reporte dinámico del backend")
    ).toBeInTheDocument()
    expect(screen.getByText("Plantilla: Plantilla Trimestral")).toBeInTheDocument()
    expect(screen.getByText("Abrir y descargar")).toBeInTheDocument()
    expect(screen.getByText("Expectativas salariales")).toBeInTheDocument()
    expect(screen.getByText("Sin plantilla vinculada")).toBeInTheDocument()
  })

  it("usa el fallback del diccionario ante error sin mensaje del backend", async () => {
    getMock.mockRejectedValue({ status: 500 })

    renderWithIntl(<ReportsHubClient />, "en")

    expect(
      await screen.findByText("Could not load the reports catalog")
    ).toBeInTheDocument()
  })
})

describe("ReportesViewPdfButton i18n (Etapa 12)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("muestra el texto del botón traducido en español/inglés", () => {
    const { rerender } = renderWithIntl(
      <ReportesViewPdfButton filenameBase="reporte" />,
      "es"
    )
    expect(screen.getByText("Descargar PDF")).toBeInTheDocument()

    rerender(
      <NextIntlClientProvider locale="en" messages={messagesByLocale.en}>
        <ReportesViewPdfButton filenameBase="reporte" />
      </NextIntlClientProvider>
    )
    expect(screen.getByText("Download PDF")).toBeInTheDocument()
  })

  it("conserva el handler original de descarga al hacer click", async () => {
    renderWithIntl(<ReportesViewPdfButton filenameBase="reporte-x" />, "es")

    fireEvent.click(
      screen.getByRole("button", { name: "Descargar PDF del reporte" })
    )

    await waitFor(() => {
      expect(downloadMock).toHaveBeenCalledWith("reporte-x")
    })
  })
})

describe("RecruiterPortal.reports namespace parity (Etapa 12)", () => {
  it("expone el subnamespace reports en los 5 idiomas", () => {
    for (const locale of locales) {
      const ns = messagesByLocale[locale].RecruiterPortal as Record<
        string,
        unknown
      >
      expect(Object.keys(ns), `reports ausente en ${locale}.json`).toContain(
        "reports"
      )
    }
  })

  it("mantiene las subsecciones esperadas de reports en los 5 idiomas", () => {
    const expected = [
      "breadcrumb",
      "page",
      "catalog",
      "cards",
      "filters",
      "actions",
      "emptyStates",
      "errors",
    ]
    for (const locale of locales) {
      const reports = (
        messagesByLocale[locale].RecruiterPortal as Record<string, unknown>
      ).reports as Record<string, unknown>
      expect(
        Object.keys(reports),
        `subsecciones reports en ${locale}.json`
      ).toEqual(expect.arrayContaining(expected))
    }
  })

  it("expone Metadata.recruiterReports en los 5 idiomas", () => {
    for (const locale of locales) {
      const metadata = messagesByLocale[locale].Metadata as Record<
        string,
        unknown
      >
      expect(
        Object.keys(metadata),
        `recruiterReports ausente en ${locale}.json`
      ).toContain("recruiterReports")
    }
  })
})
