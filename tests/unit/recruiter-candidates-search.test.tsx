import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"

const apiGet = vi.fn()
const apiGetWithHeaders = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGet(...args),
    getWithHeaders: (...args: unknown[]) => apiGetWithHeaders(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("@/components/rrhh/RRHHSidebar", () => ({ default: () => null }))
vi.mock("@/components/rrhh/RRHHTopbar", () => ({ default: () => null }))
vi.mock("@/components/ui/Snackbar", () => ({ default: () => null }))

vi.mock("@/components/candidato/AgregarCandidatoModal", () => ({
  default: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" onClick={onSuccess}>
      Alta mock
    </button>
  ),
}))

vi.mock("@/components/candidato/CandidateFollowUpModal", () => ({
  default: ({
    onUpdated,
  }: {
    onUpdated: (candidate: { id: string; name: string }) => void
  }) => (
    <button
      type="button"
      onClick={() => onUpdated({ id: "c-2", name: "Bruno Editado" })}
    >
      Seguimiento mock
    </button>
  ),
}))

import CandidatosPage from "@/app/portal-rrhh/candidatos/page"

const ana = {
  id: "c-1",
  personalInfo: { name: "Ana Pérez", email: "ana@acme.com" },
  recruitment: { hired: false },
}

const bruno = {
  id: "c-2",
  personalInfo: { name: "Bruno Soto", email: "bruno@acme.com" },
  recruitment: { hired: true },
}

const pagedHeaders = new Headers({
  "X-Total-Count": "1",
  "X-Page": "1",
  "X-Page-Size": "10",
})

function renderPage() {
  return render(
    <NextIntlClientProvider locale={"es" as Locale} messages={esMessages}>
      <CandidatosPage />
    </NextIntlClientProvider>,
  )
}

async function waitForPagedList() {
  expect((await screen.findAllByText("Ana Pérez")).length).toBeGreaterThan(0)
}

beforeEach(() => {
  apiGet.mockReset()
  apiGetWithHeaders.mockReset()
  apiGet.mockResolvedValue([ana, bruno])
  apiGetWithHeaders.mockResolvedValue({
    data: [ana],
    headers: pagedHeaders,
  })
})

describe("CandidatosPage búsqueda sin paginación", () => {
  it("pide la página inicial con page y pageSize", async () => {
    renderPage()
    await waitForPagedList()

    expect(apiGetWithHeaders).toHaveBeenCalledWith(
      "/api/recruiter/candidates/all?page=1&pageSize=10",
    )
    expect(apiGet).not.toHaveBeenCalled()
    expect(screen.getByRole("navigation", { name: "Paginación" })).toBeInTheDocument()
  })

  it("con texto pide el listado una sola vez y oculta la paginación", async () => {
    renderPage()
    await waitForPagedList()
    const search = screen.getByRole("searchbox", { name: "Buscar candidatos" })

    fireEvent.change(search, { target: { value: "   " } })
    expect(apiGet).not.toHaveBeenCalled()
    expect(screen.getByRole("navigation", { name: "Paginación" })).toBeInTheDocument()

    fireEvent.change(search, { target: { value: "Bru" } })
    expect((await screen.findAllByText("Bruno Soto")).length).toBeGreaterThan(0)
    expect(apiGet).toHaveBeenCalledTimes(1)
    expect(apiGet).toHaveBeenCalledWith("/api/recruiter/candidates/all")
    expect(screen.queryByRole("navigation", { name: "Paginación" })).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: "Bruno" } })
    expect(apiGet).toHaveBeenCalledTimes(1)

    fireEvent.change(search, { target: { value: "" } })
    expect(screen.getByRole("navigation", { name: "Paginación" })).toBeInTheDocument()
    expect((await screen.findAllByText("Ana Pérez")).length).toBeGreaterThan(0)
    expect(screen.queryByText("Bruno Soto")).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: "Bruno" } })
    expect((await screen.findAllByText("Bruno Soto")).length).toBeGreaterThan(0)
    expect(apiGet).toHaveBeenCalledTimes(1)
  })

  it("un seguimiento actualiza la copia de búsqueda", async () => {
    renderPage()
    await waitForPagedList()
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar candidatos" }), {
      target: { value: "Bruno" },
    })
    expect((await screen.findAllByText("Bruno Soto")).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Seguimiento mock" }))

    expect((await screen.findAllByText("Bruno Editado")).length).toBeGreaterThan(0)
    expect(apiGet).toHaveBeenCalledTimes(1)
  })

  it("un alta vuelve a pedir el listado sin paginación", async () => {
    apiGet
      .mockResolvedValueOnce([ana, bruno])
      .mockResolvedValueOnce([
        ana,
        {
          ...bruno,
          personalInfo: { name: "Bruno Recargado", email: "bruno@acme.com" },
        },
      ])

    renderPage()
    await waitForPagedList()
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar candidatos" }), {
      target: { value: "Bruno" },
    })
    expect((await screen.findAllByText("Bruno Soto")).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Alta mock" }))

    expect((await screen.findAllByText("Bruno Recargado")).length).toBeGreaterThan(0)
    expect(apiGet).toHaveBeenCalledTimes(2)
    expect(apiGet).toHaveBeenNthCalledWith(2, "/api/recruiter/candidates/all")
    expect(screen.queryByRole("navigation", { name: "Paginación" })).not.toBeInTheDocument()
  })
})
