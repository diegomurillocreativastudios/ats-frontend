import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { CandidateSelfProfileView } from "@/components/candidato/candidate-self-profile-view"
import {
  AVAILABILITY_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  getAvailabilityOptions,
  getGenderOptions,
  getMaritalStatusOptions,
} from "@/lib/profile-form-options"
import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

/**
 * Etapa 5D — i18n del Perfil del Candidato.
 *
 * Verifica que la vista de perfil y el formulario de edición resuelven su UI
 * estática desde `next-intl` (namespace `CandidatePortal.profile`) en `es` y
 * `en`, que las opciones de formulario migradas conservan su `value` canónico
 * y que el namespace mantiene paridad en los 5 idiomas. NO se prueba data
 * dinámica/IA ni texto libre del backend.
 */

const messagesByLocale: Record<Locale, Record<string, unknown>> = {
  es: esMessages,
  en: enMessages,
  it: itMessages,
  de: deMessages,
  fr: frMessages,
}

function renderProfileView(locale: Locale) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      <CandidateSelfProfileView
        candidateProfile={null}
        selfProfile={null}
        profileNotFound
        sessionRole="Candidato"
        onSaveProfile={vi.fn(async () => {})}
        savingProfile={false}
        saveProfileError={null}
        clearSaveProfileError={vi.fn()}
      />
    </NextIntlClientProvider>,
  )
}

describe("CandidateSelfProfileView i18n (Etapa 5D)", () => {
  it("renderiza textos estáticos de la vista en español", () => {
    renderProfileView("es")
    expect(screen.getByText("Tu ficha")).toBeInTheDocument()
    expect(screen.getByText("Guardar cambios")).toBeInTheDocument()
    expect(screen.getByText("Pretensión salarial")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Titular, resumen y documento de identidad son obligatorios al guardar.",
      ),
    ).toBeInTheDocument()
  })

  it("renderiza los mismos textos traducidos en inglés", () => {
    renderProfileView("en")
    expect(screen.getByText("Your record")).toBeInTheDocument()
    expect(screen.getByText("Save changes")).toBeInTheDocument()
    expect(screen.getByText("Salary expectation")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Headline, summary and ID document are required when saving.",
      ),
    ).toBeInTheDocument()
  })
})

describe("Formulario de edición de perfil i18n (Etapa 5D)", () => {
  it("renderiza labels y placeholders del formulario en español", () => {
    renderProfileView("es")
    expect(screen.getByText("Identidad y resumen")).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText("Escribí un sector y presioná Enter"),
    ).toBeInTheDocument()
    expect(screen.getByText("Monto mensual esperado")).toBeInTheDocument()
  })

  it("renderiza labels y placeholders del formulario en inglés", () => {
    renderProfileView("en")
    expect(screen.getByText("Identity and summary")).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText("Type a sector and press Enter"),
    ).toBeInTheDocument()
    expect(screen.getByText("Expected monthly amount")).toBeInTheDocument()
  })

  it("traduce los labels de opciones de género manteniendo el value canónico", () => {
    const { unmount } = renderProfileView("en")
    const genderSelect = document.getElementById("pf-gender") as HTMLSelectElement
    const maleOption = within(genderSelect).getByText("Male") as HTMLOptionElement
    expect(maleOption.value).toBe("Masculino")
    unmount()

    renderProfileView("es")
    const genderSelectEs = document.getElementById("pf-gender") as HTMLSelectElement
    const maleOptionEs = within(genderSelectEs).getByText("Masculino") as HTMLOptionElement
    expect(maleOptionEs.value).toBe("Masculino")
  })
})

describe("Opciones de profile-form-options (Etapa 5D)", () => {
  const identity = (key: string) => key

  it("conserva los values canónicos en español al traducir labels", () => {
    expect(getGenderOptions(identity).map((o) => o.value)).toEqual([
      "Masculino",
      "Femenino",
    ])
    expect(getMaritalStatusOptions(identity).map((o) => o.value)).toEqual([
      "Soltero/a",
      "Casado/a",
      "Unión libre",
      "Divorciado/a",
      "Viudo/a",
      "Separado/a",
    ])
    expect(getAvailabilityOptions(identity).map((o) => o.value)).toEqual([
      "Inmediata",
      "En 15 días o menos",
      "En 1 mes",
      "En 2 meses o más",
      "A convenir",
      "Según propuesta",
    ])
  })

  it("mantiene los constantes canónicos sin alterar value (compatibilidad backend)", () => {
    expect(GENDER_OPTIONS).toEqual([
      { value: "Masculino", label: "Masculino" },
      { value: "Femenino", label: "Femenino" },
    ])
    expect(MARITAL_STATUS_OPTIONS.map((o) => o.value)).toContain("Soltero/a")
    expect(AVAILABILITY_OPTIONS.map((o) => o.value)).toContain("Inmediata")
  })

  it("usa la key traducible para el label, no el value", () => {
    const labelKeys = getAvailabilityOptions((key) => `T:${key}`).map((o) => o.label)
    expect(labelKeys).toContain("T:options.availability.immediate")
  })
})

describe("Namespace CandidatePortal.profile (Etapa 5D)", () => {
  it("expone las subsecciones esperadas en los 5 idiomas", () => {
    const expectedSubsections = [
      "page",
      "session",
      "toasts",
      "nav",
      "groups",
      "actions",
      "download",
      "intro",
      "hero",
      "notFound",
      "sections",
      "fields",
      "values",
      "emptyStates",
      "form",
      "salary",
      "socialLink",
      "options",
    ]
    for (const locale of locales) {
      const profile = (
        (messagesByLocale[locale] as Record<string, unknown>)
          .CandidatePortal as Record<string, unknown>
      ).profile as Record<string, unknown>
      for (const subsection of expectedSubsections) {
        expect(
          Object.keys(profile),
          `${subsection} ausente en CandidatePortal.profile de ${locale}.json`,
        ).toContain(subsection)
      }
    }
  })

  it("conserva las opciones de formulario migradas en los 5 idiomas", () => {
    for (const locale of locales) {
      const options = (
        (
          (messagesByLocale[locale] as Record<string, unknown>)
            .CandidatePortal as Record<string, unknown>
        ).profile as Record<string, unknown>
      ).options as Record<string, unknown>
      expect(Object.keys(options)).toEqual(
        expect.arrayContaining(["gender", "maritalStatus", "availability"]),
      )
    }
  })
})
