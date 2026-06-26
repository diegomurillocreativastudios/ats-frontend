import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import IniciarSesion from "@/app/auth/iniciar-sesion/page"
import ForgotPasswordContent from "@/app/auth/forgot-password/ForgotPasswordContent"
import RestablecerContrasenaContent from "@/app/restablecer-contrasena/RestablecerContrasenaContent"
import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

/**
 * Etapa 4 — i18n de pantallas auth/acceso.
 *
 * Verifica que los textos estáticos de login, recuperar y restablecer
 * contraseña provienen de `next-intl`, que el selector de idioma está
 * disponible en pantallas no autenticadas y que los diccionarios mantienen
 * los namespaces de esta etapa en los 5 idiomas. NO se prueba data dinámica/IA.
 */

let searchParamsValue = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/auth/iniciar-sesion",
  useSearchParams: () => searchParamsValue,
}))

const messagesByLocale = { es: esMessages, en: enMessages } as const

function renderWithIntl(ui: React.ReactNode, locale: Locale) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      {ui}
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  searchParamsValue = new URLSearchParams()
})

describe("Login i18n (Etapa 4)", () => {
  it("renderiza los textos estáticos del login en español desde next-intl", () => {
    renderWithIntl(<IniciarSesion />, "es")
    expect(
      screen.getByRole("heading", { name: "Iniciar Sesión" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Usuario o correo electrónico")).toBeInTheDocument()
    expect(screen.getByText("Contraseña")).toBeInTheDocument()
    expect(screen.getByText("¿Olvidaste tu contraseña?")).toBeInTheDocument()
  })

  it("traduce los textos del login al inglés según el locale", () => {
    renderWithIntl(<IniciarSesion />, "en")
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.getByText("Username or email")).toBeInTheDocument()
    expect(screen.getByText("Forgot your password?")).toBeInTheDocument()
  })

  it("muestra el selector de idioma en la pantalla de login (no autenticada)", () => {
    renderWithIntl(<IniciarSesion />, "es")
    expect(
      screen.getByRole("button", { name: "Idioma" }),
    ).toBeInTheDocument()
  })
})

describe("Recuperar contraseña i18n (Etapa 4)", () => {
  it("renderiza los textos en español desde next-intl", () => {
    renderWithIntl(<ForgotPasswordContent />, "es")
    expect(
      screen.getByRole("heading", { name: "¿Olvidaste tu contraseña?" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Enviar instrucciones" }),
    ).toBeInTheDocument()
  })

  it("traduce los textos al inglés y mantiene el selector de idioma", () => {
    renderWithIntl(<ForgotPasswordContent />, "en")
    expect(
      screen.getByRole("heading", { name: "Forgot your password?" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Send instructions" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Language" })).toBeInTheDocument()
  })
})

describe("Restablecer contraseña i18n (Etapa 4)", () => {
  it("renderiza el formulario traducido cuando hay token en la URL", () => {
    searchParamsValue = new URLSearchParams("token=demo-token")
    renderWithIntl(<RestablecerContrasenaContent />, "es")
    expect(
      screen.getByRole("heading", { name: "Restablecer contraseña" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    ).toBeInTheDocument()
  })

  it("traduce el estado de enlace inválido al inglés", () => {
    searchParamsValue = new URLSearchParams()
    renderWithIntl(<RestablecerContrasenaContent />, "en")
    expect(screen.getByTestId("auth-reset-invalid-link")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "We couldn't open the reset" }),
    ).toBeInTheDocument()
  })
})

describe("Diccionarios auth (Etapa 4)", () => {
  const allMessages: Record<Locale, Record<string, unknown>> = {
    es: esMessages,
    en: enMessages,
    it: itMessages,
    de: deMessages,
    fr: frMessages,
  }

  it("define los namespaces de esta etapa en los 5 idiomas", () => {
    const expected = ["Auth", "Validation", "Errors", "PortalSelection"]
    for (const locale of locales) {
      const namespaces = Object.keys(allMessages[locale])
      for (const namespace of expected) {
        expect(
          namespaces,
          `${namespace} ausente en ${locale}.json`,
        ).toContain(namespace)
      }
    }
  })
})
