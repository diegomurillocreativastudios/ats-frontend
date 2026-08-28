import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"
import { getInterviewStatusLabel } from "@/lib/interviews/interview-status-labels"

/**
 * Etapa 11 — i18n del módulo básico de Entrevistas RRHH.
 *
 * Verifica que la UI estática migrada (hub de entrevistas, listado por vacante,
 * estados de carga/vacío/error y el mapper controlado de estados) resuelve sus
 * textos desde `next-intl` (namespace `RecruiterPortal.interviews`) en `es` y
 * `en`, manteniendo paridad en los 5 idiomas. NO se prueba data dinámica/IA ni
 * texto libre del backend: solo UI estática controlada por frontend.
 */

// --- Mocks de dependencias pesadas / shells transversales -----------------

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(async () => []),
    getWithHeaders: vi.fn(async () => ({
      data: [],
      headers: new Headers({
        "X-Total-Count": "0",
        "X-Page": "1",
        "X-Page-Size": "50",
      }),
    })),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("@/components/rrhh/RRHHSidebar", () => ({ default: () => null }))
vi.mock("@/components/rrhh/RRHHTopbar", () => ({
  default: ({ breadcrumbLabel }: { breadcrumbLabel?: string }) => (
    <div data-testid="rrhh-topbar">{breadcrumbLabel}</div>
  ),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/portal-rrhh/entrevistas/v1",
  useSearchParams: () => ({ get: () => null }),
  useParams: () => ({ vacancyId: "v1" }),
}))

vi.mock("@/lib/api/interviews", () => ({
  getInterviewsByVacancy: vi.fn(async () => []),
  getInterviewHttpErrorMessage: () => "error",
}))

vi.mock("@/components/rrhh/interviews/interview-create-modal", () => ({
  InterviewCreateModal: () => null,
}))
vi.mock("@/components/rrhh/interviews/interview-detail-modal", () => ({
  InterviewDetailModal: () => null,
}))
vi.mock("@/components/rrhh/interviews/interview-notes-modal", () => ({
  InterviewNotesModal: () => null,
}))
vi.mock("@/components/rrhh/interviews/interview-schedule-controls", () => ({
  InterviewSingleDatetimeRow: () => null,
}))
vi.mock("@/components/rrhh/technical-sheet/technical-sheet-modal", () => ({
  TechnicalSheetModal: () => null,
}))
vi.mock("@/components/ui/Snackbar", () => ({ default: () => null }))

import EntrevistasHubPage from "@/app/portal-rrhh/entrevistas/page"
import EntrevistasVacancyError from "@/app/portal-rrhh/entrevistas/[vacancyId]/error"
import { InterviewList } from "@/components/rrhh/interviews/interview-list"
import type { UseRecruiterVacancySummaryResult } from "@/hooks/use-recruiter-vacancy-summary"

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

const summaryStub: UseRecruiterVacancySummaryResult = {
  title: null,
  applicantOptions: [],
  loading: false,
  error: false,
}

describe("EntrevistasHubPage i18n (Etapa 11)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renderiza la UI estática del hub en español (estado vacío)", async () => {
    renderWithIntl(<EntrevistasHubPage />, "es")

    expect((await screen.findAllByText("Entrevistas")).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(
        "Elige una vacante para ver y gestionar sus entrevistas."
      ).length
    ).toBeGreaterThan(0)
    expect(
      (
        await screen.findAllByText(
          "No hay vacantes. Crea una vacante primero para agendar entrevistas."
        )
      ).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText("Ir a vacantes").length).toBeGreaterThan(0)
  })

  it("renderiza la UI estática del hub en inglés (estado vacío)", async () => {
    renderWithIntl(<EntrevistasHubPage />, "en")

    expect((await screen.findAllByText("Interviews")).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(
        "Choose a vacancy to view and manage its interviews."
      ).length
    ).toBeGreaterThan(0)
    expect(
      (
        await screen.findAllByText(
          "No vacancies. Create a vacancy first to schedule interviews."
        )
      ).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText("Go to vacancies").length).toBeGreaterThan(0)
  })
})

describe("InterviewList i18n (Etapa 11)", () => {
  it("renderiza encabezado, filtros y estado vacío en español", async () => {
    renderWithIntl(
      <InterviewList vacancyId="v1" vacancySummary={summaryStub} />,
      "es"
    )

    expect(screen.getByText("Gestión de entrevistas de la vacante")).toBeInTheDocument()
    expect(screen.getByText("Estado")).toBeInTheDocument()
    expect(screen.getByText("Aplicar filtros")).toBeInTheDocument()
    expect(screen.getByText("Nueva entrevista")).toBeInTheDocument()
    expect(
      await screen.findByText("No hay entrevistas para esta vacante.")
    ).toBeInTheDocument()
    expect(screen.getByText("Crear primera entrevista")).toBeInTheDocument()
  })

  it("renderiza encabezado, filtros y estado vacío en inglés", async () => {
    renderWithIntl(
      <InterviewList vacancyId="v1" vacancySummary={summaryStub} />,
      "en"
    )

    expect(screen.getByText("Manage the vacancy interviews")).toBeInTheDocument()
    expect(screen.getByText("Status")).toBeInTheDocument()
    expect(screen.getByText("Apply filters")).toBeInTheDocument()
    expect(screen.getByText("New interview")).toBeInTheDocument()
    expect(
      await screen.findByText("There are no interviews for this vacancy.")
    ).toBeInTheDocument()
    expect(screen.getByText("Create first interview")).toBeInTheDocument()
  })
})

describe("EntrevistasVacancyError i18n (Etapa 11)", () => {
  it("usa el fallback del diccionario cuando no hay mensaje (es)", () => {
    renderWithIntl(
      <EntrevistasVacancyError
        error={new Error("")}
        reset={() => {}}
      />,
      "es"
    )
    expect(
      screen.getByText("Ocurrió un error al cargar las entrevistas.")
    ).toBeInTheDocument()
    expect(screen.getByText("Reintentar")).toBeInTheDocument()
  })

  it("prioriza el mensaje crudo del error sobre el fallback", () => {
    renderWithIntl(
      <EntrevistasVacancyError
        error={new Error("Boom backend")}
        reset={() => {}}
      />,
      "en"
    )
    expect(screen.getByText("Boom backend")).toBeInTheDocument()
    expect(
      screen.queryByText("An error occurred while loading the interviews.")
    ).not.toBeInTheDocument()
  })
})

describe("getInterviewStatusLabel mapper (Etapa 11)", () => {
  const t = (key: string) => `t:${key}`

  it("mapea estados conocidos a su clave de traducción", () => {
    expect(getInterviewStatusLabel("Scheduled", t)).toBe("t:statuses.scheduled")
    expect(getInterviewStatusLabel("Completed", t)).toBe("t:statuses.completed")
    expect(getInterviewStatusLabel("Cancelled", t)).toBe("t:statuses.cancelled")
    expect(getInterviewStatusLabel("NoShow", t)).toBe("t:statuses.noShow")
  })

  it("devuelve el valor crudo para estados desconocidos", () => {
    expect(getInterviewStatusLabel("SomethingElse", t)).toBe("SomethingElse")
    expect(getInterviewStatusLabel("", t)).toBe("")
    expect(getInterviewStatusLabel(null, t)).toBe("")
  })
})

describe("RecruiterPortal.interviews namespace parity (Etapa 11)", () => {
  it("expone el subnamespace interviews en los 5 idiomas", () => {
    for (const locale of locales) {
      const ns = messagesByLocale[locale].RecruiterPortal as Record<
        string,
        unknown
      >
      expect(
        Object.keys(ns),
        `interviews ausente en ${locale}.json`
      ).toContain("interviews")
    }
  })

  it("mantiene las subsecciones esperadas de interviews en los 5 idiomas", () => {
    const expected = [
      "breadcrumb",
      "hub",
      "page",
      "filters",
      "list",
      "cards",
      "actions",
      "statuses",
      "emptyStates",
      "loadingStates",
      "errors",
      "toasts",
    ]
    for (const locale of locales) {
      const interviews = (
        messagesByLocale[locale].RecruiterPortal as Record<string, unknown>
      ).interviews as Record<string, unknown>
      expect(
        Object.keys(interviews),
        `subsecciones interviews en ${locale}.json`
      ).toEqual(expect.arrayContaining(expected))
    }
  })
})
