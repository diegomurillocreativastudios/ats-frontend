import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PublicVacancyLoggedInApplyConfirm } from "@/components/public/PublicVacancyLoggedInApplyConfirm"
import esMessages from "@/messages/es.json"

const postFormData = vi.fn()
const downloadCv = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    postFormData: (...args: unknown[]) => postFormData(...args),
  },
  resolveBffUrl: (path: string) => path,
}))

vi.mock("@/lib/candidate-profile-cv", () => ({
  downloadCandidateProfileCvAsFile: (...args: unknown[]) => downloadCv(...args),
}))

vi.mock("@/components/candidato/consent-authorization-modal", () => ({
  ConsentAuthorizationModal: ({
    isOpen,
    onAccept,
  }: {
    isOpen: boolean
    onAccept: (payload: Record<string, unknown>) => void
  }) =>
    isOpen ? (
      <button
        type="button"
        onClick={() =>
          onAccept({
            documentVersion: "v1",
            documentLocale: "es",
            firstNames: "Ana",
            lastNames: "López",
            signature: "Ana López",
            identityDocument: "01234567-8",
            phoneCountryIso2: "SV",
            phoneNationalNumber: "77778888",
            clientDeclaredDate: "2026-09-27",
            sectionsAccepted: {
              profileUse: true,
              personalData: true,
              confidentiality: true,
              communications: true,
              nonExclusivity: true,
              electronicSignature: true,
              acceptance: true,
            },
          })
        }
      >
        mock-accept-consent
      </button>
    ) : null,
}))

const profile = {
  id: "cand-1",
  firstName: "Ana",
  lastName: "López",
  headline: "",
  summary: "",
  resumeMarkdown: "",
  nationalId: "01234567-8",
  identityDocumentTypeId: "11111111-1111-1111-1111-111111111111",
  email: "ana@example.com",
  phoneNumber: "77778888",
  hasCvFile: true,
}

describe("PublicVacancyLoggedInApplyConfirm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    downloadCv.mockResolvedValue(
      new File(["%PDF"], "cv.pdf", { type: "application/pdf" })
    )
    postFormData.mockResolvedValue("ok")
  })

  it("con consentimiento vigente postula sin modal ni authConsent", async () => {
    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <PublicVacancyLoggedInApplyConfirm
          vacancyId="vac-1"
          profile={profile}
          hasCurrentConsent
          onEditDetails={vi.fn()}
        />
      </NextIntlClientProvider>
    )

    fireEvent.click(
      screen.getByRole("button", {
        name: esMessages.PublicOpportunities.apply.loggedIn.cta,
      })
    )

    await waitFor(() => expect(postFormData).toHaveBeenCalled())
    expect(screen.queryByRole("button", { name: "mock-accept-consent" })).toBeNull()
    expect(downloadCv).toHaveBeenCalled()
    const formData = postFormData.mock.calls[0]?.[1] as FormData
    expect(formData.get("authConsent")).toBeNull()
    expect(JSON.parse(String(formData.get("candidate")))).toMatchObject({
      firstName: "Ana",
      email: "ana@example.com",
      nationalId: "01234567-8",
      documentTypeId: "11111111-1111-1111-1111-111111111111",
    })
  })

  it("sin consentimiento vigente abre modal y envía authConsent", async () => {
    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <PublicVacancyLoggedInApplyConfirm
          vacancyId="vac-1"
          profile={profile}
          hasCurrentConsent={false}
          onEditDetails={vi.fn()}
        />
      </NextIntlClientProvider>
    )

    fireEvent.click(
      screen.getByRole("button", {
        name: esMessages.PublicOpportunities.apply.loggedIn.cta,
      })
    )
    fireEvent.click(await screen.findByRole("button", { name: "mock-accept-consent" }))

    await waitFor(() => expect(postFormData).toHaveBeenCalled())
    expect(downloadCv).toHaveBeenCalled()
    const formData = postFormData.mock.calls[0]?.[1] as FormData
    expect(formData.get("authConsent")).toBeTruthy()
  })

  it("reabre el modal si el API responde AUTH_CONSENT_REQUIRED", async () => {
    postFormData.mockRejectedValueOnce({
      status: 400,
      body: { code: "AUTH_CONSENT_REQUIRED", message: "Consent required." },
    })

    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <PublicVacancyLoggedInApplyConfirm
          vacancyId="vac-1"
          profile={profile}
          hasCurrentConsent
          onEditDetails={vi.fn()}
        />
      </NextIntlClientProvider>
    )

    fireEvent.click(
      screen.getByRole("button", {
        name: esMessages.PublicOpportunities.apply.loggedIn.cta,
      })
    )

    expect(
      await screen.findByText(
        esMessages.PublicOpportunities.applicationForm.validation.consentRequired
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "mock-accept-consent" })
    ).toBeInTheDocument()
  })
})
