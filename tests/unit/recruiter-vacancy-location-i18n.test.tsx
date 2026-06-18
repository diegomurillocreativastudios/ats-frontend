import { describe, it, expect, beforeEach, vi } from "vitest"
import { screen } from "@testing-library/react"

import { renderWithIntl } from "../helpers/render-with-intl"

import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

/**
 * Etapa 9 — cierre seguro de Vacantes RRHH.
 *
 * Cubre:
 * - `VacancyLocationFields` renderiza su UI estática (opción "Sin especificar"
 *   y mensajes de error de carga) desde los labels recibidos por props
 *   (Opción B: el componente sigue desacoplado de `next-intl`, el padre inyecta
 *   los textos traducidos). Se valida en `es` y `en`.
 * - La metadata estática de `/portal-rrhh/vacantes` se resuelve desde
 *   `next-intl` (`Metadata.recruiterVacancies`) vía `generateMetadata`.
 * - Paridad de keys de los namespaces nuevos en los 5 idiomas.
 *
 * NO se prueba data dinámica/IA, catálogos remotos (países/estados que vienen de
 * API/BD) ni texto libre del backend: solo UI estática controlada por frontend.
 */

// Catálogos remotos mockeados: forzamos el camino de error para verificar que el
// label de error proviene de las props (no de un string hardcodeado).
vi.mock("@/lib/api/locations", () => ({
  getLocationCatalogStatus: vi.fn(async () => {
    throw new Error("offline")
  }),
  fetchAllLocationCountries: vi.fn(async () => []),
  fetchAllLocationDivisions: vi.fn(async () => []),
}))

vi.mock("@countrystatecity/countries-browser", () => ({
  getCountries: vi.fn(async () => {
    throw new Error("offline")
  }),
  getStatesOfCountry: vi.fn(async () => []),
}))

import { VacancyLocationFields } from "@/components/rrhh/VacancyLocationFields"

const allMessages: Record<Locale, Record<string, unknown>> = {
  es: esMessages,
  en: enMessages,
  it: itMessages,
  de: deMessages,
  fr: frMessages,
}

const noop = () => {}

describe("VacancyLocationFields i18n por props (Etapa 9)", () => {
  it("renderiza la opción 'Sin especificar' y el error de países desde props (es)", async () => {
    renderWithIntl(
      <VacancyLocationFields
        countryCode=""
        stateCode=""
        onChange={noop}
        unspecifiedLabel="Sin especificar"
        loadCountriesErrorLabel="No se pudieron cargar los países."
        loadStatesErrorLabel="No se pudieron cargar los estados o provincias."
      />,
      { locale: "es" },
    )

    const unspecified = await screen.findAllByText("Sin especificar")
    expect(unspecified.length).toBeGreaterThan(0)
    expect(
      await screen.findByText("No se pudieron cargar los países."),
    ).toBeInTheDocument()
  })

  it("renderiza la opción 'Unspecified' y el error de países desde props (en)", async () => {
    renderWithIntl(
      <VacancyLocationFields
        countryCode=""
        stateCode=""
        onChange={noop}
        unspecifiedLabel="Unspecified"
        loadCountriesErrorLabel="Countries could not be loaded."
        loadStatesErrorLabel="States or provinces could not be loaded."
      />,
      { locale: "en" },
    )

    const unspecified = await screen.findAllByText("Unspecified")
    expect(unspecified.length).toBeGreaterThan(0)
    expect(
      await screen.findByText("Countries could not be loaded."),
    ).toBeInTheDocument()
  })

  it("usa los defaults traducidos desde next-intl si no se pasan labels", async () => {
    renderWithIntl(
      <VacancyLocationFields countryCode="" stateCode="" onChange={noop} />,
      { locale: "es" },
    )

    const unspecified = await screen.findAllByText(
      esMessages.RecruiterPortal.vacancies.location.unspecified,
    )
    expect(unspecified.length).toBeGreaterThan(0)
  })
})

// El mock de next-intl/server replica la resolución de namespaces por locale para
// poder ejecutar `generateMetadata` del layout de vacantes en aislamiento.
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
    getTranslations: async (
      arg: string | { locale?: string; namespace: string },
    ) => {
      const namespace = typeof arg === "string" ? arg : arg.namespace
      const locale = (typeof arg === "object" && arg.locale) || hoisted.locale
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

import { generateMetadata as recruiterVacanciesMetadata } from "@/app/portal-rrhh/vacantes/layout"

beforeEach(() => {
  hoisted.locale = "es"
})

describe("Metadata de vacantes RRHH (Etapa 9)", () => {
  it("genera title/description desde next-intl en es", async () => {
    hoisted.locale = "es"
    const metadata = await recruiterVacanciesMetadata()
    expect(metadata.title).toEqual({
      absolute: esMessages.Metadata.recruiterVacancies.title,
    })
    expect(metadata.description).toBe(
      esMessages.Metadata.recruiterVacancies.description,
    )
  })

  it("genera title/description desde next-intl en en", async () => {
    hoisted.locale = "en"
    const metadata = await recruiterVacanciesMetadata()
    expect(metadata.title).toEqual({
      absolute: enMessages.Metadata.recruiterVacancies.title,
    })
    expect(metadata.description).toBe(
      enMessages.Metadata.recruiterVacancies.description,
    )
  })
})

describe("Paridad de namespaces nuevos (Etapa 9)", () => {
  function collectKeys(value: unknown, prefix = ""): string[] {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return [prefix]
    }
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      collectKeys(child, prefix ? `${prefix}.${key}` : key),
    )
  }

  function getLocationNamespace(locale: Locale): Record<string, unknown> {
    const recruiterPortal = allMessages[locale].RecruiterPortal as Record<
      string,
      unknown
    >
    const vacancies = recruiterPortal.vacancies as Record<string, unknown>
    return vacancies.location as Record<string, unknown>
  }

  function getRecruiterVacanciesMetadata(
    locale: Locale,
  ): Record<string, unknown> {
    const metadata = allMessages[locale].Metadata as Record<string, unknown>
    return metadata.recruiterVacancies as Record<string, unknown>
  }

  it("define RecruiterPortal.vacancies.location en los 5 idiomas", () => {
    for (const locale of locales) {
      expect(
        getLocationNamespace(locale),
        `location ausente en ${locale}.json`,
      ).toBeTruthy()
    }
  })

  it("mantiene paridad de keys de location en los 5 idiomas", () => {
    const baseKeys = collectKeys(getLocationNamespace("es")).sort()
    for (const locale of locales) {
      const localeKeys = collectKeys(getLocationNamespace(locale)).sort()
      expect(
        localeKeys,
        `keys de location desalineadas en ${locale}.json`,
      ).toEqual(baseKeys)
    }
  })

  it("define Metadata.recruiterVacancies en los 5 idiomas", () => {
    for (const locale of locales) {
      expect(
        Object.keys(getRecruiterVacanciesMetadata(locale)).sort(),
        `recruiterVacancies desalineado en ${locale}.json`,
      ).toEqual(["description", "title"])
    }
  })
})
