import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderWithIntl as render } from "@/tests/helpers/render-with-intl"
import { AdminIdentityDocumentTypesContent } from "@/components/portal-admin/AdminIdentityDocumentTypesContent"
import type { IdentityDocumentTypeResponseDto } from "@/lib/api/admin-identity-document-types"

const documentTypesApiMocks = vi.hoisted(() => ({
  listAdminIdentityDocumentTypes: vi.fn(),
  createAdminIdentityDocumentType: vi.fn(),
  updateAdminIdentityDocumentType: vi.fn(),
  deleteAdminIdentityDocumentType: vi.fn(),
}))

vi.mock("@/lib/api/admin-identity-document-types", () => ({
  listAdminIdentityDocumentTypes:
    documentTypesApiMocks.listAdminIdentityDocumentTypes,
  createAdminIdentityDocumentType:
    documentTypesApiMocks.createAdminIdentityDocumentType,
  updateAdminIdentityDocumentType:
    documentTypesApiMocks.updateAdminIdentityDocumentType,
  deleteAdminIdentityDocumentType:
    documentTypesApiMocks.deleteAdminIdentityDocumentType,
}))

function buildDocumentType(
  overrides: Partial<IdentityDocumentTypeResponseDto> = {}
): IdentityDocumentTypeResponseDto {
  return {
    id: "doc-1",
    code: "DUI",
    name: "Documento Único de Identidad",
    createdAtUtc: "2026-01-01T00:00:00Z",
    createdByUserId: null,
    updatedAtUtc: null,
    updatedByUserId: null,
    ...overrides,
  }
}

function getPageHeader(title: string) {
  const heading = screen.getByRole("heading", { name: title })
  const header = heading.closest("header")
  expect(header).toBeTruthy()
  return header as HTMLElement
}

describe("AdminIdentityDocumentTypesContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the catalog chrome with refresh and create in the header", async () => {
    documentTypesApiMocks.listAdminIdentityDocumentTypes
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([buildDocumentType()])
    documentTypesApiMocks.createAdminIdentityDocumentType.mockResolvedValueOnce(
      buildDocumentType()
    )

    render(<AdminIdentityDocumentTypesContent />)

    expect(
      await screen.findByText("Aún no hay tipos de documento creados")
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole("button", { name: /Crear tipo de documento/i })
    ).toHaveLength(2)

    const header = getPageHeader("Tipos de Documento")
    expect(
      within(header).getByRole("button", { name: "Refrescar" })
    ).toBeInTheDocument()
    expect(
      within(header).getByRole("button", { name: /Crear tipo de documento/i })
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getAllByRole("button", { name: /Crear tipo de documento/i })[0]
    )

    fireEvent.change(await screen.findByLabelText(/Nombre/i), {
      target: { value: "Documento Único de Identidad" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))

    await waitFor(() => {
      expect(
        documentTypesApiMocks.createAdminIdentityDocumentType
      ).toHaveBeenCalledWith({
        code: "DOCUMENTO_UNICO_DE_IDENTIDAD",
        name: "Documento Único de Identidad",
      })
    })

    expect(
      await screen.findByText("Documento Único de Identidad")
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("columnheader", { name: "Código" })
    ).not.toBeInTheDocument()
    expect(screen.queryByText("DUI")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument()
    expect(
      screen.queryByRole("columnheader", { name: "Fecha de creación" })
    ).not.toBeInTheDocument()
  })

  it("opens edit from the list row without a search or count bar", async () => {
    documentTypesApiMocks.listAdminIdentityDocumentTypes.mockResolvedValueOnce([
      buildDocumentType(),
    ])

    render(<AdminIdentityDocumentTypesContent />)

    expect(
      await screen.findByText("Documento Único de Identidad")
    ).toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText(/Buscar por código o nombre/i)
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Editar" }))

    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).getByRole("heading", { name: "Editar tipo de documento" })
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/Nombre/i)).toHaveValue(
      "Documento Único de Identidad"
    )
    expect(within(dialog).queryByLabelText(/Código/i)).not.toBeInTheDocument()
  })
})
