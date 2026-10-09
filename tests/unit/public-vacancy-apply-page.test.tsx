import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PublicVacancyApplyPage } from "@/components/public/PublicVacancyApplyPage"
import esMessages from "@/messages/es.json"

const {
  getPublicVacancyByPathSegmentMock,
  routerMock,
  useCurrentUserMock,
  apiGetMock,
  fetchApplicationByVacancyMock,
} = vi.hoisted(() => ({
  getPublicVacancyByPathSegmentMock: vi.fn(),
  routerMock: { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() },
  useCurrentUserMock: vi.fn(),
  apiGetMock: vi.fn(),
  fetchApplicationByVacancyMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/portal-oportunidades/vac-1/aplicar",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => useCurrentUserMock(),
}))

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
  resolveBffUrl: (path: string) => path,
}))

vi.mock("@/lib/api/public-vacancies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/public-vacancies")>()
  return {
    ...actual,
    getPublicVacancyByPathSegment: getPublicVacancyByPathSegmentMock,
  }
})

vi.mock("@/lib/candidate-application-by-vacancy", () => ({
  fetchCandidateApplicationByVacancy: (...args: unknown[]) =>
    fetchApplicationByVacancyMock(...args),
}))

vi.mock("@/components/shared/VacancyLocationLabel", () => ({
  VacancyLocationLabel: () => <span>El Salvador, San Salvador</span>,
}))

vi.mock("@/components/public/ApplyPrivacyNoticeDialog", () => ({
  ApplyPrivacyNoticeDialog: () => null,
}))

vi.mock("@/components/public/PublicVacancyApplicationForm", () => ({
  PublicVacancyApplicationForm: ({
    isEmailLocked,
  }: {
    isEmailLocked?: boolean
  }) => (
    <div>
      formulario de postulación
      {isEmailLocked ? <span>email-locked</span> : null}
    </div>
  ),
}))

vi.mock("@/components/public/PublicVacancyLoggedInApplyConfirm", () => ({
  PublicVacancyLoggedInApplyConfirm: ({
    onEditDetails,
  }: {
    onEditDetails: () => void
  }) => (
    <div>
      confirmación logueada
      <button type="button" onClick={onEditDetails}>
        editar datos mock
      </button>
    </div>
  ),
}))

function renderApply() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <PublicVacancyApplyPage vacancyId="vac-1" />
    </NextIntlClientProvider>
  )
}

const readyProfile = {
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
  authAndConsentVerification: true,
}

describe("PublicVacancyApplyPage", () => {
  beforeEach(() => {
    getPublicVacancyByPathSegmentMock.mockReset()
    apiGetMock.mockReset()
    fetchApplicationByVacancyMock.mockReset()
    fetchApplicationByVacancyMock.mockResolvedValue({ hasApplied: false })
    useCurrentUserMock.mockReturnValue({ user: null, loading: false })
    getPublicVacancyByPathSegmentMock.mockResolvedValue({
      id: "vac-1",
      publicSlug: null,
      title: "Ejecutivo de negocios y créditos",
      company: {
        id: "c1",
        name: "Creativa",
        hasLogo: true,
        logo: { contentType: "image/png", base64: "dGVzdA==" },
      },
      countryCode: "SV",
      stateCode: "SS",
      department: { id: "dep-1", code: "career", displayName: "Estrategia de carrera" },
      modality: { id: "mod-1", code: "onsite", displayName: "Presencial" },
      dataProtectionLaws: [],
    })
  })

  it("muestra el resumen de la vacante junto al formulario, sin cáscara de tarjeta", async () => {
    renderApply()

    expect(
      await screen.findByRole("heading", {
        name: "Ejecutivo de negocios y créditos",
      })
    ).toBeInTheDocument()
    expect(screen.getByText("formulario de postulación")).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Enviá tu postulación" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        "Completá los datos y adjuntá tu CV. La información se envía de forma segura al equipo de reclutamiento."
      )
    ).not.toBeInTheDocument()
    expect(screen.getByText("Creativa")).toBeInTheDocument()
    expect(screen.getByText("Creativa").closest("div")?.className).toContain(
      "grid-cols-[1rem_minmax(0,1fr)]"
    )
    expect(screen.getByText("Estrategia de carrera")).toBeInTheDocument()
    expect(screen.getByText("Presencial")).toBeInTheDocument()
    expect(screen.getByText("Tené tu CV en PDF listo para adjuntar.")).toBeInTheDocument()
    const applyRail = screen.getByRole("complementary", {
      name: "Postularme",
    })
    expect(applyRail).toBeInTheDocument()
    expect(applyRail.querySelector('img[src^="data:"]')).toBeNull()
    expect(applyRail.querySelector(".lucide-building")).not.toBeNull()
    expect(
      applyRail.querySelector("#apply-vacancy-title")
    ).toBeNull()
    const formSection = screen.getByRole("region", {
      name: "Ejecutivo de negocios y créditos",
    })
    expect(
      formSection.querySelector("#apply-vacancy-title")
    ).not.toBeNull()
    expect(formSection.querySelector("#apply-vacancy-title")?.className).toContain(
      "font-display"
    )
    const illustration = document.querySelector(
      'img[src="/ilustrations/undraw_contract-signed_vutk.svg"]'
    )
    expect(illustration).not.toBeNull()
    expect(illustration).toHaveAttribute("alt", "")
    expect(applyRail.contains(illustration)).toBe(true)
    const tipTitle = within(applyRail).getByText("Consejo para tu postulación")
    expect(tipTitle).toBeInTheDocument()
    expect(
      screen.getByText("Tené tu CV en PDF listo para adjuntar.").compareDocumentPosition(
        tipTitle
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(formSection.contains(tipTitle)).toBe(false)

    const directoryShell = document.querySelector("main .mx-auto")
    expect(directoryShell?.className).toContain("max-w-[1400px]")
  })

  it("muestra vacante no encontrada y oculta el formulario si la vacante no está publicada", async () => {
    getPublicVacancyByPathSegmentMock.mockResolvedValueOnce(null)

    renderApply()

    const copy = esMessages.PublicOpportunities.unavailable
    expect(
      await screen.findByRole("heading", { level: 1, name: copy.title })
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: copy.cta })).toHaveAttribute(
      "href",
      "/portal-oportunidades"
    )
    expect(
      document.querySelector('img[src="/ilustrations/undraw_searching_pqji.svg"]')
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: esMessages.PublicOpportunities.apply.backToDetail })
    ).not.toBeInTheDocument()
    expect(screen.queryByText("formulario de postulación")).not.toBeInTheDocument()
  })

  it("muestra confirmación rápida para candidato logueado con perfil completo", async () => {
    useCurrentUserMock.mockReturnValue({
      user: {
        id: "u1",
        name: "Ana",
        email: "ana@example.com",
        role: "candidate",
        hasPhoto: false,
      },
      loading: false,
    })
    apiGetMock.mockResolvedValue(readyProfile)

    renderApply()

    await waitFor(() => {
      expect(fetchApplicationByVacancyMock).toHaveBeenCalledWith("vac-1")
    })
    await waitFor(() => {
      expect(screen.getByText("confirmación logueada")).toBeInTheDocument()
    })
    expect(screen.queryByText("formulario de postulación")).not.toBeInTheDocument()
    expect(
      screen.getByText(
        esMessages.PublicOpportunities.apply.loggedIn.checklistProfile
      )
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "editar datos mock" }))
    expect(await screen.findByText("formulario de postulación")).toBeInTheDocument()
    expect(screen.getByText("email-locked")).toBeInTheDocument()
  })

  it("usa formulario con prefill cuando el candidato no tiene CV guardado", async () => {
    useCurrentUserMock.mockReturnValue({
      user: {
        id: "u1",
        name: "Ana",
        email: "ana@example.com",
        role: "candidate",
        hasPhoto: false,
      },
      loading: false,
    })
    apiGetMock.mockResolvedValue({ ...readyProfile, hasCvFile: false })

    renderApply()

    await waitFor(() => {
      expect(fetchApplicationByVacancyMock).toHaveBeenCalledWith("vac-1")
    })
    await waitFor(() => {
      expect(screen.getByText("formulario de postulación")).toBeInTheDocument()
    })
    expect(screen.getByText("email-locked")).toBeInTheDocument()
    expect(screen.queryByText("confirmación logueada")).not.toBeInTheDocument()
  })

  it("bloquea el CTA cuando el candidato ya postuló a la vacante", async () => {
    useCurrentUserMock.mockReturnValue({
      user: {
        id: "u1",
        name: "Ana",
        email: "ana@example.com",
        role: "candidate",
        hasPhoto: false,
      },
      loading: false,
    })
    apiGetMock.mockResolvedValue(readyProfile)
    fetchApplicationByVacancyMock.mockResolvedValue({
      hasApplied: true,
      applicationId: "app-1",
    })

    renderApply()

    expect(
      await screen.findByRole("heading", {
        name: esMessages.PublicOpportunities.apply.alreadyApplied.title,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", {
        name: esMessages.PublicOpportunities.apply.alreadyApplied.cta,
      })
    ).toHaveAttribute("href", "/portal-candidato")
    expect(screen.queryByText("confirmación logueada")).not.toBeInTheDocument()
    expect(screen.queryByText("formulario de postulación")).not.toBeInTheDocument()
  })
})
