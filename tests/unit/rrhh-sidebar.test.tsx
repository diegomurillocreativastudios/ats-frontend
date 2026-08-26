import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import RRHHSidebar from "@/components/rrhh/RRHHSidebar"
import esMessages from "@/messages/es.json"

const { useCurrentUserMock, usePathnameMock } = vi.hoisted(() => ({
  useCurrentUserMock: vi.fn(() => ({
    user: { name: "admin", email: "admin@example.com", role: "admin" },
    loading: false,
  })),
  usePathnameMock: vi.fn(() => "/portal-rrhh/candidatos"),
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
      <RRHHSidebar />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  useCurrentUserMock.mockClear()
  usePathnameMock.mockReturnValue("/portal-rrhh/candidatos")
})

describe("RRHHSidebar", () => {
  it("alinea el logo a la selección de portal y marca Candidatos como página actual", () => {
    renderSidebar()

    expect(screen.getByRole("link", { name: "Ir a selección de portal" })).toHaveAttribute(
      "href",
      "/seleccion-portal",
    )
    expect(screen.getByRole("link", { name: "Candidatos" })).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  it("separa Configuración de los destinos principales", () => {
    renderSidebar()

    const menu = screen.getByRole("navigation", { name: "Menú RRHH" })
    const links = within(menu).getAllByRole("link")
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/portal-rrhh/candidatos",
      "/portal-rrhh/vacantes",
      "/portal-rrhh/entrevistas",
      "/portal-rrhh/reportes",
      "/portal-rrhh/configuracion",
    ])
    expect(links[links.length - 1]).toHaveTextContent("Configuración")
  })

  it("muestra el nombre capitalizado, el rol localizado y permite cerrar sesión", () => {
    renderSidebar()

    expect(screen.getByText("Admin")).toBeInTheDocument()
    expect(screen.getByText("Administrador")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Menú de cuenta/ }))
    const menu = screen.getByRole("menu")
    expect(within(menu).getByText("Cerrar sesión")).toBeInTheDocument()
    expect(within(menu).getByText("Administración")).toBeInTheDocument()
  })
})
