import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasQuestionEditor } from "@/components/pruebas/questions/pruebas-question-editor"
import { PruebasQuestionsList } from "@/components/pruebas/questions/pruebas-questions-list"
import esMessages from "@/messages/es.json"

const pushMock = vi.fn()
const replaceMock = vi.fn()
const searchParamsGet = vi.fn((key: string) => {
  if (key === "testId") return "t1"
  return null
})
const searchParamsToString = vi.fn(() => "testId=t1")

const {
  listTestsMock,
  listQuestionsMock,
  getQuestionMock,
  createMock,
  updateMock,
} = vi.hoisted(() => ({
  listTestsMock: vi.fn(),
  listQuestionsMock: vi.fn(),
  getQuestionMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useSearchParams: () => ({
    get: searchParamsGet,
    toString: searchParamsToString,
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

vi.mock("@/lib/api/recruiter-assessments-questions", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/recruiter-assessments-questions")
  >("@/lib/api/recruiter-assessments-questions")
  return {
    ...actual,
    listAssessmentTestsForBank: (...args: unknown[]) => listTestsMock(...args),
    listQuestionsForTest: (...args: unknown[]) => listQuestionsMock(...args),
    getQuestionForTest: (...args: unknown[]) => getQuestionMock(...args),
    createQuestionForTest: (...args: unknown[]) => createMock(...args),
    updateQuestionForTest: (...args: unknown[]) => updateMock(...args),
  }
})

const sampleQuestion = {
  id: "q-1",
  kind: "single_choice" as const,
  prompt: "¿Cuál es la respuesta?",
  options: [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
  ],
  correctOptionId: "a",
  points: 2,
}

function renderWithIntl(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  pushMock.mockReset()
  replaceMock.mockReset()
  searchParamsGet.mockImplementation((key: string) => {
    if (key === "testId") return "t1"
    return null
  })
  searchParamsToString.mockReturnValue("testId=t1")
  listTestsMock.mockReset()
  listQuestionsMock.mockReset()
  getQuestionMock.mockReset()
  createMock.mockReset()
  updateMock.mockReset()
  listTestsMock.mockResolvedValue([
    {
      id: "t1",
      title: "Evaluación demo",
      description: "",
      kind: "technical",
      lifecycleStatus: "draft",
      draftVersion: 1,
      createdAt: "2026-01-01T00:00:00Z",
    },
  ])
  listQuestionsMock.mockResolvedValue({
    test: { id: "t1", title: "Evaluación demo" },
    questions: [sampleQuestion],
    hasOpenDraft: true,
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("PruebasQuestionsList UI", () => {
  it("lists questions for the selected test and opens preview", async () => {
    renderWithIntl(<PruebasQuestionsList />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Banco de preguntas" }),
      ).toBeInTheDocument()
    })

    expect(await screen.findAllByTestId("question-row")).toHaveLength(1)
    expect(listQuestionsMock).toHaveBeenCalledWith("t1")

    const rows = screen.getAllByTestId("question-row")
    fireEvent.click(
      within(rows[0]!).getByRole("button", { name: "Vista previa" }),
    )
    expect(
      await screen.findByTestId("question-candidate-preview"),
    ).toBeInTheDocument()
  })

  it("hides numeric from the kind filter", async () => {
    renderWithIntl(<PruebasQuestionsList />)
    await screen.findByLabelText("Tipo")
    const kindSelect = screen.getByLabelText("Tipo")
    expect(
      within(kindSelect).queryByRole("option", { name: "Numérica" }),
    ).not.toBeInTheDocument()
  })
})

describe("PruebasQuestionEditor UI", () => {
  it("requires testId to create", async () => {
    searchParamsGet.mockReturnValue(null)
    renderWithIntl(<PruebasQuestionEditor mode="create" />)
    expect(
      await screen.findByRole("heading", { name: "Falta la evaluación" }),
    ).toBeInTheDocument()
  })

  it("validates and saves a question for the selected test", async () => {
    createMock.mockResolvedValue({ ...sampleQuestion, id: "created-1" })
    renderWithIntl(<PruebasQuestionEditor mode="create" />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Nueva pregunta" }),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))
    expect(await screen.findByText("Escribe un enunciado.")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Enunciado"), {
      target: { value: "Pregunta de banco" },
    })
    const optionInputs = screen.getAllByLabelText(/Texto de la opción/)
    fireEvent.change(optionInputs[0]!, { target: { value: "Opción A" } })
    fireEvent.change(optionInputs[1]!, { target: { value: "Opción B" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ prompt: "Pregunta de banco" }),
      )
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringContaining("testId=t1"),
      )
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringContaining("saved=1"),
      )
    })
  })

  it("redirects with cloned flag when update returns a new id", async () => {
    getQuestionMock.mockResolvedValue(sampleQuestion)
    updateMock.mockResolvedValue({ ...sampleQuestion, id: "cloned-id" })

    renderWithIntl(
      <PruebasQuestionEditor mode="edit" questionId="q-1" />,
    )

    await waitFor(() => {
      expect(screen.getByLabelText("Tipo de pregunta")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Tipo de pregunta"), {
      target: { value: "likert" },
    })
    await waitFor(() => {
      expect(screen.getByLabelText("Dimensión")).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText("Dimensión"), {
      target: { value: "Análisis" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringContaining("cloned=1"),
      )
    })
  })

  it("keeps written options when the question type changes", async () => {
    renderWithIntl(<PruebasQuestionEditor mode="create" />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Nueva pregunta" }),
      ).toBeInTheDocument()
    })

    const optionInputs = screen.getAllByLabelText(/Texto de la opción/)
    fireEvent.change(optionInputs[0]!, { target: { value: "Una librería" } })
    fireEvent.change(optionInputs[1]!, { target: { value: "Un lenguaje" } })
    fireEvent.click(screen.getByRole("button", { name: "Añadir opción" }))
    fireEvent.change(screen.getByLabelText("Texto de la opción 3"), {
      target: { value: "Un framework" },
    })

    fireEvent.change(screen.getByLabelText("Tipo de pregunta"), {
      target: { value: "multiple_choice" },
    })

    expect(screen.getByLabelText("Texto de la opción 1")).toHaveValue(
      "Una librería",
    )
    expect(screen.getByLabelText("Texto de la opción 2")).toHaveValue(
      "Un lenguaje",
    )
    expect(screen.getByLabelText("Texto de la opción 3")).toHaveValue(
      "Un framework",
    )

    fireEvent.change(screen.getByLabelText("Tipo de pregunta"), {
      target: { value: "true_false" },
    })
    expect(
      screen.queryByLabelText("Texto de la opción 1"),
    ).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Tipo de pregunta"), {
      target: { value: "single_choice" },
    })
    expect(screen.getByLabelText("Texto de la opción 1")).toHaveValue(
      "Una librería",
    )
    expect(screen.getByLabelText("Texto de la opción 2")).toHaveValue(
      "Un lenguaje",
    )
    expect(screen.getByLabelText("Texto de la opción 3")).toHaveValue(
      "Un framework",
    )
  })
})
