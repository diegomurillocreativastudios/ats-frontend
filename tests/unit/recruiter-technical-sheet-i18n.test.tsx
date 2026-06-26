import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"
import { TechnicalSheetModal } from "@/components/rrhh/technical-sheet/technical-sheet-modal"
import { TechnicalSheetPanel } from "@/components/rrhh/technical-sheet/technical-sheet-panel"
import { fetchTechnicalSheetJson } from "@/lib/api/technical-sheet"
import { fetchTemplatesList } from "@/lib/templates/technical-sheet-template"

/**
 * Etapa 19 — i18n de TechnicalSheetModal / ficha técnica (UI estática sin traducir IA).
 */

vi.mock("@/lib/api/technical-sheet", () => ({
  fetchTechnicalSheetJson: vi.fn(),
  slugifyVacancyForFilename: vi.fn(() => "senior-backend"),
  downloadTechnicalSheetPdfFromNextRoute: vi.fn(),
}))

vi.mock("@/lib/templates/technical-sheet-template", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/templates/technical-sheet-template")>()
  return {
    ...actual,
    fetchTemplatesList: vi.fn(),
  }
})

vi.mock("@/lib/technical-sheet/fetch-visible-logo-data-uri-client", () => ({
  fetchVisibleLogoDataUriClient: vi.fn(async () => ""),
}))

vi.mock("@/lib/pdf/download-technical-sheet-preview-as-pdf", () => ({
  downloadTechnicalSheetPreviewAsPdf: vi.fn(),
}))

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
    </NextIntlClientProvider>,
  )
}

const defaultProps = {
  vacancyId: "vac-1",
  candidateProfileId: "cp-abc12345",
  vacancyTitle: "Senior Backend Engineer",
  candidateLabel: "María García",
}

const aiPositiveReasons = "Strong leadership skills from Vertex AI"
const aiQualitativeReasoning = "Excellent cultural fit per qualitative AI analysis"
const matchTotalScore = "0.87"

describe("TechnicalSheetModal i18n (Etapa 19)", () => {
  beforeEach(() => {
    vi.mocked(fetchTemplatesList).mockImplementation(() => new Promise(() => {}))
    vi.mocked(fetchTechnicalSheetJson).mockImplementation(() => new Promise(() => {}))
  })

  it("renderiza estado de carga en español", () => {
    renderWithIntl(
      <TechnicalSheetModal isOpen onClose={vi.fn()} {...defaultProps} />,
      "es",
    )
    expect(screen.getByText("Cargando ficha técnica…")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Ficha técnica" })).toBeInTheDocument()
    expect(screen.getByText("María García")).toBeInTheDocument()
  })

  it("renderiza estado de carga en inglés", () => {
    renderWithIntl(
      <TechnicalSheetModal isOpen onClose={vi.fn()} {...defaultProps} />,
      "en",
    )
    expect(screen.getByText("Loading technical sheet…")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Technical sheet" })).toBeInTheDocument()
    expect(screen.getByText("María García")).toBeInTheDocument()
  })
})

describe("TechnicalSheetPanel i18n (Etapa 19)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("muestra error de plantilla ausente traducido en inglés", async () => {
    vi.mocked(fetchTemplatesList).mockResolvedValue([])
    vi.mocked(fetchTechnicalSheetJson).mockResolvedValue({})

    renderWithIntl(
      <TechnicalSheetPanel enabled {...defaultProps} />,
      "en",
    )

    expect(
      await screen.findByText(
        /There is no document template marked as a technical sheet/i,
      ),
    ).toBeInTheDocument()
  })

  it("mantiene contenido de match/IA verbatim en el preview del iframe", async () => {
    const templateHtml = `<article class="ts-article"><section>
      <h2>Match</h2>
      <p data-testid="positive">{{match.positiveReasons}}</p>
      <p data-testid="qualitative">{{match.qualitativeReasoning}}</p>
      <p data-testid="score">{{match.totalScore}}</p>
      <p data-testid="candidate">{{header.fullName}}</p>
    </section></article>`

    vi.mocked(fetchTemplatesList).mockResolvedValue([
      {
        id: 1,
        type: "Document",
        name: "Ficha técnica CV",
        contentTemplate: templateHtml,
        isTechnicalSheet: true,
        isReport: false,
      },
    ])
    vi.mocked(fetchTechnicalSheetJson).mockResolvedValue({
      firstName: "María",
      lastName: "García",
      match: {
        positiveReasons: aiPositiveReasons,
        qualitativeReasoning: aiQualitativeReasoning,
        totalScore: matchTotalScore,
      },
    })

    renderWithIntl(
      <TechnicalSheetPanel enabled {...defaultProps} />,
      "en",
    )

    await waitFor(() => {
      expect(screen.getByTitle("Technical sheet")).toBeInTheDocument()
    })

    const iframe = screen.getByTitle("Technical sheet") as HTMLIFrameElement
    await waitFor(() => {
      const doc = iframe.getAttribute("srcdoc") ?? ""
      expect(doc).toContain(aiPositiveReasons)
      expect(doc).toContain(aiQualitativeReasoning)
      expect(doc).toContain(matchTotalScore)
      expect(doc).toContain("María García")
    })
  })
})

describe("RecruiterPortal.technicalSheet namespace parity (Etapa 19)", () => {
  it("expone technicalSheet en los 5 idiomas", () => {
    for (const locale of locales) {
      const portal = messagesByLocale[locale].RecruiterPortal as Record<string, unknown>
      expect(
        Object.keys(portal),
        `technicalSheet ausente en ${locale}.json`,
      ).toContain("technicalSheet")
    }
  })
})
