import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { RecruiterCandidateProfileView } from "@/components/rrhh/recruiter-candidate-profile-view"
import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

/**
 * Etapa 14 — i18n del detalle básico de candidato RRHH (sin IA).
 *
 * Verifica que la UI estática del detalle de candidato resuelve textos desde
 * `next-intl` (namespace `RecruiterPortal.candidateDetail`) en `es` y `en`, que
 * los empty states usan diccionario, que la data dinámica permanece verbatim y
 * que el namespace mantiene paridad en los 5 idiomas.
 */

const hoisted = vi.hoisted(() => ({ locale: "es" }))

vi.mock("@/components/candidato/candidate-profile-edit-field-groups", () => ({
  ProfileEditContactFields: () => null,
  ProfileEditEducationFields: () => null,
  ProfileEditHeroFields: () => null,
  ProfileEditJobPreferencesFields: () => null,
  ProfileEditLanguagesFields: () => null,
  ProfileEditLocationAndPersonalFields: () => null,
  ProfileEditNationalIdField: () => null,
  ProfileEditRecognitionsField: () => null,
  ProfileEditReferencesFields: () => null,
  ProfileEditSkillsField: () => null,
  ProfileEditSocialVideoFields: () => null,
}))

vi.mock("@/hooks/use-candidate-profile-editor", () => ({
  useCandidateProfileEditor: () => ({
    form: {},
    setForm: vi.fn(),
    patch: vi.fn(),
    isEditing: false,
    validationError: null,
    handleOpenEdit: vi.fn(),
    handleCancelEdit: vi.fn(),
    handleSubmit: vi.fn(),
  }),
}))

vi.mock("@/components/candidato/candidate-salary-expectation-card", () => ({
  CandidateSalaryExpectationCard: () => null,
}))

vi.mock("@/lib/auth", () => ({
  getAccessToken: () => null,
  getCurrentUser: () => null,
  AUTH_COOKIES: {
    access: "ats_access_token",
    refresh: "ats_refresh_token",
    expires: "ats_token_expires",
    user: "ats_user",
    csrf: "ats_csrf",
    path: "/",
  },
}))

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

vi.mock("@/components/rrhh/RRHHSidebar", () => ({
  default: () => null,
}))

vi.mock("@/components/rrhh/RRHHTopbar", () => ({
  default: () => null,
}))

vi.mock("@/components/ui/Snackbar", () => ({
  default: () => null,
}))

const profileFixture = {
  id: "cand-42",
  normalizedData: {
    FirstName: "María",
    LastName: "García",
    Email: "maria@empresa.com",
    WorkExperience: [],
    Education: [],
    References: [],
    Recognitions: [],
  },
  normalizedDataRaw: null,
  normalizedDataParseFailed: false,
}

const canonicalFixture = {
  firstName: "María",
  lastName: "García",
  email: "maria@empresa.com",
  headline: "Senior React Developer",
  summary: "Resumen dinámico del candidato desde API.",
  country: "El Salvador",
}

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
      <RecruiterCandidateProfileView
        candidateId="cand-42"
        profile={profileFixture}
        canonicalProfile={canonicalFixture as never}
        onSaveProfile={vi.fn(async () => {})}
        savingProfile={false}
        saveProfileError={null}
        clearSaveProfileError={vi.fn()}
      />
    </NextIntlClientProvider>,
  )
}

describe("RecruiterCandidateProfileView i18n (Etapa 14)", () => {
  it("renderiza UI estática en español", () => {
    renderProfileView("es")
    expect(screen.getByText("Editar perfil")).toBeInTheDocument()
    expect(screen.getByText("Contacto y personales")).toBeInTheDocument()
    expect(screen.getByText("Experiencia laboral")).toBeInTheDocument()
    expect(
      screen.getByText("Sin experiencia laboral registrada."),
    ).toBeInTheDocument()
    expect(screen.getByText("Sin educación registrada.")).toBeInTheDocument()
  })

  it("renderiza UI estática en inglés", () => {
    renderProfileView("en")
    expect(screen.getByText("Edit profile")).toBeInTheDocument()
    expect(screen.getByText("Contact and personal")).toBeInTheDocument()
    expect(screen.getByText("Work experience")).toBeInTheDocument()
    expect(screen.getByText("No work experience on record.")).toBeInTheDocument()
    expect(screen.getByText("No education on record.")).toBeInTheDocument()
  })

  it("mantiene data dinámica del candidato verbatim", () => {
    renderProfileView("es")
    expect(screen.getByText("María García")).toBeInTheDocument()
    expect(screen.getByText("Senior React Developer")).toBeInTheDocument()
    expect(
      screen.getByText("Resumen dinámico del candidato desde API."),
    ).toBeInTheDocument()
    expect(screen.getAllByText("maria@empresa.com").length).toBeGreaterThan(0)
    expect(screen.getAllByText("El Salvador").length).toBeGreaterThan(0)
  })
})

describe("RecruiterPortal.candidateDetail namespace parity (Etapa 14)", () => {
  it("expone candidateDetail en los 5 idiomas", () => {
    for (const locale of locales) {
      const ns = messagesByLocale[locale].RecruiterPortal as Record<string, unknown>
      expect(
        Object.keys(ns),
        `candidateDetail ausente en ${locale}.json`,
      ).toContain("candidateDetail")
    }
  })

  it("expone Metadata.recruiterCandidateDetail en los 5 idiomas", () => {
    for (const locale of locales) {
      const metadata = messagesByLocale[locale].Metadata as Record<string, unknown>
      expect(
        Object.keys(metadata),
        `recruiterCandidateDetail ausente en ${locale}.json`,
      ).toContain("recruiterCandidateDetail")
    }
  })
})
