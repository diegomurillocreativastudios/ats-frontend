import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

/**
 * Etapa 7 — i18n de Vacantes RRHH básico.
 *
 * Verifica que la UI estática migrada de Vacantes RRHH (listado, encabezado,
 * filtros simples, estados vacíos/carga/error y la tarjeta de vacante) resuelve
 * sus textos desde `next-intl` (namespace `RecruiterPortal.vacancies`) en `es` y
 * `en`, y que el namespace mantiene paridad en los 5 idiomas. NO se prueba data
 * dinámica/IA, estados del backend ni texto libre: solo UI estática controlada
 * por frontend.
 */

// --- Mocks de dependencias pesadas / shells transversales -----------------

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(async () => []),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("@/lib/api/admin-vacancy-catalogs", () => ({
  listAdminVacancyCatalog: vi.fn(async () => []),
}))

vi.mock("@/lib/api/recruiter-companies", () => ({
  listRecruiterCompanies: vi.fn(async () => []),
}))

vi.mock("@/components/rrhh/RRHHSidebar", () => ({
  default: () => null,
}))

vi.mock("@/components/rrhh/RRHHTopbar", () => ({
  default: ({ breadcrumbLabel }: { breadcrumbLabel?: string }) => (
    <div data-testid="rrhh-topbar">{breadcrumbLabel}</div>
  ),
}))

vi.mock("@/components/rrhh/NuevaVacanteModal", () => ({
  default: () => null,
}))

vi.mock("@/components/rrhh/RematchButton", () => ({
  default: () => null,
}))

vi.mock("@/components/ui/Snackbar", () => ({
  default: () => null,
}))

import VacantesPage from "@/app/portal-rrhh/vacantes/page"
import { VacancyListCard } from "@/components/rrhh/VacancyListCard"
import { mapVacancyFromApi } from "@/lib/vacancies/map-vacancy-list-item"

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

describe("VacantesPage (Vacantes RRHH) i18n (Etapa 7)", () => {
  it("renderiza la UI estática del listado en español", async () => {
    renderWithIntl(<VacantesPage />, "es")

    expect((await screen.findAllByText("Vacantes")).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText("Gestiona las posiciones abiertas").length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByPlaceholderText("Buscar vacante...").length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText("Nueva Vacante").length).toBeGreaterThan(0)
    // Estado vacío (apiClient.get mockeado → [])
    expect(
      (await screen.findAllByText("No se encontraron vacantes")).length,
    ).toBeGreaterThan(0)
  })

  it("renderiza la UI estática del listado en inglés", async () => {
    renderWithIntl(<VacantesPage />, "en")

    expect((await screen.findAllByText("Vacancies")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("Manage open positions").length).toBeGreaterThan(0)
    expect(
      screen.getAllByPlaceholderText("Search vacancy...").length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText("New Vacancy").length).toBeGreaterThan(0)
    expect(
      (await screen.findAllByText("No vacancies found")).length,
    ).toBeGreaterThan(0)
  })
})

describe("VacancyListCard i18n (Etapa 7)", () => {
  const baseVacancy = mapVacancyFromApi({
    id: "vac-1",
    title: "Senior React Engineer",
    company: "Acme",
    candidatesAmount: 7,
  })

  it("traduce labels estáticos en español sin tocar data dinámica", () => {
    renderWithIntl(
      <VacancyListCard vacancy={baseVacancy} onRefresh={() => {}} onSnackbar={() => {}} />,
      "es",
    )

    expect(screen.getByText("Candidatos")).toBeInTheDocument()
    expect(screen.getByText("Ver detalles")).toBeInTheDocument()
    // Data dinámica intacta (no traducida): título y empresa provienen de la API.
    expect(screen.getByText("Senior React Engineer")).toBeInTheDocument()
    expect(screen.getByText("Acme")).toBeInTheDocument()
  })

  it("traduce labels estáticos en inglés sin tocar data dinámica", () => {
    renderWithIntl(
      <VacancyListCard vacancy={baseVacancy} onRefresh={() => {}} onSnackbar={() => {}} />,
      "en",
    )

    expect(screen.getByText("Candidates")).toBeInTheDocument()
    expect(screen.getByText("View details")).toBeInTheDocument()
    expect(screen.getByText("Senior React Engineer")).toBeInTheDocument()
    expect(screen.getByText("Acme")).toBeInTheDocument()
  })

  it("usa el fallback 'Sin título' cuando la vacante no tiene título", () => {
    const untitled = mapVacancyFromApi({ id: "vac-2", title: "", company: "Acme" })
    renderWithIntl(
      <VacancyListCard vacancy={untitled} onRefresh={() => {}} onSnackbar={() => {}} />,
      "es",
    )

    expect(screen.getByText("Sin título")).toBeInTheDocument()
  })
})

describe("RecruiterPortal.vacancies namespace parity (Etapa 7)", () => {
  it("expone la subsección vacancies en los 5 idiomas", () => {
    for (const locale of locales) {
      const ns = messagesByLocale[locale].RecruiterPortal as Record<
        string,
        unknown
      >
      expect(
        Object.keys(ns),
        `subsección vacancies ausente en ${locale}.json`,
      ).toContain("vacancies")
    }
  })

  it("mantiene los grupos de vacancies en los 5 idiomas", () => {
    for (const locale of locales) {
      const vacancies = (
        messagesByLocale[locale].RecruiterPortal as Record<string, unknown>
      ).vacancies as Record<string, unknown>
      expect(Object.keys(vacancies), `grupos en ${locale}.json`).toEqual(
        expect.arrayContaining([
          "page",
          "filters",
          "cards",
          "actions",
          "emptyStates",
          "loadingStates",
          "errors",
          "toasts",
        ]),
      )
    }
  })

  it("conserva los placeholders canónicos no enviados al backend", () => {
    const vacancies = (
      esMessages.RecruiterPortal as Record<string, unknown>
    ).vacancies as Record<string, Record<string, unknown>>
    expect(vacancies.cards.cardAria).toBe("Vacante: {title}")
    expect(vacancies.actions.viewDetailsAria).toBe(
      "Ver detalles de vacante {title}",
    )
  })
})
