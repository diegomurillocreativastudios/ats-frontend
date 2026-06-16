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
 * Etapa 13 — i18n del Portal Admin básico.
 *
 * Verifica que la UI estática migrada del Portal Admin (listado de empresas,
 * listado de usuarios y la pantalla de configuración) resuelve sus textos desde
 * `next-intl` (namespace `AdminPortal`) en `es` y `en`, y que el namespace +
 * `Metadata.adminPortal` mantienen paridad en los 5 idiomas. NO se prueba data
 * dinámica/IA ni texto libre del backend: solo UI estática controlada por
 * frontend. Los nombres de empresa/usuario y los roles (Admin/Recruiter/
 * Candidate) se mantienen verbatim.
 */

const hoisted = vi.hoisted(() => ({ locale: "es" }))

vi.mock("@/lib/api/admin-companies", () => ({
  fetchAdminCompaniesList: vi.fn(async () => ({
    items: [],
    totalCount: 0,
    page: 1,
  })),
  fetchAdminCompanyById: vi.fn(),
  createAdminCompany: vi.fn(),
  createAdminCompanyWithLogo: vi.fn(),
  updateAdminCompany: vi.fn(),
  updateAdminCompanyWithLogo: vi.fn(),
  deleteAdminCompanyLogo: vi.fn(),
  buildLogoDataUri: vi.fn(() => null),
}))

vi.mock("@/lib/api/admin-users", () => ({
  fetchAdminUsersList: vi.fn(async () => ({
    items: [],
    totalCount: 0,
    page: 1,
  })),
  fetchAdminUserById: vi.fn(),
  createAdminUser: vi.fn(),
  patchAdminUser: vi.fn(),
  setAdminUserLockout: vi.fn(),
  postAdminUserRoles: vi.fn(),
  deleteAdminUserRole: vi.fn(),
  postAdminUserSendPasswordReset: vi.fn(),
}))

vi.mock("@/components/ui/Snackbar", () => ({ default: () => null }))

// Mock de `next-intl/server` para el Server Component de configuración + metadata.
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

import AdminEmpresasContent from "@/components/portal-admin/AdminEmpresasContent"
import AdminUsuariosContent from "@/components/portal-admin/AdminUsuariosContent"
import PortalAdminConfiguracionPage from "@/app/portal-admin/configuracion/page"

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

describe("AdminEmpresasContent i18n (Etapa 13)", () => {
  beforeEach(() => {
    hoisted.locale = "es"
  })

  it("renderiza la UI estática del listado de empresas en español", async () => {
    renderWithIntl(<AdminEmpresasContent />, "es")

    expect((await screen.findAllByText("Empresas")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("Crear empresa").length).toBeGreaterThan(0)
    expect(await screen.findByText("Aún no hay empresas")).toBeInTheDocument()
  })

  it("renderiza la UI estática del listado de empresas en inglés", async () => {
    renderWithIntl(<AdminEmpresasContent />, "en")

    expect((await screen.findAllByText("Companies")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("Create company").length).toBeGreaterThan(0)
    expect(await screen.findByText("No companies yet")).toBeInTheDocument()
  })
})

describe("AdminUsuariosContent i18n (Etapa 13)", () => {
  beforeEach(() => {
    hoisted.locale = "es"
  })

  it("renderiza la UI estática del listado de usuarios en español", async () => {
    renderWithIntl(<AdminUsuariosContent />, "es")

    expect((await screen.findAllByText("Usuarios")).length).toBeGreaterThan(0)
    expect(screen.getByText("Nuevo usuario")).toBeInTheDocument()
    expect(
      await screen.findByText("No hay usuarios con los filtros actuales."),
    ).toBeInTheDocument()
    // Los roles asignables son valores del backend: se mantienen verbatim.
    expect(screen.getByRole("option", { name: "Admin" })).toBeInTheDocument()
  })

  it("renderiza la UI estática del listado de usuarios en inglés", async () => {
    renderWithIntl(<AdminUsuariosContent />, "en")

    expect((await screen.findAllByText("Users")).length).toBeGreaterThan(0)
    expect(screen.getByText("New user")).toBeInTheDocument()
    expect(
      await screen.findByText("No users match the current filters."),
    ).toBeInTheDocument()
    // Rol verbatim también en inglés (no se traduce).
    expect(screen.getByRole("option", { name: "Recruiter" })).toBeInTheDocument()
  })
})

describe("PortalAdminConfiguracionPage i18n (Etapa 13)", () => {
  it("renderiza textos estáticos de configuración en español", async () => {
    hoisted.locale = "es"
    const ui = await PortalAdminConfiguracionPage()
    render(ui)

    expect(screen.getByText("Configuracion")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Esta vista queda lista para centralizar las configuraciones del portal admin.",
      ),
    ).toBeInTheDocument()
  })

  it("renderiza textos estáticos de configuración en inglés", async () => {
    hoisted.locale = "en"
    const ui = await PortalAdminConfiguracionPage()
    render(ui)

    expect(screen.getByText("Settings")).toBeInTheDocument()
    expect(
      screen.getByText(
        "This view is ready to centralize the admin portal settings.",
      ),
    ).toBeInTheDocument()
  })
})

describe("AdminPortal namespace parity (Etapa 13)", () => {
  it("expone el namespace AdminPortal en los 5 idiomas", () => {
    for (const locale of locales) {
      expect(
        Object.keys(messagesByLocale[locale]),
        `AdminPortal ausente en ${locale}.json`,
      ).toContain("AdminPortal")
    }
  })

  it("mantiene las subsecciones companies/users/configuration en los 5 idiomas", () => {
    for (const locale of locales) {
      const ns = messagesByLocale[locale].AdminPortal as Record<string, unknown>
      expect(Object.keys(ns), `subsecciones en ${locale}.json`).toEqual(
        expect.arrayContaining(["companies", "users", "configuration"]),
      )
    }
  })

  it("expone Metadata.adminPortal en los 5 idiomas", () => {
    for (const locale of locales) {
      const metadata = messagesByLocale[locale].Metadata as Record<
        string,
        unknown
      >
      expect(
        Object.keys(metadata),
        `adminPortal ausente en ${locale}.json`,
      ).toContain("adminPortal")
    }
  })

  it("conserva los placeholders canónicos de UI (sin data IA/dinámica)", () => {
    const companies = (esMessages.AdminPortal as Record<string, unknown>)
      .companies as Record<string, unknown>
    const logoCell = companies.logoCell as Record<string, unknown>
    const toasts = companies.toasts as Record<string, unknown>
    expect(logoCell.withName).toBe("Logo de {name}")
    expect(toasts.created).toBe("Empresa creada. ID: {id}")
  })
})
