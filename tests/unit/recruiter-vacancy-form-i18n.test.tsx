import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

/**
 * Etapa 8 — i18n del formulario de creación de vacante RRHH (NuevaVacanteModal).
 *
 * Verifica que la UI estática del formulario (título del modal, labels,
 * placeholders, acciones y validaciones frontend) resuelve sus textos desde
 * `next-intl` (namespace `RecruiterPortal.vacancies.form`) en `es` y `en`, que
 * los `value` canónicos de los selects controlados por frontend no cambian, y
 * que el subnamespace `form` mantiene paridad de keys en los 5 idiomas.
 *
 * NO se prueba data dinámica/IA, opciones que provienen de API/BD (empresas,
 * departamentos, modalidades) ni texto libre del backend: solo UI estática
 * controlada por frontend.
 */

// --- Mocks de dependencias pesadas / acoplamientos a API ------------------

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(async () => []),
    post: vi.fn(async () => ({})),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("@/lib/api/admin-vacancy-catalogs", () => ({
  listAdminVacancyCatalog: vi.fn(async () => []),
}))

vi.mock("@/lib/api/recruiter-companies", () => ({
  DEFAULT_RECRUITER_COMPANY_ID: "default-co",
  listRecruiterCompanies: vi.fn(async () => []),
  persistVacancyCompanyId: vi.fn(),
}))

// El campo de ubicación carga catálogos remotos (GeoNames / countrystatecity);
// se mockea para aislar la prueba a la UI estática del formulario y exponer los
// labels traducidos que recibe por props.
vi.mock("@/components/rrhh/VacancyLocationFields", () => ({
  VacancyLocationFields: ({
    countryLabel,
    stateLabel,
    helperText,
  }: {
    countryLabel?: string
    stateLabel?: string
    helperText?: string
  }) => (
    <div data-testid="vacancy-location-fields">
      <span>{countryLabel}</span>
      <span>{stateLabel}</span>
      <span>{helperText}</span>
    </div>
  ),
}))

import NuevaVacanteModal from "@/components/rrhh/NuevaVacanteModal"

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

const noop = () => {}

describe("NuevaVacanteModal i18n (Etapa 8)", () => {
  it("renderiza la UI estática del formulario en español", async () => {
    renderWithIntl(
      <NuevaVacanteModal isOpen onClose={noop} onSubmit={noop} onSnackbar={noop} />,
      "es",
    )

    expect(await screen.findByText("Nueva vacante")).toBeInTheDocument()
    expect(screen.getByText("Nombre de la vacante")).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText("Ej: Frontend Developer"),
    ).toBeInTheDocument()
    expect(screen.getByText("Descripción de la vacante")).toBeInTheDocument()
    expect(screen.getByText("Requerimientos")).toBeInTheDocument()
    // Acciones del footer (botón Crear vacante incluye aria-label igual al texto).
    expect(
      screen.getByRole("button", { name: "Crear vacante" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument()
    // Labels de ubicación traducidos pasados por props al campo de ubicación.
    expect(
      screen.getByText("País al que aplica la vacante"),
    ).toBeInTheDocument()
  })

  it("renderiza la UI estática del formulario en inglés", async () => {
    renderWithIntl(
      <NuevaVacanteModal isOpen onClose={noop} onSubmit={noop} onSnackbar={noop} />,
      "en",
    )

    expect(await screen.findByText("New vacancy")).toBeInTheDocument()
    expect(screen.getByText("Vacancy name")).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText("E.g.: Frontend Developer"),
    ).toBeInTheDocument()
    expect(screen.getByText("Vacancy description")).toBeInTheDocument()
    expect(screen.getByText("Requirements")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Create vacancy" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
    expect(
      screen.getByText("Country the vacancy applies to"),
    ).toBeInTheDocument()
  })

  it("muestra validaciones frontend estáticas desde el diccionario (es)", async () => {
    const { container } = renderWithIntl(
      <NuevaVacanteModal isOpen onClose={noop} onSubmit={noop} onSnackbar={noop} />,
      "es",
    )

    await screen.findByText("Nueva vacante")
    const form = container.querySelector("#nueva-vacante-form") as HTMLFormElement
    fireEvent.submit(form)

    expect(await screen.findByText("El nombre es requerido")).toBeInTheDocument()
    expect(screen.getByText("La descripción es requerida")).toBeInTheDocument()
  })

  it("muestra validaciones frontend estáticas desde el diccionario (en)", async () => {
    const { container } = renderWithIntl(
      <NuevaVacanteModal isOpen onClose={noop} onSubmit={noop} onSnackbar={noop} />,
      "en",
    )

    await screen.findByText("New vacancy")
    const form = container.querySelector("#nueva-vacante-form") as HTMLFormElement
    fireEvent.submit(form)

    expect(await screen.findByText("Name is required")).toBeInTheDocument()
    expect(screen.getByText("Description is required")).toBeInTheDocument()
  })

  it("conserva el value canónico del select frontend 'Sin especificar' (sin traducir el value)", async () => {
    renderWithIntl(
      <NuevaVacanteModal isOpen onClose={noop} onSubmit={noop} onSnackbar={noop} />,
      "en",
    )

    await screen.findByText("New vacancy")
    // El label visible se traduce, pero el value sigue siendo el canónico ("").
    const unspecifiedOptions = screen.getAllByRole("option", {
      name: "Unspecified",
    }) as HTMLOptionElement[]
    expect(unspecifiedOptions.length).toBeGreaterThan(0)
    for (const option of unspecifiedOptions) {
      expect(option.value).toBe("")
    }
  })
})

describe("RecruiterPortal.vacancies.form namespace parity (Etapa 8)", () => {
  function collectKeys(value: unknown, prefix = ""): string[] {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return [prefix]
    }
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      collectKeys(child, prefix ? `${prefix}.${key}` : key),
    )
  }

  function getFormNamespace(locale: Locale): Record<string, unknown> {
    const recruiterPortal = messagesByLocale[locale].RecruiterPortal as Record<
      string,
      unknown
    >
    const vacancies = recruiterPortal.vacancies as Record<string, unknown>
    return vacancies.form as Record<string, unknown>
  }

  it("expone el subnamespace form en los 5 idiomas", () => {
    for (const locale of locales) {
      expect(getFormNamespace(locale), `form ausente en ${locale}.json`).toBeTruthy()
    }
  })

  it("mantiene paridad exacta de keys de form en los 5 idiomas", () => {
    const baseKeys = collectKeys(getFormNamespace("es")).sort()
    for (const locale of locales) {
      const localeKeys = collectKeys(getFormNamespace(locale)).sort()
      expect(localeKeys, `keys de form desalineadas en ${locale}.json`).toEqual(
        baseKeys,
      )
    }
  })
})
