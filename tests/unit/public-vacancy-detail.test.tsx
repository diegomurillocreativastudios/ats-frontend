import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PublicVacancyDetailPage } from "@/components/public/PublicVacancyDetailPage"
import esMessages from "@/messages/es.json"

const { getPublicVacancyDetailMock } = vi.hoisted(() => ({
  getPublicVacancyDetailMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/portal-oportunidades/vac-1",
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

function renderDetail() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <PublicVacancyDetailPage vacancyId="vac-1" />
    </NextIntlClientProvider>
  )
}

describe("PublicVacancyDetailPage", () => {
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
      description:
        "Ejecutivo de negocios y créditos\n\nObjetivo del puesto\n\nIncorporar un ejecutivo comercial-crediticio responsable de la prospección.\npara clientes de Prisma Capital.",
      details: `Perfil profesional requerido
• Experiencia ideal de 2 a 3 años en instituciones financieras.
• Experiencia comprobable en colocación de créditos.`,
      requirements: ["Licencia de conducir vigente"],
      advantages: "Seguro médico privado",
    })
  })

  it("muestra encabezado, requisitos, detalles, ventajas y el cierre para aplicar", async () => {
    renderDetail()

    expect(
      await screen.findByRole("heading", {
        name: "Ejecutivo de negocios y créditos",
      })
    ).toBeInTheDocument()
    const article = document.querySelector("article")
    expect(article).toBeTruthy()
    expect(within(article as HTMLElement).queryByText("Creativa")).not.toBeInTheDocument()
    expect(within(article as HTMLElement).queryByText("Presencial")).not.toBeInTheDocument()
    expect(
      within(article as HTMLElement).queryByText("El Salvador, San Salvador")
    ).not.toBeInTheDocument()
    const applyRail = screen.getByRole("complementary", {
      name: "¿Estás preparado para esta oportunidad?",
    })
    expect(within(applyRail).getByText("Creativa")).toBeInTheDocument()
    expect(applyRail.querySelector('img[src^="data:"]')).toBeNull()
    expect(within(applyRail).getByText("Creativa").closest("div")?.className).toContain(
      "grid-cols-[1rem_minmax(0,1fr)]"
    )
    expect(within(applyRail).getByText("El Salvador, San Salvador")).toBeInTheDocument()
    expect(within(applyRail).getByText("Estrategia de carrera")).toBeInTheDocument()
    expect(within(applyRail).getByText("Presencial")).toBeInTheDocument()
    expect(applyRail.querySelector(".lucide-building")).not.toBeNull()
    expect(screen.queryByText("No especificado")).not.toBeInTheDocument()
    expect(screen.getByText("Objetivo del puesto")).toBeInTheDocument()
    expect(screen.getByText(/Prisma Capital/)).toBeInTheDocument()
    expect(screen.getByText(/muchas más vacantes disponibles/)).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Requisitos de la vacante" })).toBeInTheDocument()
    expect(screen.getByText("Licencia de conducir vigente")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Detalles de la vacante" })).toBeInTheDocument()
    expect(screen.getByText("Perfil profesional requerido")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Ventajas de la vacante" })).toBeInTheDocument()
    expect(screen.getByText("Seguro médico privado")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "¿Estás preparado para esta oportunidad?" })
    ).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: "Postularme" }).length).toBeGreaterThan(0)
    const moreOpportunitiesLink = within(applyRail).getByRole("link", {
      name: "Ver más oportunidades",
    })
    const tipTitle = within(applyRail).getByText("Consejo para tu postulación")
    expect(tipTitle).toBeInTheDocument()
    expect(
      moreOpportunitiesLink.compareDocumentPosition(tipTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    const illustration = document.querySelector(
      'img[src="/ilustrations/undraw_document-review_lfir.svg"]'
    )
    expect(illustration).not.toBeNull()
    expect(illustration).toHaveAttribute("alt", "")
    expect(applyRail.contains(illustration)).toBe(true)
    const directoryShell = document.querySelector("main .mx-auto")
    expect(directoryShell?.className).toContain("max-w-[1400px]")

    const nav = screen.getByRole("navigation", {
      name: "Navegación principal de oportunidades",
    })
    const main = screen.getByRole("main")
    expect(main.className).toContain("overflow-y-auto")
    expect(main.contains(nav)).toBe(false)
  })
})
