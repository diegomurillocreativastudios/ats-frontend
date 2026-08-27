import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import AdminSidebar from "@/components/portal-admin/AdminSidebar"
import esMessages from "@/messages/es.json"

const { useCurrentUserMock, usePathnameMock } = vi.hoisted(() => ({
  useCurrentUserMock: vi.fn(() => ({
    user: { name: "admin", email: "admin@example.com", role: "admin" },
    loading: false,
  })),
  usePathnameMock: vi.fn(() => "/portal-admin/administracion/usuarios"),
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
      <AdminSidebar />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  useCurrentUserMock.mockClear()
  usePathnameMock.mockReturnValue("/portal-admin/administracion/usuarios")
})

describe("AdminSidebar", () => {
  it("muestra las secciones siempre abiertas, sin controles de desplegable", () => {
    renderSidebar()

    const menu = screen.getByRole("navigation", { name: "Menú administración" })
    expect(within(menu).queryByRole("button")).not.toBeInTheDocument()
    expect(
      within(menu).getByRole("group", { name: "Vacantes" }),
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole("group", { name: "Entrevistas" }),
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole("group", { name: "Administración" }),
    ).toBeInTheDocument()
    expect(within(menu).getByRole("link", { name: "Plantillas" })).toHaveAttribute(
      "href",
      "/portal-admin/plantillas",
    )
    expect(within(menu).queryByRole("link", { name: "Empresas" })).not.toBeInTheDocument()
    expect(
      within(menu).queryByRole("link", { name: "Configuración" }),
    ).not.toBeInTheDocument()
  })

  it("agrupa usuarios y tipos de documento bajo Administración", () => {
    renderSidebar()

    const menu = screen.getByRole("navigation", { name: "Menú administración" })
    const administration = within(menu).getByRole("group", {
      name: "Administración",
    })

    expect(within(administration).getByRole("link", { name: "Usuarios" })).toHaveAttribute(
      "href",
      "/portal-admin/administracion/usuarios",
    )
    expect(within(administration).getByRole("link", { name: "Usuarios" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(
      within(administration).getByRole("link", { name: "Tipos de documento" }),
    ).toHaveAttribute("href", "/portal-admin/administracion/tipos-de-documento")
  })

  it("expone los catálogos de vacantes y entrevistas sin expandir", () => {
    renderSidebar()

    const menu = screen.getByRole("navigation", { name: "Menú administración" })

    expect(within(menu).getByRole("link", { name: "Etapas" })).toHaveAttribute(
      "href",
      "/portal-admin/vacantes/etapas",
    )
    expect(
      within(menu).getAllByRole("link", { name: "Estados" }).map((link) =>
        link.getAttribute("href"),
      ),
    ).toEqual([
      "/portal-admin/vacantes/estados",
      "/portal-admin/entrevistas/estados",
    ])
    expect(within(menu).getByRole("link", { name: "Departamentos" })).toHaveAttribute(
      "href",
      "/portal-admin/vacantes/departamentos",
    )
    expect(
      within(menu).getAllByRole("link", { name: "Modalidades" }).map((link) =>
        link.getAttribute("href"),
      ),
    ).toEqual([
      "/portal-admin/vacantes/modalidades",
      "/portal-admin/entrevistas/modalidades",
    ])
    expect(within(menu).getByRole("link", { name: "Tipos" })).toHaveAttribute(
      "href",
      "/portal-admin/entrevistas/tipos",
    )
  })
})
