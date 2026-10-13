import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasSidebar } from "@/components/pruebas/layout/pruebas-sidebar"
import { PRUEBAS_NAV_LINKS } from "@/lib/pruebas/portal-nav"
import esMessages from "@/messages/es.json"

const { useCurrentUserMock, usePathnameMock } = vi.hoisted(() => ({
  useCurrentUserMock: vi.fn(() => ({
    user: { name: "recruiter", email: "rrhh@example.com", role: "recruiter" },
    loading: false,
  })),
  usePathnameMock: vi.fn(() => "/portal-pruebas"),
}))

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: useCurrentUserMock,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: usePathnameMock,
}))

function renderSidebar() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <PruebasSidebar />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  useCurrentUserMock.mockClear()
  usePathnameMock.mockReturnValue("/portal-pruebas")
})

describe("PruebasSidebar", () => {
  it("muestra los nueve enlaces del portal agrupados", () => {
    renderSidebar()

    const menu = screen.getByRole("navigation", { name: "Menú pruebas" })
    expect(within(menu).getByRole("group", { name: "Inicio" })).toBeInTheDocument()
    expect(within(menu).getByRole("group", { name: "Contenido" })).toBeInTheDocument()
    expect(within(menu).getByRole("group", { name: "Operación" })).toBeInTheDocument()
    expect(within(menu).getByRole("group", { name: "Cierre" })).toBeInTheDocument()

    for (const link of PRUEBAS_NAV_LINKS) {
      const label = esMessages.PruebasPortal.nav[link.navKey]
      expect(within(menu).getByRole("link", { name: label })).toHaveAttribute(
        "href",
        link.href,
      )
    }
  })

  it("marca Dashboard activo solo en la ruta exacta del portal", () => {
    renderSidebar()

    const menu = screen.getByRole("navigation", { name: "Menú pruebas" })
    expect(
      within(menu).getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("aria-current", "page")
    expect(
      within(menu).getByRole("link", { name: "Evaluaciones" }),
    ).not.toHaveAttribute("aria-current")
  })

  it("marca Evaluaciones activa en su ruta", () => {
    usePathnameMock.mockReturnValue("/portal-pruebas/evaluaciones")
    renderSidebar()

    const menu = screen.getByRole("navigation", { name: "Menú pruebas" })
    expect(
      within(menu).getByRole("link", { name: "Evaluaciones" }),
    ).toHaveAttribute("aria-current", "page")
    expect(
      within(menu).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current")
  })
})
