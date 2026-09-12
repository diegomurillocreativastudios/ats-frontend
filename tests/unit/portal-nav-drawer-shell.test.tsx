import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within, waitFor, fireEvent } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PortalAdminShell } from "@/components/portal-admin/PortalAdminShell"
import { RrhhPortalShell } from "@/components/rrhh/rrhh-portal-shell"
import RRHHTopbar from "@/components/rrhh/RRHHTopbar"
import { CandidatePortalShell } from "@/components/candidato/candidate-portal-shell"
import { PortalNavDrawer } from "@/components/navigation/portal-nav-drawer"
import { PORTAL_COMPACT_TOPBAR_LAYOUT_CLASS } from "@/components/navigation/portal-topbar"
import esMessages from "@/messages/es.json"

const { useCurrentUserMock, usePathnameMock } = vi.hoisted(() => ({
  useCurrentUserMock: vi.fn(() => ({
    user: { name: "admin", email: "admin@example.com", role: "admin" },
    loading: false,
    photoSrc: null,
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

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  useCurrentUserMock.mockClear()
  usePathnameMock.mockReturnValue("/portal-rrhh/candidatos")
  document.body.style.overflow = ""
})

describe("RrhhPortalShell", () => {
  it("fija el viewport y deja un único main scrolleable", () => {
    const { container } = renderWithIntl(
      <RrhhPortalShell breadcrumbLabel="Candidatos">
        <p>Contenido RRHH</p>
      </RrhhPortalShell>,
    )
    const shell = container.firstElementChild
    expect(shell?.className).toContain("h-dvh")
    expect(shell?.className).toContain("overflow-hidden")

    const mains = screen.getAllByRole("main")
    expect(mains).toHaveLength(1)
    expect(within(mains[0]).getByText("Contenido RRHH")).toBeInTheDocument()
  })

  it("centra un logo más grande en el topbar compacto", () => {
    renderWithIntl(<RRHHTopbar variant="tablet" breadcrumbLabel="Candidatos" />)

    const brand = screen.getByRole("link", {
      name: "Ir a selección de portal",
    })
    expect(brand.className).toContain("justify-self-center")
    expect(brand.closest("header")?.className).toContain(
      PORTAL_COMPACT_TOPBAR_LAYOUT_CLASS,
    )
    expect(
      within(brand).getByRole("img", { name: "ApplicanTree" }).className,
    ).toMatch(/h-11/)
  })

  it("abre el cajón de navegación desde el menú tablet", async () => {
    renderWithIntl(
      <RrhhPortalShell breadcrumbLabel="Candidatos">
        <p>Contenido RRHH</p>
      </RrhhPortalShell>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }))

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Menú de navegación" }),
      ).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: "Cerrar menú" })).toBeInTheDocument()
  })
})

describe("CandidatePortalShell", () => {
  it("fija el viewport y deja un único main", () => {
    usePathnameMock.mockReturnValue("/portal-candidato")
    const { container } = renderWithIntl(
      <CandidatePortalShell breadcrumbLabel="Inicio">
        <p>Contenido candidato</p>
      </CandidatePortalShell>,
    )
    expect(container.firstElementChild?.className).toContain("h-dvh")
    expect(screen.getAllByRole("main")).toHaveLength(1)
    expect(screen.getByText("Contenido candidato")).toBeInTheDocument()
  })
})

describe("PortalAdminShell navigation drawer", () => {
  it("abre el menú de administración en vista compacta", async () => {
    usePathnameMock.mockReturnValue("/portal-admin/administracion/usuarios")
    renderWithIntl(
      <PortalAdminShell>
        <p>Contenido admin</p>
      </PortalAdminShell>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }))
    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Menú de navegación" }),
      ).toBeInTheDocument()
    })
  })
})

describe("PortalNavDrawer", () => {
  it("cierra con Escape", () => {
    const onClose = vi.fn()
    renderWithIntl(
      <PortalNavDrawer isOpen onClose={onClose}>
        <p>Nav content</p>
      </PortalNavDrawer>,
    )

    expect(document.body.style.overflow).toBe("hidden")
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onClose).toHaveBeenCalled()
  })
})
