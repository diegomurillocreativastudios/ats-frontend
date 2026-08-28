import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderWithIntl as render } from "@/tests/helpers/render-with-intl"
import { AdminInterviewCatalogContent } from "@/components/portal-admin/AdminInterviewCatalogContent"
import type {
  InterviewModalityAdmin,
  InterviewStatusAdmin,
  InterviewTypeAdmin,
} from "@/lib/api/interviews"

const interviewApiMocks = vi.hoisted(() => ({
  listInterviewTypesAdmin: vi.fn(),
  createInterviewType: vi.fn(),
  updateInterviewType: vi.fn(),
  deleteInterviewType: vi.fn(),
  listInterviewModalitiesAdmin: vi.fn(),
  createInterviewModality: vi.fn(),
  updateInterviewModality: vi.fn(),
  deleteInterviewModality: vi.fn(),
  listInterviewStatusesAdmin: vi.fn(),
  createInterviewStatus: vi.fn(),
  updateInterviewStatus: vi.fn(),
  deleteInterviewStatus: vi.fn(),
}))

vi.mock("@/lib/api/interviews", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/interviews")>()
  return {
    ...actual,
    ...interviewApiMocks,
  }
})

function buildType(
  overrides: Partial<InterviewTypeAdmin> = {}
): InterviewTypeAdmin {
  return {
    id: "type-1",
    name: "Técnica",
    code: "tecnica",
    ...overrides,
  }
}

function buildModality(
  overrides: Partial<InterviewModalityAdmin> = {}
): InterviewModalityAdmin {
  return {
    id: "mod-1",
    displayName: "Virtual",
    includeGoogleMeetLink: true,
    ...overrides,
  }
}

function buildStatus(
  overrides: Partial<InterviewStatusAdmin> = {}
): InterviewStatusAdmin {
  return {
    id: "status-1",
    code: "1",
    displayName: "Programada",
    description: null,
    sortOrder: 1,
    isTerminal: false,
    isActive: true,
    ...overrides,
  }
}

function getPageHeader(title: string) {
  const heading = screen.getByRole("heading", { name: title })
  const header = heading.closest("header")
  expect(header).toBeTruthy()
  return header as HTMLElement
}

describe("AdminInterviewCatalogContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    interviewApiMocks.listInterviewTypesAdmin.mockResolvedValue([])
    interviewApiMocks.listInterviewModalitiesAdmin.mockResolvedValue([])
    interviewApiMocks.listInterviewStatusesAdmin.mockResolvedValue([])
  })

  it("renders the types catalog with the departments layout chrome", async () => {
    interviewApiMocks.listInterviewTypesAdmin
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([buildType()])
    interviewApiMocks.createInterviewType.mockResolvedValueOnce(buildType())

    render(<AdminInterviewCatalogContent catalog="types" />)

    expect(
      await screen.findByText("Aún no hay tipos de entrevista creados")
    ).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Crear tipo/i })).toHaveLength(2)

    const header = getPageHeader("Tipos de entrevista")
    expect(within(header).getByRole("button", { name: "Refrescar" })).toBeInTheDocument()
    expect(
      within(header).getByRole("button", { name: /Crear tipo/i })
    ).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: /Crear tipo/i })[0])

    fireEvent.change(await screen.findByLabelText(/Nombre/i), {
      target: { value: "Técnica" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))

    await waitFor(() => {
      expect(interviewApiMocks.createInterviewType).toHaveBeenCalledWith({
        name: "Técnica",
      })
    })

    expect(await screen.findByText("Técnica")).toBeInTheDocument()
    expect(
      screen.queryByRole("columnheader", { name: "Código" })
    ).not.toBeInTheDocument()
    expect(screen.queryByText("tecnica")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument()
  })

  it("renders modalities with a Google Meet column and labeled row actions", async () => {
    interviewApiMocks.listInterviewModalitiesAdmin.mockResolvedValueOnce([
      buildModality(),
    ])

    render(<AdminInterviewCatalogContent catalog="modalities" />)

    const header = getPageHeader("Modalidades de entrevista")
    expect(within(header).getByRole("button", { name: "Refrescar" })).toBeInTheDocument()
    expect(
      within(header).getByRole("button", { name: /Crear modalidad/i })
    ).toBeInTheDocument()

    expect(await screen.findByText("Virtual")).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Google Meet" })).toBeInTheDocument()
    expect(screen.getByText("Sí")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument()
  })

  it("renders statuses without an order column and opens create in a modal", async () => {
    interviewApiMocks.listInterviewStatusesAdmin.mockResolvedValueOnce([
      buildStatus(),
    ])

    render(<AdminInterviewCatalogContent catalog="statuses" />)

    const header = getPageHeader("Estados de entrevista")
    expect(within(header).getByRole("button", { name: "Refrescar" })).toBeInTheDocument()
    expect(
      within(header).getByRole("button", { name: /Crear estado/i })
    ).toBeInTheDocument()

    expect(await screen.findByText("Programada")).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Terminal" })).toBeInTheDocument()
    expect(
      screen.queryByRole("columnheader", { name: "Código" })
    ).not.toBeInTheDocument()
    expect(screen.getByText("No")).toBeInTheDocument()

    fireEvent.click(within(header).getByRole("button", { name: /Crear estado/i }))

    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).getByRole("heading", { name: "Crear estado de entrevista" })
    ).toBeInTheDocument()
    expect(
      within(dialog).getByLabelText(/Nombre visible/i)
    ).toBeInTheDocument()
  })
})
