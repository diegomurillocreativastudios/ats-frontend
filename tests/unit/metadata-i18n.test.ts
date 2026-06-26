import { describe, it, expect, beforeEach, vi } from "vitest"

import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

/**
 * Etapa 5A — i18n de metadata estática de auth/acceso.
 *
 * Verifica que `generateMetadata` de las páginas auth/acceso resuelve su
 * `title`/`description` desde `next-intl` (namespace `Metadata`) según el
 * locale activo, y que las keys de `Metadata` mantienen paridad en los 5
 * idiomas. NO se prueba data dinámica/IA: solo texto estático de UI.
 */

const hoisted = vi.hoisted(() => ({ locale: "es" }))

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
    getTranslations: async (arg: string | { locale?: string; namespace: string }) => {
      const namespace = typeof arg === "string" ? arg : arg.namespace
      const locale =
        (typeof arg === "object" && arg.locale) || hoisted.locale
      const ns = resolve(dicts[locale], namespace)
      return (key: string) => {
        const value =
          ns != null && typeof ns === "object"
            ? (ns as Record<string, unknown>)[key]
            : undefined
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

import { generateMetadata as forgotPasswordMetadata } from "@/app/auth/forgot-password/page"
import { generateMetadata as resetPasswordMetadata } from "@/app/restablecer-contrasena/page"
import { generateMetadata as authResetPasswordMetadata } from "@/app/auth/restablecer-contrasena/page"
import { generateMetadata as portalSelectionMetadata } from "@/app/seleccion-portal/page"
import { generateMetadata as candidateProfileMetadata } from "@/app/mi-perfil/page"

const allMessages: Record<Locale, Record<string, unknown>> = {
  es: esMessages,
  en: enMessages,
  it: itMessages,
  de: deMessages,
  fr: frMessages,
}

beforeEach(() => {
  hoisted.locale = "es"
})

describe("Metadata auth/acceso (Etapa 5A)", () => {
  it("genera la metadata de login desde next-intl en es y en", () => {
    expect(esMessages.Metadata.auth.login.title).toBe("Iniciar sesión")
    expect(enMessages.Metadata.auth.login.title).toBe("Sign in")
  })

  it("genera la metadata de forgot password desde next-intl en es", async () => {
    hoisted.locale = "es"
    const metadata = await forgotPasswordMetadata()
    expect(metadata.title).toBe(esMessages.Metadata.auth.forgotPassword.title)
    expect(metadata.description).toBe(
      esMessages.Metadata.auth.forgotPassword.description,
    )
  })

  it("genera la metadata de forgot password desde next-intl en en", async () => {
    hoisted.locale = "en"
    const metadata = await forgotPasswordMetadata()
    expect(metadata.title).toBe(enMessages.Metadata.auth.forgotPassword.title)
    expect(metadata.description).toBe(
      enMessages.Metadata.auth.forgotPassword.description,
    )
  })

  it("genera la metadata de reset password (ruta pública) en es y en", async () => {
    hoisted.locale = "es"
    const es = await resetPasswordMetadata()
    expect(es.title).toBe(esMessages.Metadata.auth.resetPassword.title)
    expect(es.description).toBe(esMessages.Metadata.auth.resetPassword.description)

    hoisted.locale = "en"
    const en = await resetPasswordMetadata()
    expect(en.title).toBe(enMessages.Metadata.auth.resetPassword.title)
    expect(en.description).toBe(enMessages.Metadata.auth.resetPassword.description)
  })

  it("genera la metadata de reset password (ruta /auth) en es y en", async () => {
    hoisted.locale = "es"
    const es = await authResetPasswordMetadata()
    expect(es.title).toBe(esMessages.Metadata.auth.resetPassword.title)

    hoisted.locale = "en"
    const en = await authResetPasswordMetadata()
    expect(en.title).toBe(enMessages.Metadata.auth.resetPassword.title)
  })

  it("genera la metadata de selección de portal en es y en", async () => {
    hoisted.locale = "es"
    const es = await portalSelectionMetadata()
    expect(es.title).toBe(esMessages.Metadata.portalSelection.title)
    expect(es.description).toBe(esMessages.Metadata.portalSelection.description)

    hoisted.locale = "en"
    const en = await portalSelectionMetadata()
    expect(en.title).toBe(enMessages.Metadata.portalSelection.title)
    expect(en.description).toBe(enMessages.Metadata.portalSelection.description)
  })

  it("genera la metadata de /mi-perfil desde next-intl en es y en (Etapa 5E)", async () => {
    hoisted.locale = "es"
    const es = await candidateProfileMetadata()
    expect(es.title).toBe(esMessages.Metadata.candidateProfile.title)
    expect(es.description).toBe(esMessages.Metadata.candidateProfile.description)

    hoisted.locale = "en"
    const en = await candidateProfileMetadata()
    expect(en.title).toBe(enMessages.Metadata.candidateProfile.title)
    expect(en.description).toBe(enMessages.Metadata.candidateProfile.description)
  })
})

describe("Diccionarios Metadata (Etapa 5A)", () => {
  it("define el namespace Metadata en los 5 idiomas", () => {
    for (const locale of locales) {
      expect(
        Object.keys(allMessages[locale]),
        `Metadata ausente en ${locale}.json`,
      ).toContain("Metadata")
    }
  })

  it("mantiene las keys de Metadata.auth y Metadata.portalSelection en los 5 idiomas", () => {
    for (const locale of locales) {
      const metadata = allMessages[locale].Metadata as Record<string, unknown>
      const auth = metadata.auth as Record<string, unknown>
      expect(Object.keys(auth).sort()).toEqual([
        "forgotPassword",
        "login",
        "register",
        "resetPassword",
      ])
      expect(Object.keys(metadata.portalSelection as object).sort()).toEqual([
        "description",
        "title",
      ])
      expect(Object.keys(metadata.candidateProfile as object).sort()).toEqual([
        "description",
        "title",
      ])
    }
  })
})
