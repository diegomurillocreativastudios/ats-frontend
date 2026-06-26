import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import CandidateTopbar from "@/components/candidato/CandidateTopbar"
import RRHHTopbar from "@/components/rrhh/RRHHTopbar"
import AdminTopbar from "@/components/portal-admin/AdminTopbar"
import type { Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"

const { useCurrentUserMock, usePathnameMock } = vi.hoisted(() => ({
  useCurrentUserMock: vi.fn(() => ({
    user: { name: "Ada Lovelace", email: "ada@example.com", role: "admin" },
    loading: false,
  })),
  usePathnameMock: vi.fn(() => "/portal-admin"),
}))

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: useCurrentUserMock,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: usePathnameMock,
}))

const messagesByLocale = { es: esMessages, en: enMessages } as const

function renderWithIntl(ui: React.ReactNode, locale: Locale) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      {ui}
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  useCurrentUserMock.mockClear()
  usePathnameMock.mockReturnValue("/portal-admin")
})

describe("Topbars i18n (Etapa 3)", () => {
  it("CandidateTopbar renderiza textos transversales en español", () => {
    renderWithIntl(<CandidateTopbar />, "es")
    expect(screen.getByText("Portal Candidato")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Notificaciones" }),
    ).toBeInTheDocument()
  })

  it("CandidateTopbar renderiza los mismos textos traducidos en inglés", () => {
    renderWithIntl(<CandidateTopbar />, "en")
    expect(screen.getByText("Candidate Portal")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument()
  })

  it("RRHHTopbar traduce la etiqueta del portal según el locale", () => {
    const { unmount } = renderWithIntl(<RRHHTopbar />, "es")
    expect(screen.getByText("Portal RRHH")).toBeInTheDocument()
    unmount()

    renderWithIntl(<RRHHTopbar />, "en")
    expect(screen.getByText("HR Portal")).toBeInTheDocument()
  })

  it("AdminTopbar muestra la acción de cerrar sesión traducida desde next-intl", () => {
    renderWithIntl(<AdminTopbar />, "en")
    expect(screen.getByText("Admin Portal")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "User menu" }))
    const menu = screen.getByRole("menu")
    expect(within(menu).getByText("Log out")).toBeInTheDocument()
  })

  it("AdminTopbar traduce el breadcrumb de etapas con la misma clave que el sidebar", () => {
    usePathnameMock.mockReturnValue("/portal-admin/etapas")
    const { unmount } = renderWithIntl(<AdminTopbar />, "es")
    expect(screen.getByText("Etapas")).toBeInTheDocument()
    unmount()

    renderWithIntl(<AdminTopbar />, "en")
    expect(screen.getByText("Stages")).toBeInTheDocument()
  })
})
