import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"
import { VacancyResultadosCandidatesBlock } from "@/components/rrhh/vacancy-resultados/vacancy-resultados-candidates-block"
import type { VacancyResultadosViewModel } from "@/lib/api/vacancy-resultados"

/**
 * Etapa 18 — i18n de resultados de vacante RRHH (UI estática sin traducir IA).
 */

vi.mock("@/components/rrhh/RRHHSidebar", () => ({
  default: () => null,
}))

vi.mock("@/components/rrhh/RRHHTopbar", () => ({
  default: () => null,
}))

vi.mock("@/components/rrhh/interviews/rrhh-interviews-shell", () => ({
  RrhhInterviewsShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/components/rrhh/technical-sheet/technical-sheet-modal", () => ({
  TechnicalSheetModal: () => null,
}))

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}))

vi.mock("@/lib/api/vacancy-resultados", () => ({
  fetchVacancyResultadosPayload: vi.fn(),
}))

vi.mock("@/lib/api/interviews", () => ({
  getInterviewsByVacancy: vi.fn(async () => []),
}))

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "vac-results-1" }),
  useRouter: () => ({ push: vi.fn() }),
}))

import VacancyResultadosPage from "@/app/portal-rrhh/vacantes/[id]/resultados/page"
import { fetchVacancyResultadosPayload } from "@/lib/api/vacancy-resultados"

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

const mockViewModel: VacancyResultadosViewModel = {
  vacancyId: "vac-results-1",
  title: "Senior Backend Engineer",
  meta: {
    description: null,
    status: "activa",
    createdAt: null,
    jobCategory: null,
    company: "Acme Corp",
    countryCode: null,
    vacancyDepartmentLabel: null,
    vacancyModalityLabel: null,
    requirements: null,
    weights: null,
    aiMatchSuggestions: [],
    needsRematch: false,
  },
  applicants: [
    {
      candidateProfileId: "cp-1",
      name: "María García",
      email: "maria@example.com",
      totalScore: 0.85,
      qualitativeReasoningPositive: "Strong leadership skills from Vertex AI",
      qualitativeReasoningNegative: "Limited cloud experience per AI analysis",
    },
  ],
  kanbanStageNames: ["Screening"],
  orderedStageNames: ["Screening"],
  companyStatuses: [{ id: "st-1", name: "En revisión" }],
  applicantsByStageFull: [
    {
      stageName: "Screening",
      applicants: [
        {
          candidateProfileId: "cp-1",
          name: "María García",
          email: "maria@example.com",
          totalScore: 0.85,
          qualitativeReasoningPositive: "Strong leadership skills from Vertex AI",
          qualitativeReasoningNegative: "Limited cloud experience per AI analysis",
        },
      ],
    },
  ],
  byStage: [{ stageName: "Screening", count: 1 }],
  scoreBuckets: [{ label: "80-100", count: 1 }],
  scoreSummary: { count: 1, meanPercent: 85, minPercent: 85, maxPercent: 85 },
  componentAverages: {
    qualitativeMean01: 0.8,
    vectorMean01: 0.9,
    attributeMean01: 0.7,
    samplesWithAnyComponent: 1,
  },
}

describe("VacancyResultadosPage i18n (Etapa 18)", () => {
  it("renderiza el estado de carga en español", () => {
    vi.mocked(fetchVacancyResultadosPayload).mockImplementation(
      () => new Promise(() => {}),
    )
    renderWithIntl(<VacancyResultadosPage />, "es")
    expect(screen.getByText("Cargando resultados…")).toBeInTheDocument()
  })

  it("renderiza el estado de carga en inglés", () => {
    vi.mocked(fetchVacancyResultadosPayload).mockImplementation(
      () => new Promise(() => {}),
    )
    renderWithIntl(<VacancyResultadosPage />, "en")
    expect(screen.getByText("Loading results…")).toBeInTheDocument()
  })

  it("renderiza encabezado estático en inglés con data dinámica verbatim", async () => {
    vi.mocked(fetchVacancyResultadosPayload).mockResolvedValue(mockViewModel)
    renderWithIntl(<VacancyResultadosPage />, "en")
    expect(await screen.findByText("Vacancy results")).toBeInTheDocument()
    expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument()
    expect(
      screen.getByText("Strong leadership skills from Vertex AI"),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Limited cloud experience per AI analysis"),
    ).toBeInTheDocument()
    expect(screen.getByText("85 %")).toBeInTheDocument()
  })
})

describe("VacancyResultadosCandidatesBlock i18n (Etapa 18)", () => {
  const defaultProps = {
    vacancyId: "vac-results-1",
    applicantsByStageFull: mockViewModel.applicantsByStageFull,
    companyStatuses: mockViewModel.companyStatuses,
    allApplicants: mockViewModel.applicants,
    interviews: [],
    filterState: { search: "", statusId: "all", scoreTier: "all" },
    onFilterChange: vi.fn(),
    onScheduleInterview: vi.fn(),
    onOpenTechnicalSheet: vi.fn(),
  }

  it("traduce labels estáticos y mantiene qualitativeReasoning verbatim", () => {
    renderWithIntl(
      <VacancyResultadosCandidatesBlock {...defaultProps} />,
      "en",
    )
    expect(screen.getByText("Applicants by stage")).toBeInTheDocument()
    expect(screen.getByText("Match")).toBeInTheDocument()
    expect(screen.getByText("Strengths")).toBeInTheDocument()
    expect(screen.getByText("María García")).toBeInTheDocument()
    expect(
      screen.getByText("Strong leadership skills from Vertex AI"),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Limited cloud experience per AI analysis"),
    ).toBeInTheDocument()
  })
})

describe("RecruiterPortal.vacancies.results namespace parity (Etapa 18)", () => {
  it("expone results en los 5 idiomas", () => {
    for (const locale of locales) {
      const vacancies = (
        messagesByLocale[locale].RecruiterPortal as Record<string, unknown>
      ).vacancies as Record<string, unknown>
      expect(Object.keys(vacancies), `results ausente en ${locale}.json`).toContain(
        "results",
      )
    }
  })

  it("expone Metadata.recruiterVacancyResults en los 5 idiomas", () => {
    for (const locale of locales) {
      const metadata = messagesByLocale[locale].Metadata as Record<string, unknown>
      expect(
        Object.keys(metadata),
        `recruiterVacancyResults ausente en ${locale}.json`,
      ).toContain("recruiterVacancyResults")
    }
  })
})
