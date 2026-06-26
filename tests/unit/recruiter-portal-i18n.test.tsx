import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

/**
 * Etapa 6 — i18n del Portal RRHH básico.
 *
 * Verifica que la UI estática migrada del Portal RRHH (listado de candidatos
 * como home y la pantalla de configuración) resuelve sus textos desde
 * `next-intl` (namespace `RecruiterPortal`) en `es` y `en`, y que el namespace
 * mantiene paridad en los 5 idiomas. NO se prueba data dinámica/IA ni texto
 * libre del backend: solo UI estática controlada por frontend.
 */

const hoisted = vi.hoisted(() => ({ locale: "es" }))

// --- Mocks de dependencias pesadas / shells transversales -----------------

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(async () => []),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("@/components/rrhh/RRHHSidebar", () => ({
  default: () => null,
}))

vi.mock("@/components/rrhh/RRHHTopbar", () => ({
  default: ({ breadcrumbLabel }: { breadcrumbLabel?: string }) => (
    <div data-testid="rrhh-topbar">{breadcrumbLabel}</div>
  ),
}))

vi.mock("@/components/candidato/AgregarCandidatoModal", () => ({
  default: () => null,
}))

vi.mock("@/components/candidato/CandidateFollowUpModal", () => ({
  default: () => null,
}))

vi.mock("@/components/ui/Snackbar", () => ({
  default: () => null,
}))

// Mock de `next-intl/server` para el Server Component de configuración.
vi.mock("next-intl/server", async () => {
  const dicts: Record<string, unknown> = {
    es: (await import("@/messages/es.json")).default,
    en: (await import("@/messages/en.json")).default,
    it: (await import("@/messages/it.json")).default,
    de: (await import("@/messages/de.json")).default,
    fr: (await import("@/messages/fr.json")).default,
  }

  const resolve = (obj: unknown, path: string): unknown =>
    path
      .split(".")
      .reduce<unknown>(
        (acc, key) =>
          acc != null && typeof acc === "object"
            ? (acc as Record<string, unknown>)[key]
            : undefined,
        obj,
      )

  return {
    getTranslations: async (
      arg: string | { locale?: string; namespace: string },
    ) => {
      const namespace = typeof arg === "string" ? arg : arg.namespace
      const locale = (typeof arg === "object" && arg.locale) || hoisted.locale
      const ns = resolve(dicts[locale], namespace)
      return (key: string) => {
        const value = resolve(ns, key)
        if (typeof value !== "string") {
          throw new Error(
            `Missing/non-string key "${namespace}.${key}" for locale "${locale}"`,
          )
        }
        return value
      }
    },
  }
})

import CandidatosPage from "@/app/portal-rrhh/candidatos/page"
import RRHHConfiguracionPage from "@/app/portal-rrhh/configuracion/page"

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

describe("CandidatosPage (home RRHH) i18n (Etapa 6)", () => {
  beforeEach(() => {
    hoisted.locale = "es"
  })

  it("renderiza la UI estática del listado en español", async () => {
    renderWithIntl(<CandidatosPage />, "es")

    expect((await screen.findAllByText("Candidatos")).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText("Revisa y gestiona todos los candidatos").length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByPlaceholderText("Buscar candidatos...").length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText("Agregar candidato").length).toBeGreaterThan(0)
    // Estado vacío (apiClient.get mockeado → [])
    expect((await screen.findAllByText("No hay candidatos")).length).toBeGreaterThan(0)
  })

  it("renderiza la UI estática del listado en inglés", async () => {
    renderWithIntl(<CandidatosPage />, "en")

    expect((await screen.findAllByText("Candidates")).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText("Review and manage all candidates").length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByPlaceholderText("Search candidates...").length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText("Add candidate").length).toBeGreaterThan(0)
    expect((await screen.findAllByText("No candidates")).length).toBeGreaterThan(0)
  })
})

describe("RRHHConfiguracionPage i18n (Etapa 6)", () => {
  it("renderiza textos estáticos de configuración en español", async () => {
    hoisted.locale = "es"
    const ui = await RRHHConfiguracionPage()
    render(ui)

    expect(screen.getAllByText("Configuracion").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Calendario Google").length).toBeGreaterThan(0)
    expect(
      screen.getByText(
        "Conecta y administra la sincronización de entrevistas.",
      ),
    ).toBeInTheDocument()
  })

  it("renderiza textos estáticos de configuración en inglés", async () => {
    hoisted.locale = "en"
    const ui = await RRHHConfiguracionPage()
    render(ui)

    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Google Calendar").length).toBeGreaterThan(0)
    expect(
      screen.getByText("Connect and manage interview synchronization."),
    ).toBeInTheDocument()
  })
})

describe("RecruiterPortal namespace parity (Etapa 6)", () => {
  it("expone el namespace RecruiterPortal en los 5 idiomas", () => {
    for (const locale of locales) {
      expect(
        Object.keys(messagesByLocale[locale]),
        `RecruiterPortal ausente en ${locale}.json`,
      ).toContain("RecruiterPortal")
    }
  })

  it("mantiene las subsecciones candidates/settings en los 5 idiomas", () => {
    for (const locale of locales) {
      const ns = messagesByLocale[locale].RecruiterPortal as Record<
        string,
        unknown
      >
      expect(Object.keys(ns), `subsecciones en ${locale}.json`).toEqual(
        expect.arrayContaining(["candidates", "settings"]),
      )
    }
  })

  it("conserva el value canónico de la búsqueda no enviado al backend", () => {
    // El namespace solo contiene UI estática; no debe contener data IA/dinámica.
    const candidates = (esMessages.RecruiterPortal as Record<string, unknown>)
      .candidates as Record<string, unknown>
    expect(candidates.rowAriaLabel).toBe("Candidato {name}")
  })
})
