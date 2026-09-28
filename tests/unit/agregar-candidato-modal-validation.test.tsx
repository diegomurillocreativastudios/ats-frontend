import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"

import AgregarCandidatoModal from "@/components/candidato/AgregarCandidatoModal"
import { apiClient } from "@/lib/api"
import frMessages from "@/messages/fr.json"
import { renderWithIntl } from "@/tests/helpers/render-with-intl"

vi.mock("@/lib/api", () => ({
  apiClient: { postFormData: vi.fn() },
}))

vi.mock("@/lib/api/identity-document-types", () => ({
  listIdentityDocumentTypes: vi.fn(async () => []),
}))

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ user: null, loading: false }),
}))

describe("AgregarCandidatoModal CV required validation", () => {
  it("muestra que el CV es obligatorio al pulsar Procesar sin archivo", async () => {
    renderWithIntl(
      <AgregarCandidatoModal variant="recruiter" isOpen onClose={vi.fn()} />,
    )

    const processButton = await screen.findByRole("button", { name: "Procesar" })
    expect(processButton).toBeEnabled()

    fireEvent.click(processButton)

    expect(
      await screen.findAllByText(
        "El CV del candidato es un campo obligatorio.",
      ),
    ).toHaveLength(1)
    expect(screen.getByRole("alert")).toHaveTextContent(
      "El CV del candidato es un campo obligatorio.",
    )
  })

  it("quita el error de CV obligatorio al subir un PDF", async () => {
    renderWithIntl(
      <AgregarCandidatoModal variant="recruiter" isOpen onClose={vi.fn()} />,
    )

    fireEvent.click(await screen.findByRole("button", { name: "Procesar" }))
    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("El CV del candidato es un campo obligatorio.")

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(["%PDF"], "cv-candidato.pdf", {
      type: "application/pdf",
    })
    fireEvent.change(input, { target: { files: [file] } })

    expect(
      screen.queryByText("El CV del candidato es un campo obligatorio."),
    ).not.toBeInTheDocument()
  })

  it("muestra que el CV propio es obligatorio en la variante self", async () => {
    renderWithIntl(
      <AgregarCandidatoModal variant="self" isOpen onClose={vi.fn()} />,
    )

    fireEvent.click(
      await screen.findByRole("button", { name: "Guardar información" }),
    )

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu CV es un campo obligatorio.",
    )
  })
})

describe("AgregarCandidatoModal outputLanguage", () => {
  const postFormData = vi.mocked(apiClient.postFormData)

  beforeEach(() => {
    postFormData.mockReset()
    Element.prototype.scrollIntoView = vi.fn()
  })

  function stageCvAndSubmit(submitName: string) {
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(["%PDF"], "cv-candidato.pdf", {
      type: "application/pdf",
    })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByRole("button", { name: submitName }))
  }

  function getLastFormData(): FormData {
    return postFormData.mock.calls.at(-1)?.[1] as FormData
  }

  it("envía outputLanguage=ES con la interfaz en español", async () => {
    postFormData.mockResolvedValue({})
    renderWithIntl(
      <AgregarCandidatoModal variant="recruiter" isOpen onClose={vi.fn()} />,
    )
    await screen.findByRole("button", { name: "Procesar" })

    stageCvAndSubmit("Procesar")

    await waitFor(() =>
      expect(postFormData).toHaveBeenCalledWith(
        "/Ingest/upload",
        expect.any(FormData),
      ),
    )
    const formData = getLastFormData()
    expect(formData.get("EntityType")).toBe("Candidate")
    expect(formData.get("outputLanguage")).toBe("ES")
  })

  it("envía el código del idioma activo de la interfaz", async () => {
    postFormData.mockResolvedValue({})
    renderWithIntl(
      <AgregarCandidatoModal variant="recruiter" isOpen onClose={vi.fn()} />,
      { locale: "fr" },
    )
    const submitName = frMessages.CandidatePortal.documents.modal.recruiter.submit
    await screen.findByRole("button", { name: submitName })

    stageCvAndSubmit(submitName)

    await waitFor(() => expect(postFormData).toHaveBeenCalled())
    expect(getLastFormData().get("outputLanguage")).toBe("FR")
  })

  it("prioriza el mensaje localizado del 422 CV_OUTPUT_LANGUAGE_MISMATCH", async () => {
    postFormData.mockRejectedValue(
      Object.assign(
        new Error("CV output could not be produced in the requested language."),
        {
          status: 422,
          body: {
            message:
              "CV output could not be produced in the requested language.",
            code: "CV_OUTPUT_LANGUAGE_MISMATCH",
            outputLanguage: "ES",
          },
        },
      ),
    )
    renderWithIntl(
      <AgregarCandidatoModal variant="recruiter" isOpen onClose={vi.fn()} />,
    )
    await screen.findByRole("button", { name: "Procesar" })

    stageCvAndSubmit("Procesar")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos procesar tu CV en el idioma seleccionado. Intenta de nuevo.",
    )
  })

  it("prioriza el mensaje localizado del 400 errors.outputLanguage sin code", async () => {
    postFormData.mockRejectedValue(
      Object.assign(new Error("Solicitud fallida (400)"), {
        status: 400,
        body: {
          errors: {
            outputLanguage: [
              "outputLanguage must be one of: ES, EN, IT, FR, DE.",
            ],
          },
        },
      }),
    )
    renderWithIntl(
      <AgregarCandidatoModal variant="recruiter" isOpen onClose={vi.fn()} />,
    )
    await screen.findByRole("button", { name: "Procesar" })

    stageCvAndSubmit("Procesar")

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(
      "El idioma de la aplicación no es compatible",
    )
    expect(alert).not.toHaveTextContent("must be one of")
  })
})
