import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasQuestionEditor } from "@/components/pruebas/questions/pruebas-question-editor"
import { PruebasQuestionsList } from "@/components/pruebas/questions/pruebas-questions-list"
import esMessages from "@/messages/es.json"
import { MOCK_IDS } from "@/lib/pruebas/mock-fixtures"
import {
  listQuestions,
  resetMockStore,
  setMockScenario,
} from "@/lib/pruebas/mock-service"

const pushMock = vi.fn()
const searchParamsGet = vi.fn(() => null)

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: searchParamsGet,
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

function renderWithIntl(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  resetMockStore()
  setMockScenario("populated")
  pushMock.mockReset()
  searchParamsGet.mockReturnValue(null)
})

afterEach(() => {
  resetMockStore()
})

describe("PruebasQuestionsList UI", () => {
  it("lists seeded questions and opens candidate preview", async () => {
    renderWithIntl(<PruebasQuestionsList />)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Banco de preguntas" })).toBeInTheDocument()
    })

    expect(await screen.findAllByTestId("question-row")).not.toHaveLength(0)

    const rows = screen.getAllByTestId("question-row")
    const firstPreview = within(rows[0]!).getByRole("button", {
      name: "Vista previa",
    })
    fireEvent.click(firstPreview)

    expect(
      await screen.findByTestId("question-candidate-preview"),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Así verá el candidato la pregunta/i),
    ).toBeInTheDocument()
  })
})

describe("PruebasQuestionEditor UI", () => {
  it("validates empty create form and saves a single choice", async () => {
    const before = (await listQuestions()).length
    renderWithIntl(<PruebasQuestionEditor mode="create" />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Nueva pregunta" }),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))
    expect(await screen.findByText("Escribe un enunciado.")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Enunciado"), {
      target: { value: "Pregunta de banco demo" },
    })
    const optionInputs = screen.getAllByLabelText(/Texto de la opción/)
    fireEvent.change(optionInputs[0]!, { target: { value: "Opción A" } })
    fireEvent.change(optionInputs[1]!, { target: { value: "Opción B" } })

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringContaining("/portal-pruebas/preguntas?saved=1"),
      )
    })
    expect((await listQuestions()).length).toBe(before + 1)
  })

  it("hides points when switching to likert and shows published warning on seed edit", async () => {
    renderWithIntl(
      <PruebasQuestionEditor mode="edit" questionId={MOCK_IDS.qSingle} />,
    )

    await waitFor(() => {
      expect(screen.getByLabelText("Tipo de pregunta")).toBeInTheDocument()
    })

    expect(
      screen.getByText(/forma parte de al menos una versión publicada/i),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Tipo de pregunta"), {
      target: { value: "likert" },
    })

    await waitFor(() => {
      expect(screen.getByLabelText("Dimensión")).toBeInTheDocument()
    })
    expect(screen.queryByLabelText("Puntos")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Respuesta correcta")).not.toBeInTheDocument()
  })

  it("asks confirmation when canceling with unsaved changes", async () => {
    renderWithIntl(<PruebasQuestionEditor mode="create" />)

    await waitFor(() => {
      expect(screen.getByLabelText("Enunciado")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Enunciado"), {
      target: { value: "Cambio sin guardar" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(
      await screen.findByRole("heading", { name: "Descartar cambios" }),
    ).toBeInTheDocument()
  })
})
