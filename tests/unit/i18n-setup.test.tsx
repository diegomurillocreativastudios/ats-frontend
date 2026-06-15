import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider, useTranslations } from "next-intl"

import { defaultLocale, isLocale, locales } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

function CommonProbe() {
  const t = useTranslations("Common")
  return <span data-testid="probe">{t("loading")}</span>
}

const messagesByLocale = {
  es: esMessages,
  en: enMessages,
  it: itMessages,
  de: deMessages,
  fr: frMessages,
} as const

describe("i18n setup (Etapa 1)", () => {
  it("define los 5 locales soportados con es como default/fallback", () => {
    expect(locales).toEqual(["es", "en", "it", "de", "fr"])
    expect(defaultLocale).toBe("es")
  })

  it("valida locales con el type guard isLocale", () => {
    expect(isLocale("es")).toBe(true)
    expect(isLocale("fr")).toBe(true)
    expect(isLocale("pt")).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })

  it("traduce un texto estático de UI por locale", () => {
    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <CommonProbe />
      </NextIntlClientProvider>
    )
    expect(screen.getByTestId("probe")).toHaveTextContent("Cargando...")
  })

  it("traduce el mismo texto en inglés", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <CommonProbe />
      </NextIntlClientProvider>
    )
    expect(screen.getByTestId("probe")).toHaveTextContent("Loading...")
  })

  it("expone las mismas claves de Common en los 5 idiomas", () => {
    const baseKeys = Object.keys(esMessages.Common).sort()
    for (const locale of locales) {
      const localeKeys = Object.keys(messagesByLocale[locale].Common).sort()
      expect(localeKeys).toEqual(baseKeys)
    }
  })
})
