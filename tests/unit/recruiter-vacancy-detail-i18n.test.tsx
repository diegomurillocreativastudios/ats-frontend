import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"
import { VacancyReadOnlyBanner } from "@/components/rrhh/VacancyReadOnlyBanner"
import { VacancyFinishedSummary } from "@/components/rrhh/VacancyFinishedSummary"
import { FinishVacancyProcessModal } from "@/components/rrhh/FinishVacancyProcessModal"
import { getVacancyStatusLabel } from "@/lib/vacancies/vacancy-status-labels"

/**
 * Etapa 17 — i18n del detalle básico de vacante RRHH (sin IA/Score/VacancyConfig).
 *
 * Verifica que la UI estática del detalle básico de vacante resuelve textos desde
 * `next-intl` (namespace `RecruiterPortal.vacancies.detail`) en `es` y `en`, que
 * los fallbacks/empty states usan diccionario, que la data dinámica permanece
 * verbatim y que el namespace mantiene paridad en los 5 idiomas.
 */

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(() => new Promise(() => {})),
    getWithHeaders: vi.fn(() => new Promise(() => {})),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("@/lib/api/admin-vacancy-catalogs", () => ({
  listAdminVacancyCatalog: vi.fn(async () => []),
}))

vi.mock("@/lib/api/recruiter-companies", () => ({
  DEFAULT_RECRUITER_COMPANY_ID: "default-co",
  listCompanyApplicantStatuses: vi.fn(async () => []),
  listRecruiterCompanies: vi.fn(async () => []),
  listRecruiterStages: vi.fn(async () => []),
  persistVacancyCompanyId: vi.fn(),
  resolveVacancyCompanyId: () => "default-co",
  adminStagesCatalogHref: () => "/portal-admin/vacantes/etapas",
}))

vi.mock("@/components/rrhh/RRHHSidebar", () => ({
  default: () => null,
}))

vi.mock("@/components/rrhh/RRHHTopbar", () => ({
  default: () => null,
}))

vi.mock("@/components/rrhh/RematchButton", () => ({
  default: () => null,
}))

vi.mock("@/components/rrhh/VacancyLocationFields", () => ({
  VacancyLocationFields: () => null,
}))

vi.mock("@/components/shared/VacancyLocationLabel", () => ({
  VacancyLocationLabel: () => <span>San Salvador</span>,
}))

vi.mock("@/components/ui/Snackbar", () => ({
  default: () => null,
}))

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "vac-99" }),
}))

import VacanteDetallePage from "@/app/portal-rrhh/vacantes/[id]/page"

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

describe("VacanteDetallePage i18n (Etapa 17)", () => {
  it("renderiza el estado de carga en español", () => {
    renderWithIntl(<VacanteDetallePage />, "es")
    expect(screen.getAllByText("Cargando vacante...").length).toBeGreaterThan(0)
  })

  it("renderiza el estado de carga en inglés", () => {
    renderWithIntl(<VacanteDetallePage />, "en")
    expect(screen.getAllByText("Loading vacancy...").length).toBeGreaterThan(0)
  })
})

describe("VacancyReadOnlyBanner i18n (Etapa 17)", () => {
  it("renderiza el banner de solo lectura en español", () => {
    renderWithIntl(<VacancyReadOnlyBanner reason="vacancy" />, "es")
    expect(screen.getByText("Vacante inactiva — solo lectura")).toBeInTheDocument()
  })

  it("renderiza el banner de solo lectura en inglés", () => {
    renderWithIntl(<VacancyReadOnlyBanner reason="vacancy" />, "en")
    expect(screen.getByText("Inactive vacancy — read only")).toBeInTheDocument()
  })
})

describe("VacancyFinishedSummary i18n (Etapa 17)", () => {
  it("mantiene comentarios dinámicos verbatim", () => {
    renderWithIntl(
      <VacancyFinishedSummary calification={4} comments="Notas del reclutador desde API." />,
      "es",
    )
    expect(screen.getByText("Evaluación del proceso")).toBeInTheDocument()
    expect(screen.getByText("Notas del reclutador desde API.")).toBeInTheDocument()
  })
})

describe("FinishVacancyProcessModal i18n (Etapa 17)", () => {
  it("renderiza el modal en inglés", () => {
    renderWithIntl(
      <FinishVacancyProcessModal isOpen onClose={() => {}} onConfirm={async () => {}} />,
      "en",
    )
    expect(screen.getByText("Finish vacancy process")).toBeInTheDocument()
    expect(screen.getByText("Process rating")).toBeInTheDocument()
  })
})

describe("getVacancyStatusLabel en detalle (Etapa 17)", () => {
  const tEs = (key: string) => {
    const ns = messagesByLocale.es.RecruiterPortal as Record<string, unknown>
    const vacancies = ns.vacancies as Record<string, unknown>
    const statuses = vacancies.statuses as Record<string, string>
    const shortKey = key.replace("statuses.", "")
    return statuses[shortKey]
  }

  it("traduce estados conocidos", () => {
    expect(getVacancyStatusLabel("activa", tEs)).toBe("Activa")
    expect(getVacancyStatusLabel("cerrada", tEs)).toBe("Cerrada")
  })

  it("devuelve valor crudo para estados desconocidos", () => {
    expect(getVacancyStatusLabel("CustomBackendState", tEs)).toBe("CustomBackendState")
  })
})

describe("RecruiterPortal.vacancies.detail namespace parity (Etapa 17)", () => {
  it("expone detail en los 5 idiomas", () => {
    for (const locale of locales) {
      const vacancies = (
        messagesByLocale[locale].RecruiterPortal as Record<string, unknown>
      ).vacancies as Record<string, unknown>
      expect(Object.keys(vacancies), `detail ausente en ${locale}.json`).toContain(
        "detail",
      )
    }
  })

  it("expone Metadata.recruiterVacancyDetail en los 5 idiomas", () => {
    for (const locale of locales) {
      const metadata = messagesByLocale[locale].Metadata as Record<string, unknown>
      expect(
        Object.keys(metadata),
        `recruiterVacancyDetail ausente en ${locale}.json`,
      ).toContain("recruiterVacancyDetail")
    }
  })
})
