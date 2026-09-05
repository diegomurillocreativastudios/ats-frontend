import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"

import AgregarCandidatoModal from "@/components/candidato/AgregarCandidatoModal"
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
