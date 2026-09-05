import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"

import DocumentsUploadZone from "@/components/candidato/DocumentsUploadZone"
import { renderWithIntl } from "@/tests/helpers/render-with-intl"

/**
 * Visibilidad del botón Procesar en DocumentsUploadZone.
 * En Documentos del portal no se pasa onProcess; el botón no debe aparecer
 * aunque el nombre del archivo sea tipo CV/Resume.
 */
describe("DocumentsUploadZone process button visibility", () => {
  const stagePdf = (fileName: string) => {
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(["%PDF"], fileName, { type: "application/pdf" })
    fireEvent.change(input, { target: { files: [file] } })
  }

  it("no muestra Procesar para un CV cuando no hay onProcess", () => {
    renderWithIntl(<DocumentsUploadZone />)
    stagePdf("CV-Mateo-Flores-Aleman-Frontend.pdf")

    expect(screen.getByText("CV-Mateo-Flores-Aleman-Frontend.pdf")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", {
        name: /Procesar con IA: CV-Mateo-Flores-Aleman-Frontend\.pdf/i,
      }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Procesar")).not.toBeInTheDocument()
  })

  it("muestra Procesar para un CV cuando hay onProcess", () => {
    const onProcess = vi.fn()
    renderWithIntl(<DocumentsUploadZone onProcess={onProcess} />)
    stagePdf("CV-Mateo-Flores-Aleman-Frontend.pdf")

    expect(
      screen.getByRole("button", {
        name: "Procesar con IA: CV-Mateo-Flores-Aleman-Frontend.pdf",
      }),
    ).toBeInTheDocument()
    expect(screen.getByText("Procesar")).toBeInTheDocument()
  })

  it("no muestra Procesar para un documento general aunque haya onProcess", () => {
    renderWithIntl(<DocumentsUploadZone onProcess={vi.fn()} />)
    stagePdf("antecedentes-penales.pdf")

    expect(screen.getByText("antecedentes-penales.pdf")).toBeInTheDocument()
    expect(screen.queryByText("Procesar")).not.toBeInTheDocument()
  })
})
