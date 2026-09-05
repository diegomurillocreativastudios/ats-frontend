import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"

import DocumentosContent from "@/app/portal-candidato/documentos/DocumentosContent"
import { renderWithIntl } from "@/tests/helpers/render-with-intl"

const postFormData = vi.fn()
const refetch = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    postFormData: (...args: unknown[]) => postFormData(...args),
    get: vi.fn(),
  },
}))

vi.mock("@/hooks/useCandidateDocuments", () => ({
  useCandidateDocuments: () => ({
    candidateId: "candidate-123",
    documents: [],
    loading: false,
    error: null,
    refetch,
    deleteDocument: vi.fn(),
  }),
}))

vi.mock("@/components/candidato/CandidateSidebar", () => ({
  default: () => <aside data-testid="candidate-sidebar" />,
}))

vi.mock("@/components/candidato/CandidateTopbar", () => ({
  default: () => <header data-testid="candidate-topbar" />,
}))

vi.mock("@/components/candidato/AgregarCandidatoModal", () => ({
  default: () => null,
}))

vi.mock("@/lib/api/identity-document-types", () => ({
  listIdentityDocumentTypes: vi.fn(async () => []),
}))

/**
 * Documentos del portal: solo subida general, sin bloqueo por nombre CV/Resume.
 */
describe("DocumentosContent general upload", () => {
  beforeEach(() => {
    postFormData.mockReset()
    refetch.mockReset()
    postFormData.mockResolvedValue({ id: "doc-1" })
    refetch.mockResolvedValue(undefined)
  })

  it("permite subir un archivo con nombre tipo CV como documento general", async () => {
    renderWithIntl(<DocumentosContent />)

    const inputs = document.querySelectorAll('input[type="file"]')
    expect(inputs.length).toBeGreaterThan(0)
    const file = new File(["%PDF"], "CV-Mateo-Flores-Aleman-Frontend.pdf", {
      type: "application/pdf",
    })
    fireEvent.change(inputs[0], { target: { files: [file] } })

    expect(
      screen.getAllByText("CV-Mateo-Flores-Aleman-Frontend.pdf").length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText("Procesar")).not.toBeInTheDocument()

    const uploadButtons = screen.getAllByRole("button", {
      name: "Subir documentos generales del candidato",
    })
    fireEvent.click(uploadButtons[0])

    await waitFor(() => {
      expect(postFormData).toHaveBeenCalledWith(
        "/api/candidate/candidate-123/documents",
        expect.any(FormData),
      )
    })
    expect(postFormData).not.toHaveBeenCalledWith(
      "/Ingest/upload",
      expect.anything(),
    )
  })
})
