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
  setInterviewStatusInterviewDone: vi.fn(),
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
    isInterviewDone: false,
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
      screen.getByRole("columnheader", { name: "Entrevista efectuada" })
    ).toBeInTheDocument()
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

  it("asks for confirmation before moving the interview-done flag to another status", async () => {
    const cancelledDone = buildStatus({
      id: "cancelled",
      displayName: "Cancelada",
      isTerminal: true,
      isInterviewDone: true,
    })
    const completedOff = buildStatus({
      id: "completed",
      code: "2",
      displayName: "Completada",
      isTerminal: true,
      isInterviewDone: false,
    })
    const cancelledOff = {
      ...cancelledDone,
      isInterviewDone: false,
    }
    const completedDone = {
      ...completedOff,
      isInterviewDone: true,
    }

    interviewApiMocks.listInterviewStatusesAdmin
      .mockResolvedValueOnce([cancelledDone, completedOff])
      .mockResolvedValueOnce([cancelledOff, completedDone])
    interviewApiMocks.setInterviewStatusInterviewDone
      .mockResolvedValueOnce(cancelledOff)
      .mockResolvedValueOnce(completedDone)

    render(<AdminInterviewCatalogContent catalog="statuses" />)

    expect(await screen.findByText("Cancelada")).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("switch", {
        name: "Marcar Completada como entrevista efectuada",
      })
    )

    expect(
      await screen.findByRole("heading", {
        name: "Cambiar entrevista efectuada",
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/se desactivará «Cancelada» y se activará «Completada»/i)
    ).toBeInTheDocument()
    expect(
      interviewApiMocks.setInterviewStatusInterviewDone
    ).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: "Cambiar entrevista efectuada",
        })
      ).not.toBeInTheDocument()
    })
    expect(
      interviewApiMocks.setInterviewStatusInterviewDone
    ).not.toHaveBeenCalled()
    expect(
      screen.getByRole("switch", {
        name: "Cancelada: entrevista efectuada activa",
      })
    ).toHaveAttribute("aria-checked", "true")

    fireEvent.click(
      screen.getByRole("switch", {
        name: "Marcar Completada como entrevista efectuada",
      })
    )
    fireEvent.click(await screen.findByRole("button", { name: "Cambiar" }))

    await waitFor(() => {
      expect(
        interviewApiMocks.setInterviewStatusInterviewDone
      ).toHaveBeenNthCalledWith(1, "cancelled", false)
      expect(
        interviewApiMocks.setInterviewStatusInterviewDone
      ).toHaveBeenNthCalledWith(2, "completed", true)
    })

    expect(
      await screen.findByRole("switch", {
        name: "Completada: entrevista efectuada activa",
      })
    ).toHaveAttribute("aria-checked", "true")
    expect(
      screen.getByRole("switch", {
        name: "Marcar Cancelada como entrevista efectuada",
      })
    ).toHaveAttribute("aria-checked", "false")
  })
})
