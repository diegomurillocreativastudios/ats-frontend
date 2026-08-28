import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PublicOpportunitiesNavbar } from "@/components/public/PublicOpportunitiesNavbar"
import { PublicVacanciesExplorer } from "@/components/public/PublicVacanciesExplorer"
import { PublicVacanciesPage } from "@/components/public/PublicVacanciesPage"
import esMessages from "@/messages/es.json"

const { listPublicVacanciesMock, useCurrentUserMock } = vi.hoisted(() => ({
  listPublicVacanciesMock: vi.fn(),
  useCurrentUserMock: vi.fn(() => ({ user: null, loading: false })),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/portal-oportunidades",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: useCurrentUserMock,
}))

vi.mock("@/lib/api/public-vacancies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/public-vacancies")>()
  return {
    ...actual,
    listPublicVacancies: listPublicVacanciesMock,
    buildOpportunityCompanyLogoDataUri: () => null,
  }
})

vi.mock("@/components/shared/VacancyLocationLabel", () => ({
  VacancyLocationLabel: ({ emptyLabel }: { emptyLabel?: string }) => (
    <span>{emptyLabel ?? "Ubicación"}</span>
  ),
}))

const listResponse = {
  items: [
    {
      id: "vac-1",
      title: "Ejecutivo de negocios y créditos",
      company: { id: "c1", name: "Creativa", hasLogo: false, logo: null },
      countryCode: "SV",
      countryLabel: "El Salvador",
      department: { id: "dep-1", code: "sales", displayName: "Ventas" },
      modality: { id: "mod-1", code: "onsite", displayName: "Presencial" },
    },
    {
      id: "vac-2",
      title: "Piloto titular de Fórmula 1",
      company: { id: "c2", name: "Mercedes Benz", hasLogo: false, logo: null },
      countryCode: "DE",
      countryLabel: "Alemania",
      department: {
        id: "dep-2",
        code: "strategy",
        displayName: "Estrategia de carrera",
      },
      modality: { id: "mod-1", code: "onsite", displayName: "Presencial" },
    },
  ],
  availableFilters: {
    departments: [
      { id: "dep-1", code: "sales", displayName: "Ventas" },
      { id: "dep-2", code: "strategy", displayName: "Estrategia de carrera" },
    ],
    modalities: [{ id: "mod-1", code: "onsite", displayName: "Presencial" }],
    countries: [],
  },
  pagination: {
    page: 1,
    pageSize: 10,
    totalCount: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
}

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe("portal de oportunidades UI", () => {
  beforeEach(() => {
    listPublicVacanciesMock.mockReset()
    listPublicVacanciesMock.mockResolvedValue(listResponse)
    useCurrentUserMock.mockReturnValue({ user: null, loading: false })
  })

  it("alinea el navbar al mismo ancho máximo que el contenido", () => {
    renderWithIntl(<PublicOpportunitiesNavbar />)

    const nav = screen.getByRole("navigation", {
      name: "Navegación principal de oportunidades",
    })
    expect(nav.querySelector(".mx-auto")?.className).toContain("max-w-[1400px]")
    expect(screen.queryByText("Portal de oportunidades")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ir al portal de oportunidades" })).toBeInTheDocument()
  })

  it("compacta el hero y deja los filtros visibles en el listado", async () => {
    renderWithIntl(<PublicVacanciesPage />)

    const heroTitle = screen.getByRole("heading", {
      name: "En nuestro Portal de Oportunidades encontrarás el siguiente capítulo de tu carrera",
    })
    expect(heroTitle).toBeInTheDocument()
    const portalName = heroTitle.querySelector("strong")
    expect(portalName).toHaveTextContent("Portal de Oportunidades")
    expect(portalName?.className).toContain("whitespace-nowrap")
    expect(portalName?.className).toContain("font-serif")
    expect(portalName?.className).toContain("font-bold")
    expect(portalName?.className).toContain("italic")
    expect(portalName?.className).toContain("text-ats-cobre")
    expect(
      screen.getByText(
        "Tu próximo rol ya está acá. Explorá las vacantes abiertas y encontrá el que te hace dar el salto."
      )
    ).toBeInTheDocument()
    expect(screen.queryByText("Exploración pública")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Explorar oportunidades" })
    ).not.toBeInTheDocument()

    const heroIllustration = screen.getByTestId(
      "public-opportunities-hero-illustration"
    )
    expect(heroIllustration.querySelector(".vacancy-float-a")).not.toBeNull()
    expect(heroIllustration.querySelector(".vacancy-float-b")).not.toBeNull()
    expect(heroIllustration.querySelector(".vacancy-float-c")).not.toBeNull()
    expect(heroIllustration.innerHTML).toContain("prefers-reduced-motion")

    expect(await screen.findByLabelText("Buscar vacantes")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Filtros" })).toBeInTheDocument()
    expect(screen.getByRole("complementary", { name: "Filtros" })).toBeInTheDocument()
    expect(screen.getByLabelText("Departamento")).toBeInTheDocument()
    expect(screen.getByLabelText("Modalidad")).toBeInTheDocument()
    expect(screen.getByLabelText("País")).toBeInTheDocument()
    expect(screen.getByText("2 oportunidades.")).toBeInTheDocument()
    const directoryShell = document.querySelector("#public-opportunities-top main .mx-auto")
    expect(directoryShell?.className).toContain("max-w-[1400px]")
  })

  it("deja el navbar fijo y mueve el scroll al contenido", async () => {
    renderWithIntl(<PublicVacanciesPage />)

    const nav = screen.getByRole("navigation", {
      name: "Navegación principal de oportunidades",
    })
    const main = screen.getByRole("main")
    const shell = document.getElementById("public-opportunities-top")

    expect(shell?.className).toContain("h-dvh")
    expect(shell?.className).toContain("overflow-hidden")
    expect(main.className).toContain("overflow-y-auto")
    expect(main.contains(nav)).toBe(false)
    expect(shell?.contains(nav)).toBe(true)
    expect(await screen.findByLabelText("Buscar vacantes")).toBeInTheDocument()
  })

  it("hace clicable toda la fila y filtra por empresa", async () => {
    renderWithIntl(<PublicVacanciesExplorer />)

    const row = await screen.findByRole("link", {
      name: "Ver detalle de Ejecutivo de negocios y créditos",
    })
    expect(row).toHaveAttribute("href", "/portal-oportunidades/vac-1")

    fireEvent.change(screen.getByLabelText("Buscar vacantes"), {
      target: { value: "Mercedes" },
    })

    expect(
      screen.getByRole("link", {
        name: "Ver detalle de Piloto titular de Fórmula 1",
      })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("link", {
        name: "Ver detalle de Ejecutivo de negocios y créditos",
      })
    ).not.toBeInTheDocument()
  })

  it("expone las opciones de filtro del API", async () => {
    renderWithIntl(<PublicVacanciesExplorer />)

    const department = await screen.findByLabelText("Departamento")
    expect(within(department as HTMLSelectElement).getByText("Ventas")).toBeInTheDocument()
    expect(screen.getByLabelText("Modalidad")).toHaveTextContent("Presencial")
  })
})
