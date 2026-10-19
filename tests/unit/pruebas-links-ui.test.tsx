import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasLinksScreen } from "@/components/pruebas/links/pruebas-links-screen"
import type {
  AssessmentLinkRow,
  AssessmentLinksCatalog,
} from "@/lib/api/recruiter-assessments-links"
import type { AssessmentTestView } from "@/lib/api/recruiter-assessments-tests"
import esMessages from "@/messages/es.json"

const getAssessmentLinksCatalog = vi.fn()
const createAssessmentLink = vi.fn()
const setAssessmentLinkActive = vi.fn()
const listAssessmentTests = vi.fn()

vi.mock("@/lib/api/recruiter-assessments-links", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/recruiter-assessments-links")
  >("@/lib/api/recruiter-assessments-links")
  return {
    ...actual,
    getAssessmentLinksCatalog: (...args: unknown[]) =>
      getAssessmentLinksCatalog(...args),
    createAssessmentLink: (...args: unknown[]) => createAssessmentLink(...args),
    setAssessmentLinkActive: (...args: unknown[]) =>
      setAssessmentLinkActive(...args),
  }
})

vi.mock("@/lib/api/recruiter-assessments-tests", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/recruiter-assessments-tests")
  >("@/lib/api/recruiter-assessments-tests")
  return {
    ...actual,
    listAssessmentTests: (...args: unknown[]) => listAssessmentTests(...args),
  }
})

const searchParamsGet = vi.fn<(key: string) => string | null>(() => null)

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: searchParamsGet,
  }),
}))

const sampleTests: AssessmentTestView[] = [
  {
    id: "test-tech",
    title: "Análisis de datos",
    description: "Tech",
    kind: "technical",
    lifecycleStatus: "published",
    draftVersion: 1,
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "test-psycho",
    title: "Perfil de dimensiones",
    description: "Psycho",
    kind: "psychometric",
    lifecycleStatus: "published",
    draftVersion: 1,
    createdAt: "2026-09-01T00:00:00Z",
  },
]

const activeLink: AssessmentLinkRow = {
  id: "link-active",
  testVersionId: "ver-tech-1",
  testId: "test-tech",
  testTitle: "Análisis de datos",
  versionNumber: 1,
  vacancyId: "vac-open",
  vacancyTitle: "Analista de datos",
  companyId: "co-1",
  companyName: "Applican Demo",
  active: true,
  linkedAt: "2026-10-10T00:00:00Z",
}

const inactivePsychoLink: AssessmentLinkRow = {
  id: "link-inactive",
  testVersionId: "ver-psycho-1",
  testId: "test-psycho",
  testTitle: "Perfil de dimensiones",
  versionNumber: 1,
  vacancyId: "vac-open",
  vacancyTitle: "Analista de datos",
  companyId: "co-1",
  companyName: "Applican Demo",
  active: false,
  linkedAt: "2026-10-12T00:00:00Z",
}

const sampleCatalog: AssessmentLinksCatalog = {
  versions: [
    {
      id: "ver-tech-1",
      testId: "test-tech",
      testTitle: "Análisis de datos",
      versionNumber: 1,
    },
    {
      id: "ver-psycho-1",
      testId: "test-psycho",
      testTitle: "Perfil de dimensiones",
      versionNumber: 1,
    },
  ],
  vacancies: [
    {
      id: "vac-open",
      title: "Analista de datos",
      companyId: "co-1",
      companyName: "Applican Demo",
      linkable: true,
      unavailableReason: null,
    },
    {
      id: "vac-closed",
      title: "Inventario de almacén",
      companyId: "co-1",
      companyName: "Applican Demo",
      linkable: false,
      unavailableReason: "closed",
    },
  ],
  links: [activeLink, inactivePsychoLink],
}

function renderWithIntl(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

function apiError(code: string, status = 409) {
  const error = new Error(code) as Error & {
    status: number
    body: { code: string; message: string }
  }
  error.status = status
  error.body = { code, message: code }
  return error
}

beforeEach(() => {
  getAssessmentLinksCatalog.mockReset()
  createAssessmentLink.mockReset()
  setAssessmentLinkActive.mockReset()
  listAssessmentTests.mockReset()
  searchParamsGet.mockReturnValue(null)
  getAssessmentLinksCatalog.mockResolvedValue(sampleCatalog)
  listAssessmentTests.mockResolvedValue(sampleTests)
  createAssessmentLink.mockResolvedValue(activeLink)
  setAssessmentLinkActive.mockResolvedValue({ ...activeLink, active: false })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("PruebasLinksScreen UI", () => {
  it("shows excluded closed vacancy and technical rows only", async () => {
    renderWithIntl(<PruebasLinksScreen />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Vinculaciones" }),
      ).toBeInTheDocument()
    })

    expect(screen.getByTestId("links-excluded-vacancies")).toHaveTextContent(
      /Inventario de almacén \(cerrada\)/i,
    )

    const vacancySelect = screen.getByTestId("links-vacancy-select")
    expect(
      within(vacancySelect).queryByRole("option", {
        name: "Inventario de almacén",
      }),
    ).not.toBeInTheDocument()
    expect(
      within(vacancySelect).getByRole("option", { name: "Analista de datos" }),
    ).toBeInTheDocument()

    const versionSelect = screen.getByTestId("links-version-select")
    expect(
      within(versionSelect).getByRole("option", {
        name: /Análisis de datos · v1/,
      }),
    ).toBeInTheDocument()
    expect(
      within(versionSelect).queryByRole("option", {
        name: /Perfil de dimensiones/,
      }),
    ).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getAllByTestId("link-row").length).toBeGreaterThan(0)
    })
    const linkIds = new Set(
      screen
        .getAllByTestId("link-row")
        .map((row) => row.getAttribute("data-link-id")),
    )
    expect(linkIds).toEqual(new Set(["link-active"]))
    expect(linkIds.has("link-inactive")).toBe(false)
  })

  it("preselects version from query and shows duplicate_link", async () => {
    searchParamsGet.mockImplementation((key: string) =>
      key === "version" ? "ver-tech-1" : null,
    )
    createAssessmentLink.mockRejectedValueOnce(apiError("duplicate_link", 409))

    renderWithIntl(<PruebasLinksScreen />)

    await waitFor(() => {
      expect(screen.getByTestId("links-version-select")).toHaveValue(
        "ver-tech-1",
      )
    })

    fireEvent.change(screen.getByTestId("links-vacancy-select"), {
      target: { value: "vac-open" },
    })
    fireEvent.click(screen.getByTestId("links-submit"))

    const createDialog = await screen.findByRole("dialog", {
      name: "Confirmar vinculación",
    })
    fireEvent.click(within(createDialog).getByRole("button", { name: "Vincular" }))

    await waitFor(() => {
      expect(
        screen.getByText(/Ya existe un vínculo para esa versión y vacante/i),
      ).toBeInTheDocument()
    })
  })

  it("deactivates and reactivates a technical link", async () => {
    const inactiveTech: AssessmentLinkRow = {
      ...activeLink,
      active: false,
    }
    getAssessmentLinksCatalog
      .mockResolvedValueOnce(sampleCatalog)
      .mockResolvedValueOnce({
        ...sampleCatalog,
        links: [inactiveTech, inactivePsychoLink],
      })
      .mockResolvedValueOnce(sampleCatalog)

    setAssessmentLinkActive
      .mockResolvedValueOnce(inactiveTech)
      .mockResolvedValueOnce(activeLink)

    renderWithIntl(<PruebasLinksScreen />)

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "Desactivar" }).length,
      ).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole("button", { name: "Desactivar" })[0]!)
    const deactivateDialog = await screen.findByRole("dialog", {
      name: "Desactivar vínculo",
    })
    fireEvent.click(
      within(deactivateDialog).getByRole("button", { name: "Desactivar" }),
    )

    await waitFor(() => {
      expect(setAssessmentLinkActive).toHaveBeenCalledWith("link-active", false)
    })

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "Reactivar" }).length,
      ).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole("button", { name: "Reactivar" })[0]!)
    const reactivateDialog = await screen.findByRole("dialog", {
      name: "Reactivar vínculo",
    })
    fireEvent.click(
      within(reactivateDialog).getByRole("button", { name: "Reactivar" }),
    )

    await waitFor(() => {
      expect(setAssessmentLinkActive).toHaveBeenCalledWith("link-active", true)
    })
  })
})
