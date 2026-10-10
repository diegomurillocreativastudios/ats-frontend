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
  const getFileInput = () =>
    screen.getByTestId("documents-upload-input") as HTMLInputElement

  const getDropzone = () =>
    screen.getByLabelText(/Arrastra archivos o haz clic/i)

  const stagePdf = (fileName: string, lastModified = 1_700_000_000_000) => {
    const input = getFileInput()
    const file = new File(["%PDF"], fileName, {
      type: "application/pdf",
      lastModified,
    })
    fireEvent.change(input, { target: { files: [file] } })
    return file
  }

  const dropFiles = (files: File[]) => {
    const dropzone = getDropzone()
    const dataTransfer = {
      files,
      items: files.map((file) => ({
        kind: "file",
        type: file.type,
        getAsFile: () => file,
      })),
      types: ["Files"],
    }
    fireEvent.drop(dropzone, { dataTransfer })
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

  it("limpia el input nativo tras Quitar todos", () => {
    renderWithIntl(<DocumentsUploadZone />)

    stagePdf("CV-epoch.pdf")
    const input = getFileInput()
    fireEvent.click(screen.getByRole("button", { name: "Quitar todos" }))
    expect(input.value).toBe("")
  })

  it("vuelve a mostrar un archivo tras Quitar todos y subir el mismo nombre", () => {
    const onFilesChange = vi.fn()
    renderWithIntl(<DocumentsUploadZone onFilesChange={onFilesChange} />)

    const shared = new File(["%PDF"], "CV-reupload.pdf", {
      type: "application/pdf",
      lastModified: 1_700_000_000_000,
    })
    fireEvent.change(getFileInput(), { target: { files: [shared] } })
    expect(screen.getByText("CV-reupload.pdf")).toBeInTheDocument()
    expect(screen.getByText("1 archivo seleccionado")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Quitar todos" }))
    expect(screen.queryByText("CV-reupload.pdf")).not.toBeInTheDocument()
    expect(screen.queryByText(/archivo seleccionado/)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/ya está en la lista|ya estaban en la lista/i),
    ).not.toBeInTheDocument()

    fireEvent.change(getFileInput(), { target: { files: [shared] } })
    expect(screen.getByText("CV-reupload.pdf")).toBeInTheDocument()
    expect(screen.getByText("1 archivo seleccionado")).toBeInTheDocument()
    expect(
      screen.queryByText(/ya está en la lista|ya estaban en la lista/i),
    ).not.toBeInTheDocument()
    expect(onFilesChange).toHaveBeenCalled()
    const lastCall = onFilesChange.mock.calls.at(-1)?.[0] as File[]
    expect(lastCall).toHaveLength(1)
    expect(lastCall[0]?.name).toBe("CV-reupload.pdf")
  })

  it("vuelve a listar los mismos File tras Quitar todos vía drop", () => {
    renderWithIntl(<DocumentsUploadZone />)

    const shared = new File(["%PDF"], "CV_Jose_Portillo.pdf", {
      type: "application/pdf",
      lastModified: 1_700_000_000_000,
    })
    dropFiles([shared])
    expect(screen.getByText("CV_Jose_Portillo.pdf")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Quitar todos" }))
    expect(screen.queryByText("CV_Jose_Portillo.pdf")).not.toBeInTheDocument()

    dropFiles([shared])
    expect(screen.getByText("CV_Jose_Portillo.pdf")).toBeInTheDocument()
    expect(screen.getByText("1 archivo seleccionado")).toBeInTheDocument()
    expect(
      screen.queryByText("Ese archivo ya está en la lista."),
    ).not.toBeInTheDocument()
  })

  it("no permite encolar el mismo archivo dos veces", () => {
    renderWithIntl(<DocumentsUploadZone />)

    const shared = new File(["%PDF"], "CV_Jose_Portillo.pdf", {
      type: "application/pdf",
      lastModified: 1_700_000_000_000,
    })

    fireEvent.change(getFileInput(), { target: { files: [shared] } })
    expect(screen.getByText("CV_Jose_Portillo.pdf")).toBeInTheDocument()
    expect(screen.getByText("1 archivo seleccionado")).toBeInTheDocument()

    fireEvent.change(getFileInput(), { target: { files: [shared] } })
    expect(screen.getByText("1 archivo seleccionado")).toBeInTheDocument()
    expect(
      screen.getByText("Ese archivo ya está en la lista."),
    ).toBeInTheDocument()
    expect(screen.getAllByText("CV_Jose_Portillo.pdf")).toHaveLength(1)
  })

  it("vuelve a encolar tras quitar un solo archivo con el mismo File", () => {
    renderWithIntl(<DocumentsUploadZone />)

    const shared = new File(["%PDF"], "CV_unico.pdf", {
      type: "application/pdf",
      lastModified: 1_700_000_000_000,
    })
    fireEvent.change(getFileInput(), { target: { files: [shared] } })
    expect(screen.getByText("CV_unico.pdf")).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("button", { name: /Quitar CV_unico\.pdf/i }),
    )
    expect(screen.queryByText("CV_unico.pdf")).not.toBeInTheDocument()

    fireEvent.change(getFileInput(), { target: { files: [shared] } })
    expect(screen.getByText("CV_unico.pdf")).toBeInTheDocument()
    expect(
      screen.queryByText(/ya está en la lista|ya estaban en la lista/i),
    ).not.toBeInTheDocument()
  })

  it("tras Quitar todos, un drop inmediato no marca duplicado falso", () => {
    renderWithIntl(<DocumentsUploadZone />)

    const shared = new File(["%PDF"], "CV_race.pdf", {
      type: "application/pdf",
      lastModified: 1_700_000_000_000,
    })
    dropFiles([shared])
    expect(screen.getByText("CV_race.pdf")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Quitar todos" }))
    dropFiles([shared])

    expect(screen.getByText("CV_race.pdf")).toBeInTheDocument()
    expect(screen.getByText("1 archivo seleccionado")).toBeInTheDocument()
    expect(
      screen.queryByText("Ese archivo ya está en la lista."),
    ).not.toBeInTheDocument()
  })

  it("permite subir y quitar el mismo PDF muchas veces seguidas", () => {
    renderWithIntl(<DocumentsUploadZone />)

    const shared = new File(["%PDF"], "CV_ciclo.pdf", {
      type: "application/pdf",
      lastModified: 1_700_000_000_000,
    })

    for (let cycle = 0; cycle < 12; cycle++) {
      fireEvent.change(getFileInput(), { target: { files: [shared] } })
      expect(screen.getByText("CV_ciclo.pdf")).toBeInTheDocument()
      expect(
        screen.queryByText(/ya está en la lista|ya estaban en la lista/i),
      ).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole("button", { name: "Quitar todos" }))
      expect(screen.queryByText("CV_ciclo.pdf")).not.toBeInTheDocument()
    }

    dropFiles([shared])
    expect(screen.getByText("CV_ciclo.pdf")).toBeInTheDocument()
    expect(screen.getByText("1 archivo seleccionado")).toBeInTheDocument()
  })

  it("acepta drop cuando solo vienen items de DataTransfer", () => {
    renderWithIntl(<DocumentsUploadZone />)

    const shared = new File(["%PDF"], "CV_items.pdf", {
      type: "application/pdf",
      lastModified: 1_700_000_000_000,
    })
    const dropzone = getDropzone()
    const dataTransfer = {
      files: [] as File[],
      items: [
        {
          kind: "file",
          type: shared.type,
          getAsFile: () => shared,
        },
      ],
      types: ["Files"],
    }
    fireEvent.drop(dropzone, { dataTransfer })
    expect(screen.getByText("CV_items.pdf")).toBeInTheDocument()
  })
})
