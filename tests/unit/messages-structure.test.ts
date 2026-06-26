import { describe, it, expect } from "vitest"

import { locales, defaultLocale, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

/**
 * Paridad estructural de los diccionarios de i18n (Etapa 3).
 *
 * `es.json` es la fuente de verdad. Este test falla si cualquier otro idioma:
 *  - omite una key presente en `es.json`, o
 *  - introduce una key que no existe en `es.json`.
 *
 * Solo valida la ESTRUCTURA de keys, nunca el contenido traducido.
 */

type JsonObject = Record<string, unknown>

const isPlainObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Aplana un diccionario anidado a un set de rutas tipo `Namespace.key.subkey`. */
function flattenKeys(messages: JsonObject, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return isPlainObject(value) ? flattenKeys(value, path) : [path]
  })
}

const messagesByLocale: Record<Locale, JsonObject> = {
  es: esMessages,
  en: enMessages,
  it: itMessages,
  de: deMessages,
  fr: frMessages,
}

const baseKeys = flattenKeys(esMessages).sort()
const otherLocales = locales.filter((locale) => locale !== defaultLocale)

describe("messages structure parity (Etapa 3)", () => {
  it("usa es como fuente de verdad y expone keys", () => {
    expect(defaultLocale).toBe("es")
    expect(baseKeys.length).toBeGreaterThan(0)
  })

  it.each(otherLocales)(
    "el diccionario '%s' tiene exactamente las mismas keys que es.json",
    (locale) => {
      const localeKeys = flattenKeys(messagesByLocale[locale]).sort()

      const missingKeys = baseKeys.filter((key) => !localeKeys.includes(key))
      const extraKeys = localeKeys.filter((key) => !baseKeys.includes(key))

      expect(missingKeys, `Keys faltantes en ${locale}.json`).toEqual([])
      expect(extraKeys, `Keys sobrantes en ${locale}.json`).toEqual([])
    },
  )

  it("define los namespaces transversales esperados en los 5 idiomas", () => {
    const expectedNamespaces = [
      "Common",
      "Actions",
      "Navigation",
      "Topbar",
      "Sidebar",
      "LanguageSwitcher",
    ]
    for (const locale of locales) {
      const namespaces = Object.keys(messagesByLocale[locale])
      for (const namespace of expectedNamespaces) {
        expect(namespaces, `${namespace} ausente en ${locale}.json`).toContain(
          namespace,
        )
      }
    }
  })
})
