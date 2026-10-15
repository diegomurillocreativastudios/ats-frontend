import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasEvaluationEditor } from "@/components/pruebas/evaluations/pruebas-evaluation-editor"
import esMessages from "@/messages/es.json"
import type { AssessmentTestDetailView } from "@/lib/api/recruiter-assessments-tests"

const createAssessmentTest = vi.fn()
const updateAssessmentTest = vi.fn()
const getAssessmentTestDetail = vi.fn()
const createAssessmentQuestion = vi.fn()
const openAssessmentTestDraft = vi.fn()
const publishAssessmentTest = vi.fn()
const deleteAssessmentQuestion = vi.fn()
const reorderAssessmentQuestions = vi.fn()

vi.mock("@/lib/api/recruiter-assessments-tests", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/recruiter-assessments-tests")
  >("@/lib/api/recruiter-assessments-tests")
  return {
    ...actual,
    createAssessmentTest: (...args: unknown[]) => createAssessmentTest(...args),
    updateAssessmentTest: (...args: unknown[]) => updateAssessmentTest(...args),
    getAssessmentTestDetail: (...args: unknown[]) =>
      getAssessmentTestDetail(...args),
    createAssessmentQuestion: (...args: unknown[]) =>
      createAssessmentQuestion(...args),
    openAssessmentTestDraft: (...args: unknown[]) =>
      openAssessmentTestDraft(...args),
    publishAssessmentTest: (...args: unknown[]) =>
      publishAssessmentTest(...args),
    deleteAssessmentQuestion: (...args: unknown[]) =>
      deleteAssessmentQuestion(...args),
    reorderAssessmentQuestions: (...args: unknown[]) =>
      reorderAssessmentQuestions(...args),
  }
})

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

function publishedDetail(): AssessmentTestDetailView {
  return {
    test: {
      id: "t-pub",
      title: "Razonamiento lógico",
      description: "Desc",
      kind: "technical",
      lifecycleStatus: "published",
      draftVersion: 1,
      createdAt: "2026-09-01T00:00:00Z",
    },
    openDraft: null,
    versions: [
      {
        id: "v1",
        testId: "t-pub",
        versionNumber: 1,
        instructions: "Lee",
        durationMinutes: 45,
        maxAttempts: 1,
        publishedAt: "2026-09-01T00:00:00Z",
        questionIds: ["q1"],
      },
    ],
    currentQuestions: [
      {
        id: "q1",
        kind: "single_choice",
        prompt: "Q1",
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        correctOptionId: "a",
        points: 1,
      },
    ],
  }
}

function draftAfterClone(): AssessmentTestDetailView {
  const base = publishedDetail()
  return {
    test: { ...base.test, lifecycleStatus: "draft" },
    openDraft: {
      id: "vd",
      testId: "t-pub",
      versionNumber: 1,
      instructions: "Lee",
      durationMinutes: 45,
      maxAttempts: 1,
      questionIds: ["q1"],
    },
    versions: [
      ...base.versions,
      {
        id: "vd",
        testId: "t-pub",
        versionNumber: 1,
        instructions: "Lee",
        durationMinutes: 45,
        maxAttempts: 1,
        questionIds: ["q1"],
      },
    ],
    currentQuestions: base.currentQuestions,
  }
}

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
  replaceMock.mockReset()
  pushMock.mockReset()
  createAssessmentTest.mockReset()
  updateAssessmentTest.mockReset()
  getAssessmentTestDetail.mockReset()
  createAssessmentQuestion.mockReset()
  openAssessmentTestDraft.mockReset()
  publishAssessmentTest.mockReset()
  deleteAssessmentQuestion.mockReset()
  reorderAssessmentQuestions.mockReset()

  createAssessmentTest.mockResolvedValue({
    id: "t-new",
    title: "Prueba técnica demo",
    description: "Descripción",
    kind: "technical",
    lifecycleStatus: "draft",
    draftVersion: 0,
    createdAt: "2026-10-14T00:00:00Z",
  })
  updateAssessmentTest.mockImplementation(async (id: string, input: { title?: string }) => ({
    id,
    title: input.title ?? "Prueba técnica demo",
    description: "Descripción",
    kind: "technical" as const,
    lifecycleStatus: "draft" as const,
    draftVersion: 0,
    createdAt: "2026-10-14T00:00:00Z",
  }))
  getAssessmentTestDetail.mockResolvedValue({
    test: {
      id: "t-new",
      title: "Prueba técnica demo",
      description: "Descripción",
      kind: "technical",
      lifecycleStatus: "draft",
      draftVersion: 0,
      createdAt: "2026-10-14T00:00:00Z",
    },
    openDraft: {
      id: "vd",
      testId: "t-new",
      versionNumber: 1,
      instructions: "Lee con calma.",
      durationMinutes: 45,
      maxAttempts: 1,
      questionIds: [],
    },
    versions: [],
    currentQuestions: [],
  })
  createAssessmentQuestion.mockResolvedValue({
    id: "q-new",
    kind: "single_choice",
    prompt: "Selecciona la opción correcta.",
    options: [
      { id: "opt-a", label: "Opción A" },
      { id: "opt-b", label: "Opción B" },
    ],
    correctOptionId: "opt-a",
    points: 1,
  })
})

afterEach(() => {
  vi.clearAllMocks()
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

    fireEvent.click(screen.getByRole("button", { name: /Crear pregunta mínima/i }))

    await waitFor(() => {
      expect(createAssessmentQuestion).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }))

    await waitFor(() => {
      expect(screen.getByText("Borrador guardado.")).toBeInTheDocument()
    })
    expect(replaceMock).toHaveBeenCalled()
  })

  it("keeps form values when save fails", async () => {
    createAssessmentTest.mockRejectedValueOnce(new Error("boom"))
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
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }))

    await waitFor(() => {
      expect(screen.getByText("boom")).toBeInTheDocument()
    })
    expect(screen.getByLabelText("Nombre")).toHaveValue("Conservar título")
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it("asks to clone when editing a published test", async () => {
    getAssessmentTestDetail.mockResolvedValueOnce(publishedDetail())
    openAssessmentTestDraft.mockResolvedValueOnce(draftAfterClone())

    renderEditor({ mode: "edit", testId: "t-pub" })

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
      expect(openAssessmentTestDraft).toHaveBeenCalledWith("t-pub")
      expect(
        screen.getByText("Se creó un borrador a partir de la versión publicada."),
      ).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByLabelText("Nombre")).toHaveValue("Razonamiento lógico")
    })
  })

  it("shows not found for archived evaluations", async () => {
    getAssessmentTestDetail.mockResolvedValueOnce({
      test: {
        id: "t-arch",
        title: "Archived",
        description: "x",
        kind: "technical",
        lifecycleStatus: "archived",
        draftVersion: 1,
        createdAt: "2026-01-01T00:00:00Z",
      },
      openDraft: null,
      versions: [],
      currentQuestions: [],
    })

    renderEditor({ mode: "edit", testId: "t-arch" })

    await waitFor(() => {
      expect(screen.getByText("Evaluación no encontrada")).toBeInTheDocument()
    })
  })
})
