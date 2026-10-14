import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasPortalShell } from "@/components/pruebas/layout/pruebas-portal-shell"
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

function renderShell() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <PruebasPortalShell>
        <p>Contenido de prueba</p>
      </PruebasPortalShell>
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  useCurrentUserMock.mockClear()
  usePathnameMock.mockReturnValue("/portal-pruebas")
})

describe("PruebasPortalShell", () => {
  it("fija el viewport y oculta el aviso de demostración en Inicio", () => {
    const { container } = renderShell()
    const shell = container.firstElementChild
    expect(shell?.className).toContain("h-dvh")
    expect(shell?.className).toContain("overflow-hidden")

    const mains = screen.getAllByRole("main")
    expect(mains).toHaveLength(1)
    expect(within(mains[0]).queryByTestId("mock-demo-notice")).not.toBeInTheDocument()
    expect(within(mains[0]).getByText("Contenido de prueba")).toBeInTheDocument()
  })

  it("oculta el aviso de demostración en Evaluaciones", () => {
    usePathnameMock.mockReturnValue("/portal-pruebas/evaluaciones")
    renderShell()

    expect(screen.queryByTestId("mock-demo-notice")).not.toBeInTheDocument()
  })

  it("muestra el aviso de demostración fuera de Inicio y Evaluaciones", () => {
    usePathnameMock.mockReturnValue("/portal-pruebas/preguntas")
    renderShell()

    expect(screen.getByTestId("mock-demo-notice")).toHaveTextContent(
      "Demostración — datos simulados",
    )
  })

  it("muestra el sidebar a partir de lg y el topbar compacto por debajo", () => {
    renderShell()

    const sidebar = screen.getByRole("navigation", { name: "Menú pruebas" })
    expect(sidebar.closest("aside")?.parentElement?.className).toMatch(
      /hidden[\s\S]*lg:flex/,
    )
    expect(screen.getByRole("button", { name: "Abrir menú" })).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Migas de pan" })).toBeInTheDocument()
  })
})
