import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"
import {
  VACANCY_STATUS_TRANSLATION_KEYS,
  getVacancyStatusLabel,
} from "@/lib/vacancies/vacancy-status-labels"
import { mapVacancyFromApi } from "@/lib/vacancies/map-vacancy-list-item"

/**
 * Etapa 10 — Mappers controlados de estados/labels.
 *
 * Solo se migran códigos/enums/booleanos controlados por frontend. Si llega un
 * valor desconocido o texto libre/configurado por backend, se muestra el valor
 * crudo. NO se traduce data dinámica/IA/backend.
 */

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

// --- getVacancyStatusLabel (mapper unitario) -------------------------------

describe("getVacancyStatusLabel (Etapa 10)", () => {
  const translate =
    (locale: Locale) =>
    (key: string): string => {
      const vacancies = (
        messagesByLocale[locale].RecruiterPortal as Record<
          string,
          Record<string, Record<string, string>>
        >
      ).vacancies
      const [group, leaf] = key.split(".")
      return vacancies[group][leaf]
    }

  it("traduce códigos de estado conocidos en español", () => {
    const t = translate("es")
    expect(getVacancyStatusLabel("activa", t)).toBe("Activa")
    expect(getVacancyStatusLabel("cerrada", t)).toBe("Cerrada")
    expect(getVacancyStatusLabel("pausada", t)).toBe("Pausada")
    expect(getVacancyStatusLabel("borrador", t)).toBe("Borrador")
  })

  it("traduce códigos de estado conocidos en inglés", () => {
    const t = translate("en")
    expect(getVacancyStatusLabel("activa", t)).toBe("Active")
    expect(getVacancyStatusLabel("cerrada", t)).toBe("Closed")
    expect(getVacancyStatusLabel("pausada", t)).toBe("Paused")
    expect(getVacancyStatusLabel("borrador", t)).toBe("Draft")
  })

  it("devuelve el valor crudo para un código desconocido (sin traducir)", () => {
    const t = vi.fn(() => "NO_DEBERIA_LLAMARSE")
    expect(getVacancyStatusLabel("CUSTOM_STATUS_FROM_BACKEND", t)).toBe(
      "CUSTOM_STATUS_FROM_BACKEND",
    )
    expect(t).not.toHaveBeenCalled()
  })

  it("devuelve cadena vacía para null/undefined", () => {
    const t = vi.fn(() => "x")
    expect(getVacancyStatusLabel(null, t)).toBe("")
    expect(getVacancyStatusLabel(undefined, t)).toBe("")
  })
})

// --- VacancyListCard: estado traducido + data dinámica intacta -------------

vi.mock("@/components/rrhh/RematchButton", () => ({
  default: () => null,
}))

import { VacancyListCard } from "@/components/rrhh/VacancyListCard"

describe("VacancyListCard estado de vacante i18n (Etapa 10)", () => {
  const pausedVacancy = mapVacancyFromApi({
    id: "vac-1",
    title: "Senior React Engineer",
    company: "Acme",
    status: "paused",
  })

  it("traduce el estado controlado en español", () => {
    renderWithIntl(
      <VacancyListCard vacancy={pausedVacancy} onRefresh={() => {}} onSnackbar={() => {}} />,
      "es",
    )
    expect(screen.getByText("Pausada")).toBeInTheDocument()
    // Data dinámica intacta (no traducida).
    expect(screen.getByText("Senior React Engineer")).toBeInTheDocument()
  })

  it("traduce el estado controlado en inglés", () => {
    renderWithIntl(
      <VacancyListCard vacancy={pausedVacancy} onRefresh={() => {}} onSnackbar={() => {}} />,
      "en",
    )
    expect(screen.getByText("Paused")).toBeInTheDocument()
  })

  it("muestra el valor crudo si el estado no es un código controlado", () => {
    const unknownStatus = {
      ...pausedVacancy,
      status: "CUSTOM_STATUS_FROM_BACKEND" as never,
    }
    renderWithIntl(
      <VacancyListCard vacancy={unknownStatus} onRefresh={() => {}} onSnackbar={() => {}} />,
      "es",
    )
    expect(screen.getByText("CUSTOM_STATUS_FROM_BACKEND")).toBeInTheDocument()
  })
})

// --- Paridad de keys de los namespaces migrados ----------------------------

describe("namespaces de estados/labels parity (Etapa 10)", () => {
  it("expone vacancies.statuses con las mismas keys en los 5 idiomas", () => {
    for (const locale of locales) {
      const statuses = (
        (messagesByLocale[locale].RecruiterPortal as Record<string, unknown>)
          .vacancies as Record<string, Record<string, unknown>>
      ).statuses
      expect(Object.keys(statuses).sort(), `statuses en ${locale}.json`).toEqual([
        "active",
        "closed",
        "draft",
        "paused",
      ])
    }
  })

  it("expone candidates.noName / hired / notHired en los 5 idiomas", () => {
    for (const locale of locales) {
      const candidates = (
        messagesByLocale[locale].RecruiterPortal as Record<string, unknown>
      ).candidates as Record<string, unknown>
      expect(candidates, `noName en ${locale}.json`).toHaveProperty("noName")
      expect(candidates, `hired en ${locale}.json`).toHaveProperty("hired")
      expect(candidates, `notHired en ${locale}.json`).toHaveProperty("notHired")
    }
  })

  it("las translation keys del mapper apuntan al grupo statuses", () => {
    expect(Object.values(VACANCY_STATUS_TRANSLATION_KEYS)).toEqual([
      "statuses.active",
      "statuses.closed",
      "statuses.paused",
      "statuses.draft",
    ])
  })
})
