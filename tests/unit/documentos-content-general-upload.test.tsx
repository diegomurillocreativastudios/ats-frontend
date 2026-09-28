import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"

import DocumentosContent from "@/app/portal-candidato/documentos/DocumentosContent"
import type { Locale } from "@/i18n/routing"
import { renderWithIntl } from "@/tests/helpers/render-with-intl"
import esMessages from "@/messages/es.json"
import deMessages from "@/messages/de.json"

const UPLOAD_GENERAL_ARIA: Partial<Record<Locale, string>> = {
  es: esMessages.CandidatePortal.documents.uploadGeneralAria,
  de: deMessages.CandidatePortal.documents.uploadGeneralAria,
}

const postFormData = vi.fn()
const refetch = vi.fn()
const showSnackbar = vi.fn()

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

vi.mock("@/components/candidato/candidate-portal-snackbar", () => ({
  useCandidateSnackbar: () => ({ showSnackbar }),
}))

vi.mock("@/components/candidato/CandidateSidebar", () => ({
  default: () => <aside data-testid="candidate-sidebar" />,
}))

vi.mock("@/components/candidato/CandidateTopbar", () => ({
  default: () => <header data-testid="candidate-topbar" />,
}))

vi.mock("@/lib/api/identity-document-types", () => ({
  listIdentityDocumentTypes: vi.fn(async () => []),
}))

function stageAndUpload(locale: Locale = "es") {
  const view = renderWithIntl(<DocumentosContent />, { locale })
  const inputs = document.querySelectorAll('input[type="file"]')
  expect(inputs.length).toBeGreaterThan(0)
  const file = new File(["%PDF"], "CV-Mateo-Flores-Aleman-Frontend.pdf", {
    type: "application/pdf",
  })
  fireEvent.change(inputs[0], { target: { files: [file] } })
  const uploadButtons = screen.getAllByRole("button", {
    name: UPLOAD_GENERAL_ARIA[locale],
  })
  fireEvent.click(uploadButtons[0])
  return { ...view, file }
}

function getLastFormData(): FormData {
  const call = postFormData.mock.calls.at(-1)
  return call?.[1] as FormData
}

/**
 * Documentos del portal: solo subida general, sin bloqueo por nombre CV/Resume.
 */
describe("DocumentosContent general upload", () => {
  beforeEach(() => {
    postFormData.mockReset()
    refetch.mockReset()
    showSnackbar.mockReset()
    postFormData.mockResolvedValue({ id: "doc-1" })
    refetch.mockResolvedValue(undefined)
  })

  it("permite subir un archivo con nombre tipo CV como documento general", async () => {
    renderWithIntl(<DocumentosContent />)

    expect(
      screen.queryByRole("button", {
        name: "Completar información del candidato",
      }),
    ).not.toBeInTheDocument()

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
    const formData = getLastFormData()
    expect(formData.get("File")).toBe(file)
    expect(formData.get("outputLanguage")).toBe("ES")
  })

  it("envía outputLanguage según el idioma activo de la interfaz", async () => {
    stageAndUpload("de")

    await waitFor(() => expect(postFormData).toHaveBeenCalled())
    expect(getLastFormData().get("outputLanguage")).toBe("DE")
  })

  it("muestra copy localizado cuando el CV no se pudo producir en el idioma pedido", async () => {
    postFormData.mockRejectedValue(
      Object.assign(new Error("CV output could not be produced in the requested language."), {
        status: 422,
        body: {
          message: "CV output could not be produced in the requested language.",
          code: "CV_OUTPUT_LANGUAGE_MISMATCH",
          outputLanguage: "ES",
        },
      }),
    )
    stageAndUpload()

    await waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith(
        "No pudimos procesar tu CV en el idioma seleccionado. Intenta de nuevo.",
        "error",
      ),
    )
  })

  it("muestra copy localizado cuando backend rechaza outputLanguage sin code", async () => {
    postFormData.mockRejectedValue(
      Object.assign(new Error("Solicitud fallida (400)"), {
        status: 400,
        body: { errors: { outputLanguage: ["outputLanguage is required."] } },
      }),
    )
    stageAndUpload()

    await waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith(
        expect.stringContaining("El idioma de la aplicación no es compatible"),
        "error",
      ),
    )
  })
})
