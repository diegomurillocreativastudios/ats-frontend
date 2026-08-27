import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PublicVacancyApplyPage } from "@/components/public/PublicVacancyApplyPage"
import esMessages from "@/messages/es.json"

const { getPublicVacancyDetailMock } = vi.hoisted(() => ({
  getPublicVacancyDetailMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/portal-oportunidades/vac-1/aplicar",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ user: null, loading: false }),
}))

vi.mock("@/lib/api/public-vacancies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/public-vacancies")>()
  return {
    ...actual,
    getPublicVacancyDetail: getPublicVacancyDetailMock,
  }
})

vi.mock("@/components/shared/VacancyLocationLabel", () => ({
  VacancyLocationLabel: () => <span>El Salvador, San Salvador</span>,
}))

vi.mock("@/components/public/ApplyPrivacyNoticeDialog", () => ({
  ApplyPrivacyNoticeDialog: () => null,
}))

vi.mock("@/components/public/PublicVacancyApplicationForm", () => ({
  PublicVacancyApplicationForm: () => <div>formulario de postulación</div>,
}))

function renderApply() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <PublicVacancyApplyPage vacancyId="vac-1" />
    </NextIntlClientProvider>
  )
}

describe("PublicVacancyApplyPage", () => {
  beforeEach(() => {
    getPublicVacancyDetailMock.mockReset()
    getPublicVacancyDetailMock.mockResolvedValue({
      id: "vac-1",
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
})
