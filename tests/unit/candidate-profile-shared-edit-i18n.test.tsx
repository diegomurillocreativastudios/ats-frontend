import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { CandidateSelfProfileView } from "@/components/candidato/candidate-self-profile-view"
import { RecruiterCandidateProfileView } from "@/components/rrhh/recruiter-candidate-profile-view"
import { ProfileEditHeroFields } from "@/components/candidato/candidate-profile-edit-field-groups"
import {
  CandidateProfileSectionsProvider,
  JobPreferencesBlock,
} from "@/components/rrhh/CandidateProfileSections"
import {
  useCandidateProfileEditor,
  type CandidateProfileEditorMessages,
} from "@/hooks/use-candidate-profile-editor"
import { locales, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"
import deMessages from "@/messages/de.json"
import frMessages from "@/messages/fr.json"

/**
 * Etapa 15 — Perfil candidato compartido: edición segura y provider en Portal Candidato.
 */

const messagesByLocale: Record<Locale, Record<string, unknown>> = {
  es: esMessages,
  en: enMessages,
  it: itMessages,
  de: deMessages,
  fr: frMessages,
}

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
  resumeMarkdown: "CV markdown existente",
  nationalId: "12345678-9",
}


describe("CandidateSelfProfileView provider (Etapa 15)", () => {
  it("renderiza empty states traducidos vía CandidateProfileSectionsProvider", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messagesByLocale.en}>
        <CandidateSelfProfileView
          candidateProfile={{
            firstName: "Test",
            lastName: "User",
            headline: "Dev",
            summary: "Summary",
            nationalId: "1",
            resumeMarkdown: "cv",
            workExperience: [],
            education: [],
          } as never}
          selfProfile={{ userName: "Test User", email: "test@test.com" } as never}
          profileNotFound={false}
          onSaveProfile={vi.fn(async () => {})}
          savingProfile={false}
          saveProfileError={null}
          clearSaveProfileError={vi.fn()}
        />
      </NextIntlClientProvider>,
    )
    expect(screen.getByText("No work experience on record.")).toBeInTheDocument()
    expect(screen.getByText("No education on record.")).toBeInTheDocument()
  })

  it("mantiene data dinámica verbatim en español", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messagesByLocale.es}>
        <CandidateSelfProfileView
          candidateProfile={{
            ...canonicalFixture,
            firstName: "Ana",
            lastName: "López",
          } as never}
          selfProfile={{ userName: "Ana López", email: "ana@test.com" } as never}
          profileNotFound={false}
          onSaveProfile={vi.fn(async () => {})}
          savingProfile={false}
          saveProfileError={null}
          clearSaveProfileError={vi.fn()}
        />
      </NextIntlClientProvider>,
    )
    expect(screen.getAllByText("Ana López").length).toBeGreaterThan(0)
    expect(screen.getByText("Senior React Developer")).toBeInTheDocument()
  })
})

describe("ProfileEditHeroFields namespace (Etapa 15)", () => {
  const baseForm = {
    firstName: "",
    lastName: "",
    headline: "",
    summary: "",
    nationalId: "",
    birthDateInput: "",
    resumeMarkdown: "",
    email: "",
    phoneNumber: "",
    country: "",
    birthCity: "",
    maritalStatus: "",
    gender: "",
    minSalary: "",
    availability: "",
    hasDisabilityChoice: "" as const,
    videoLink: "",
    sectors: [],
    jobDesiredRole: "",
    jobMinSalary: "",
    jobEducationLevel: "",
    jobDesiredCity: "",
    jobAvailability: "",
    jobDisability: "" as const,
    workRows: [],
    educationRows: [],
    languageRows: [],
    skillsText: "",
    socialRows: [],
    referenceRows: [],
    recognitionsText: "",
  }

  it("usa CandidatePortal.profile en Portal Candidato", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messagesByLocale.en}>
        <CandidateProfileSectionsProvider namespace="CandidatePortal.profile">
          <ProfileEditHeroFields form={baseForm} patch={vi.fn()} saving={false} />
        </CandidateProfileSectionsProvider>
      </NextIntlClientProvider>,
    )
    expect(screen.getByText("Identity and summary")).toBeInTheDocument()
    expect(screen.getByLabelText(/^Headline/)).toBeInTheDocument()
  })

  it("usa RecruiterPortal.candidateDetail en RRHH", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messagesByLocale.en}>
        <CandidateProfileSectionsProvider namespace="RecruiterPortal.candidateDetail">
          <ProfileEditHeroFields form={baseForm} patch={vi.fn()} saving={false} />
        </CandidateProfileSectionsProvider>
      </NextIntlClientProvider>,
    )
    expect(screen.getByText("Identity and summary")).toBeInTheDocument()
    expect(screen.getByLabelText(/^Headline/)).toBeInTheDocument()
  })
})

describe("useCandidateProfileEditor messages (Etapa 15)", () => {
  function EditorHarness({
    messages,
    initialProfile,
  }: {
    messages?: Partial<CandidateProfileEditorMessages>
    initialProfile?: Parameters<typeof useCandidateProfileEditor>[0]["initialProfile"]
  }) {
    const { validationError, handleSubmit, triggerLabel } = useCandidateProfileEditor({
      initialProfile: initialProfile ?? null,
      enrichedNd: {},
      isCreating: !initialProfile,
      onSave: vi.fn(async () => {}),
      saving: false,
      saveError: null,
      onDismissSaveError: vi.fn(),
      messages,
    })

    return (
      <form onSubmit={(e) => void handleSubmit(e)}>
        {validationError ? <p role="status">{validationError}</p> : null}
        <button type="submit">Submit</button>
        <span data-testid="trigger">{triggerLabel}</span>
      </form>
    )
  }

  it("traduce validaciones frontend vía mensajes inyectados", () => {
    render(
      <EditorHarness
        messages={{
          requiredFields: "EN_REQUIRED",
          resumeRequired: "EN_RESUME",
          birthDate: {
            invalid: "EN_INVALID",
            futureDate: "EN_FUTURE",
            tooYoung: "EN_YOUNG",
          },
          triggerComplete: "EN_COMPLETE",
          triggerEdit: "EN_EDIT",
        }}
      />,
    )

    expect(screen.getByTestId("trigger")).toHaveTextContent("EN_COMPLETE")
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(screen.getByRole("status")).toHaveTextContent("EN_REQUIRED")
  })

  it("conserva defaults en español sin mensajes inyectados", () => {
    render(<EditorHarness />)
    expect(screen.getByTestId("trigger")).toHaveTextContent("Completar mi perfil")
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(screen.getByRole("status")).toHaveTextContent(
      "Completá titular, resumen y documento de identidad.",
    )
  })
})

describe("RecruiterPortal.candidateDetail edit namespace parity (Etapa 15)", () => {
  const expectedSubsections = ["form", "options", "socialLink"]

  it("expone form/options/socialLink en los 5 idiomas", () => {
    for (const locale of locales) {
      const detail = (
        (messagesByLocale[locale].RecruiterPortal as Record<string, unknown>)
          .candidateDetail as Record<string, unknown>
      )
      for (const subsection of expectedSubsections) {
        expect(
          Object.keys(detail),
          `${subsection} ausente en RecruiterPortal.candidateDetail de ${locale}.json`,
        ).toContain(subsection)
      }
    }
  })

  it("incluye validaciones de edición compartida en los 5 idiomas", () => {
    for (const locale of locales) {
      const validation = (
        (
          (messagesByLocale[locale].RecruiterPortal as Record<string, unknown>)
            .candidateDetail as Record<string, unknown>
        ).form as Record<string, unknown>
      ).validation as Record<string, unknown>
      expect(validation).toHaveProperty("requiredFields")
      expect(validation).toHaveProperty("resumeRequired")
      expect(validation).toHaveProperty("birthDate")
    }
  })
})

describe("RecruiterCandidateProfileView edit labels (Etapa 15)", () => {
  it("renderiza labels del formulario de edición en inglés al editar", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messagesByLocale.en}>
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

    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }))
    expect(screen.getByText("Identity and summary")).toBeInTheDocument()
    expect(screen.getAllByText("Contact").length).toBeGreaterThan(0)
  })
})

describe("JobPreferencesBlock canonical values (Etapa 15)", () => {
  it("muestra availability dinámica verbatim sin traducir el value", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messagesByLocale.en}>
        <CandidateProfileSectionsProvider namespace="CandidatePortal.profile">
          <JobPreferencesBlock
            prefs={{ availability: "Inmediata" }}
            fallbackMinSalary={null}
            fallbackAvailability={null}
            fallbackHasDisability={null}
          />
        </CandidateProfileSectionsProvider>
      </NextIntlClientProvider>,
    )
    expect(screen.getByText("Inmediata")).toBeInTheDocument()
  })
})
