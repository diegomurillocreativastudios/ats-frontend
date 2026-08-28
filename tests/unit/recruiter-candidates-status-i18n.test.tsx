import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"

/**
 * Etapa 10 — Fallback frontend "Sin nombre" y booleano contratado/no contratado
 * en el listado de candidatos RRHH.
 *
 * Se valida que:
 *  - el fallback "Sin nombre" se traduce SOLO cuando el nombre llega vacío,
 *  - un nombre real (data dinámica) NO se traduce ni altera,
 *  - el booleano hired/notHired resuelve labels controlados.
 */

const apiGet = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGet(...args),
    getWithHeaders: async (...args: unknown[]) => ({
      data: await apiGet(...args),
      headers: new Headers({
        "X-Total-Count": "2",
        "X-Page": "1",
        "X-Page-Size": "50",
      }),
    }),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("@/components/rrhh/RRHHSidebar", () => ({ default: () => null }))
vi.mock("@/components/rrhh/RRHHTopbar", () => ({ default: () => null }))
vi.mock("@/components/candidato/AgregarCandidatoModal", () => ({
  default: () => null,
}))
vi.mock("@/components/candidato/CandidateFollowUpModal", () => ({
  default: () => null,
}))
vi.mock("@/components/ui/Snackbar", () => ({ default: () => null }))

import CandidatosPage from "@/app/portal-rrhh/candidatos/page"

const messagesByLocale: Record<"es" | "en", Record<string, unknown>> = {
  es: esMessages,
  en: enMessages,
}

function renderWithIntl(locale: "es" | "en") {
  return render(
    <NextIntlClientProvider
      locale={locale as Locale}
      messages={messagesByLocale[locale]}
    >
      <CandidatosPage />
    </NextIntlClientProvider>,
  )
}

const candidatesFixture = [
  {
    id: "c-1",
    personalInfo: { name: "María Pérez", email: "maria@acme.com" },
    recruitment: { hired: true },
  },
  {
    id: "c-2",
    personalInfo: { name: "", email: "anon@acme.com" },
    recruitment: { hired: false },
  },
]

beforeEach(() => {
  apiGet.mockReset()
  apiGet.mockResolvedValue(candidatesFixture)
})

describe("CandidatosPage fallback de nombre i18n (Etapa 10)", () => {
  it("traduce 'Sin nombre' en español pero no toca el nombre real", async () => {
    renderWithIntl("es")

    expect((await screen.findAllByText("María Pérez")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("Sin nombre").length).toBeGreaterThan(0)
  })

  it("traduce el fallback a 'No name' en inglés y mantiene el nombre real", async () => {
    renderWithIntl("en")

    expect((await screen.findAllByText("María Pérez")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("No name").length).toBeGreaterThan(0)
  })

  it("resuelve el booleano contratado/no contratado con labels controlados", async () => {
    renderWithIntl("es")

    expect((await screen.findAllByText("María Pérez")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("Contratado").length).toBeGreaterThan(0)
    expect(screen.getAllByText("No Contratado").length).toBeGreaterThan(0)
  })
})
