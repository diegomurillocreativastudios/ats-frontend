import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PortalAdminShell } from "@/components/portal-admin/PortalAdminShell"
import esMessages from "@/messages/es.json"

const { useCurrentUserMock, usePathnameMock } = vi.hoisted(() => ({
  useCurrentUserMock: vi.fn(() => ({
    user: { name: "admin", email: "admin@example.com", role: "admin" },
    loading: false,
  })),
  usePathnameMock: vi.fn(() => "/portal-admin/usuarios"),
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
      <PortalAdminShell>
        <p>Contenido de prueba</p>
      </PortalAdminShell>
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  useCurrentUserMock.mockClear()
  usePathnameMock.mockReturnValue("/portal-admin/usuarios")
})

describe("PortalAdminShell", () => {
  it("fija el viewport y deja un único main scrolleable con el contenido", () => {
    const { container } = renderShell()
    const shell = container.firstElementChild
    expect(shell?.className).toContain("h-dvh")
    expect(shell?.className).toContain("overflow-hidden")
    expect(shell?.className).toContain("bg-background")

    const mains = screen.getAllByRole("main")
    expect(mains).toHaveLength(1)
    expect(mains[0].className).toContain("overflow-y-auto")
    expect(within(mains[0]).getByText("Contenido de prueba")).toBeInTheDocument()
  })

  it("muestra el sidebar a partir de lg y el topbar de tablet por debajo", () => {
    renderShell()

    const sidebar = screen.getByRole("navigation", { name: "Menú administración" })
    expect(sidebar.closest("aside")?.parentElement?.className).toMatch(
      /hidden[\s\S]*lg:flex/,
    )
    expect(screen.getByRole("button", { name: "Abrir menú" })).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Migas de pan" })).toBeInTheDocument()
  })
})
