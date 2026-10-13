import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasEvaluationEditor } from "@/components/pruebas/evaluations/pruebas-evaluation-editor"
import esMessages from "@/messages/es.json"
import { MOCK_IDS } from "@/lib/pruebas/mock-fixtures"
import {
  getTest,
  listVersions,
  resetMockStore,
  setMockScenario,
} from "@/lib/pruebas/mock-service"

const replaceMock = vi.fn()
const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: pushMock,
  }),
}))

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: ReactNode
    className?: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

function renderEditor(
  props: { mode: "create" | "edit"; testId?: string } = { mode: "create" },
) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <PruebasEvaluationEditor {...props} />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  resetMockStore()
  setMockScenario("populated")
  replaceMock.mockReset()
  pushMock.mockReset()
})

afterEach(() => {
  resetMockStore()
})

describe("PruebasEvaluationEditor UI", () => {
  it("blocks next on empty info and saves a draft after filling required fields", async () => {
    renderEditor({ mode: "create" })

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Nueva evaluación" }),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }))
    expect(await screen.findByText("Escribe un nombre.")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Prueba técnica demo" },
    })
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Descripción de demostración" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }))

    await waitFor(() => {
      expect(screen.getByLabelText("Instrucciones")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Instrucciones"), {
      target: { value: "Lee con calma." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }))

    await waitFor(() => {
      expect(screen.getByText("Preguntas de la evaluación")).toBeInTheDocument()
    })

    const attachButtons = screen.getAllByRole("button", { name: "Añadir" })
    fireEvent.click(attachButtons[0]!)

    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }))

    await waitFor(() => {
      expect(
        screen.getByText("Borrador guardado en modo demostración."),
      ).toBeInTheDocument()
    })
    expect(replaceMock).toHaveBeenCalled()
  })

  it("simulates save failure without clearing the form", async () => {
    renderEditor({ mode: "create" })

    await waitFor(() => {
      expect(screen.getByLabelText("Nombre")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Conservar título" },
    })
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Conservar descripción" },
    })
    fireEvent.click(screen.getByLabelText("Simular fallo de guardado"))
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }))

    await waitFor(() => {
      expect(
        screen.getByText(
          "No se pudo guardar el borrador de demostración. Revisa e intenta de nuevo.",
        ),
      ).toBeInTheDocument()
    })
    expect(screen.getByLabelText("Nombre")).toHaveValue("Conservar título")
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it("asks to clone when editing a published test and keeps v1 frozen", async () => {
    renderEditor({ mode: "edit", testId: MOCK_IDS.testTechnical })

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", {
          name: /Crear borrador desde la versión publicada/i,
        }),
      ).toBeInTheDocument()
    })

    const dialog = screen.getByRole("dialog")
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Crear borrador" }),
    )

    await waitFor(() => {
      expect(
        screen.getByText("Se creó un borrador a partir de la versión publicada."),
      ).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByLabelText("Nombre")).toHaveValue("Razonamiento lógico")
    })

    const versions = await listVersions(MOCK_IDS.testTechnical)
    const v1 = versions.find((version) => version.id === MOCK_IDS.versionTechnicalV1)
    expect(v1?.publishedAt).toBeTruthy()
    expect(v1?.versionNumber).toBe(1)

    const test = await getTest(MOCK_IDS.testTechnical)
    expect(test.lifecycleStatus).toBe("draft")
  })

  it("shows not found for archived evaluations", async () => {
    renderEditor({ mode: "edit", testId: MOCK_IDS.testArchived })

    await waitFor(() => {
      expect(screen.getByText("Evaluación no encontrada")).toBeInTheDocument()
    })
  })
})
