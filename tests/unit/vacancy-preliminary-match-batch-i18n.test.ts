import { describe, it, expect } from "vitest"

import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

const messagesByLocale: Record<Locale, Record<string, unknown>> = {
  es: esMessages,
  en: enMessages,
  it: itMessages,
  de: deMessages,
  fr: frMessages,
}

function getMatchingNamespace(locale: Locale) {
  const recruiterPortal = messagesByLocale[locale].RecruiterPortal as Record<
    string,
    unknown
  >
  const vacancies = recruiterPortal.vacancies as Record<string, unknown>
  return vacancies.matching as Record<string, unknown>
}

describe("RecruiterPortal.vacancies.matching batch progress i18n", () => {
  it("exposes processingCurrentCandidate in the 5 locales", () => {
    for (const locale of locales) {
      const matching = getMatchingNamespace(locale)
      expect(
        matching.processingCurrentCandidate,
        `processingCurrentCandidate ausente en ${locale}.json`
      ).toEqual(expect.stringContaining("{current}"))
      expect(String(matching.processingCurrentCandidate)).toContain("{total}")
    }
  })

  it("exposes matchPartialSuccess toast in the 5 locales", () => {
    for (const locale of locales) {
      const matching = getMatchingNamespace(locale)
      const toasts = matching.toasts as Record<string, unknown>
      expect(
        toasts.matchPartialSuccess,
        `matchPartialSuccess ausente en ${locale}.json`
      ).toEqual(expect.stringContaining("{succeeded}"))
      expect(String(toasts.matchPartialSuccess)).toContain("{total}")
      expect(String(toasts.matchPartialSuccess)).toContain("{names}")
    }
  })
})
