import { describe, expect, it } from "vitest"

import type { Locale } from "@/i18n/routing"
import deMessages from "@/messages/de.json"
import enMessages from "@/messages/en.json"
import esMessages from "@/messages/es.json"
import frMessages from "@/messages/fr.json"
import itMessages from "@/messages/it.json"

const locales: Locale[] = ["es", "en", "it", "de", "fr"]

const allMessages: Record<Locale, Record<string, unknown>> = {
  es: esMessages,
  en: enMessages,
  it: itMessages,
  de: deMessages,
  fr: frMessages,
}

function sortedKeys(value: unknown): string[] {
  if (!value || typeof value !== "object") return []
  return Object.keys(value as object).sort()
}

describe("PruebasPortal i18n (UI-02)", () => {
  it("define PruebasPortal, Metadata.pruebasPortal y claves de selector en los 5 idiomas", () => {
    const expectedNav = sortedKeys(esMessages.PruebasPortal.nav)
    const expectedGroups = sortedKeys(esMessages.PruebasPortal.nav.groups)

    for (const locale of locales) {
      const messages = allMessages[locale]
      expect(Object.keys(messages), `PruebasPortal ausente en ${locale}`).toContain(
        "PruebasPortal",
      )

      const portal = messages.PruebasPortal as typeof esMessages.PruebasPortal
      expect(sortedKeys(portal)).toEqual(
        sortedKeys(esMessages.PruebasPortal),
      )
      expect(sortedKeys(portal.nav)).toEqual(expectedNav)
      expect(sortedKeys(portal.nav.groups)).toEqual(expectedGroups)
      expect(sortedKeys(portal.dashboard)).toEqual(
        sortedKeys(esMessages.PruebasPortal.dashboard),
      )
      expect(sortedKeys(portal.dashboard.metrics)).toEqual(
        sortedKeys(esMessages.PruebasPortal.dashboard.metrics),
      )
      expect(sortedKeys(portal.dashboard.filters)).toEqual(
        sortedKeys(esMessages.PruebasPortal.dashboard.filters),
      )
      expect(sortedKeys(portal.evaluations)).toEqual(
        sortedKeys(esMessages.PruebasPortal.evaluations),
      )
      expect(sortedKeys(portal.evaluations.status)).toEqual(
        sortedKeys(esMessages.PruebasPortal.evaluations.status),
      )
      expect(sortedKeys(portal.evaluations.actions)).toEqual(
        sortedKeys(esMessages.PruebasPortal.evaluations.actions),
      )
      expect(sortedKeys(portal.evaluations.editor)).toEqual(
        sortedKeys(esMessages.PruebasPortal.evaluations.editor),
      )
      expect(sortedKeys(portal.evaluations.editor.steps)).toEqual(
        sortedKeys(esMessages.PruebasPortal.evaluations.editor.steps),
      )
      expect(sortedKeys(portal.questionsBank)).toEqual(
        sortedKeys(esMessages.PruebasPortal.questionsBank),
      )
      expect(sortedKeys(portal.questionsBank.kind)).toEqual(
        sortedKeys(esMessages.PruebasPortal.questionsBank.kind),
      )
      expect(sortedKeys(portal.questionsBank.validation)).toEqual(
        sortedKeys(esMessages.PruebasPortal.questionsBank.validation),
      )

      const metadata = messages.Metadata as typeof esMessages.Metadata
      expect(sortedKeys(metadata.pruebasPortal)).toEqual(
        sortedKeys(esMessages.Metadata.pruebasPortal),
      )

      const selection = messages.PortalSelection as typeof esMessages.PortalSelection
      expect(selection).toHaveProperty("pruebasName")
      expect(selection).toHaveProperty("pruebasDesc")
      expect(selection).toHaveProperty("pruebasAria")

      const topbar = messages.Topbar as typeof esMessages.Topbar
      expect(topbar).toHaveProperty("portalPruebas")

      const sidebar = messages.Sidebar as typeof esMessages.Sidebar
      expect(sidebar).toHaveProperty("ariaPruebas")
      expect(sidebar).toHaveProperty("menuPruebas")
    }
  })
})
