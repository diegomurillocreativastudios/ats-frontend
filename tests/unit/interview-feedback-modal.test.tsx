import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"

import { InterviewFeedbackModal } from "@/components/rrhh/interview-feedback-modal"
import esMessages from "@/messages/es.json"

const submitInterviewFeedback = vi.fn()
const fetchInterviewFeedbackForm = vi.fn()

vi.mock("@/lib/api/interview-feedback", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/interview-feedback")>()
  return {
    ...actual,
    submitInterviewFeedback: (...args: unknown[]) =>
      submitInterviewFeedback(...args),
    fetchInterviewFeedbackForm: (...args: unknown[]) =>
      fetchInterviewFeedbackForm(...args),
  }
})

function renderModal(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

const emptyForm = {
  interviewDone: true,
  softSkills: [] as Array<{
    id: string
    code: string
    displayName: string
    sortOrder: number
  }>,
  technicalSkills: [] as Array<{
    requirementKey: string
    expectedValue: string
  }>,
  entries: [] as unknown[],
}

describe("InterviewFeedbackModal", () => {
  beforeEach(() => {
    submitInterviewFeedback.mockReset()
    fetchInterviewFeedbackForm.mockReset()
    fetchInterviewFeedbackForm.mockResolvedValue(emptyForm)
  })

  it("does not submit empty or whitespace-only feedback", async () => {
    const onComplete = vi.fn()
    renderModal(
      <InterviewFeedbackModal
        isOpen
        onClose={vi.fn()}
        applicationId="app-1"
        onComplete={onComplete}
      />
    )

    await screen.findByLabelText("Comentario")
    const submit = screen.getByRole("button", { name: "Guardar evaluación" })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByLabelText("Comentario"), {
      target: { value: "   " },
    })
    expect(submit).toBeDisabled()
    expect(submitInterviewFeedback).not.toHaveBeenCalled()
  })

  it("loads the form on open and keeps the modal open after a successful submit", async () => {
    let resolvePost: ((value: unknown) => void) | undefined
    submitInterviewFeedback.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve
        })
    )
    fetchInterviewFeedbackForm
      .mockResolvedValueOnce(emptyForm)
      .mockResolvedValueOnce({
        ...emptyForm,
        entries: [
          {
            id: "entry-1",
            feedback: "Buena comunicación",
            createdBy: "recruiter",
            createdAt: "2026-09-18T12:00:00Z",
            previousMatchScore: 0.73,
            matchScore: 0.79,
            delta: 0.06,
            softSkills: [],
            technicalSkills: [],
          },
        ],
      })
    const onComplete = vi.fn()
    const onClose = vi.fn()

    renderModal(
      <InterviewFeedbackModal
        isOpen
        onClose={onClose}
        applicationId="app-1"
        onComplete={onComplete}
      />
    )

    fireEvent.change(await screen.findByLabelText("Comentario"), {
      target: { value: "Buena comunicación" },
    })
    const submit = screen.getByRole("button", { name: "Guardar evaluación" })
    fireEvent.click(submit)
    fireEvent.click(submit)

    expect(await screen.findByRole("button", { name: "Guardando…" })).toBeDisabled()
    expect(submitInterviewFeedback).toHaveBeenCalledTimes(1)
    expect(submitInterviewFeedback).toHaveBeenCalledWith("app-1", {
      feedback: "Buena comunicación",
      softSkills: [],
      technicalSkills: [],
    })

    resolvePost?.({
      previousMatchScore: 0.73,
      matchScore: 0.79,
      delta: 0.06,
      qualitativeWeight: 0.2,
    })

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "success",
          shouldRefresh: true,
        })
      )
    })
    expect(onComplete.mock.calls[0]?.[0].message).toContain("73%")
    expect(onComplete.mock.calls[0]?.[0].message).toContain("79%")
    expect(onComplete.mock.calls[0]?.[0].message).toContain("+6")
    expect(onClose).not.toHaveBeenCalled()
    expect(fetchInterviewFeedbackForm).toHaveBeenCalledTimes(2)
    expect(await screen.findByText(/Historial de feedback/)).toBeInTheDocument()
  })

  it("refreshes the board on 409 without retrying", async () => {
    submitInterviewFeedback.mockRejectedValueOnce({
      status: 409,
      body: {
        code: "not_interview_stage",
        message: "The application is not in the interview stage.",
      },
    })
    const onComplete = vi.fn()
    const onClose = vi.fn()

    renderModal(
      <InterviewFeedbackModal
        isOpen
        onClose={onClose}
        applicationId="app-1"
        onComplete={onComplete}
      />
    )

    fireEvent.change(await screen.findByLabelText("Comentario"), {
      target: { value: "Notas del reclutador" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar evaluación" }))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith({
        variant: "error",
        message:
          "El feedback solo aplica en la etapa Entrevista.",
        shouldRefresh: true,
      })
    })
    expect(onClose).toHaveBeenCalled()
    expect(submitInterviewFeedback).toHaveBeenCalledTimes(1)
  })

  it("requires every soft and technical score before submitting", async () => {
    fetchInterviewFeedbackForm.mockResolvedValueOnce({
      interviewDone: true,
      softSkills: [
        {
          id: "soft-1",
          code: "comunicacion",
          displayName: "Comunicación",
          sortOrder: 1,
        },
      ],
      technicalSkills: [
        { requirementKey: "reactjs", expectedValue: "Avanzado" },
      ],
      entries: [],
    })

    renderModal(
      <InterviewFeedbackModal
        isOpen
        onClose={vi.fn()}
        applicationId="app-1"
        onComplete={vi.fn()}
      />
    )

    fireEvent.change(await screen.findByLabelText("Comentario"), {
      target: { value: "Notas" },
    })
    expect(screen.getByRole("button", { name: "Guardar evaluación" })).toBeDisabled()
    expect(screen.getByText("1–3 bajo · 4–6 medio · 7–8 alto · 9–10 excelente")).toBeInTheDocument()
    expect(screen.getByText("0 de 2 habilidades · comentario listo")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("radio", { name: "Comunicación: 8" }))
    expect(screen.getByRole("button", { name: "Guardar evaluación" })).toBeDisabled()
    expect(screen.getByText("1 de 2 habilidades · comentario listo")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("radio", { name: "React.js: 7" }))
    expect(screen.getByRole("button", { name: "Guardar evaluación" })).not.toBeDisabled()
    expect(screen.getByText("2 de 2 habilidades · comentario listo")).toBeInTheDocument()
    expect(screen.getByText("Avanzado")).toBeInTheDocument()
  })

  it("shows candidate and vacancy context in the header", async () => {
    renderModal(
      <InterviewFeedbackModal
        isOpen
        onClose={vi.fn()}
        applicationId="app-1"
        candidateLabel="Camila Rivas Navarro"
        vacancyLabel="Desarrollador frontend"
        onComplete={vi.fn()}
      />
    )

    await screen.findByLabelText("Comentario")
    expect(screen.getByText("Camila Rivas Navarro")).toBeInTheDocument()
    expect(screen.getByText("Desarrollador frontend")).toBeInTheDocument()
  })

  it("separa nombre y correo como en administrar entrevista", async () => {
    renderModal(
      <InterviewFeedbackModal
        isOpen
        onClose={vi.fn()}
        applicationId="app-1"
        candidateLabel="Diego Murillo - diegomurillo@example.com"
        vacancyLabel="React Frontend Dev"
        onComplete={vi.fn()}
      />
    )

    await screen.findByLabelText("Comentario")
    expect(screen.getByText("Diego Murillo")).toBeInTheDocument()
    expect(screen.getByText("diegomurillo@example.com")).toBeInTheDocument()
    expect(
      screen.queryByText("Diego Murillo - diegomurillo@example.com")
    ).not.toBeInTheDocument()
    expect(screen.getByText("React Frontend Dev")).toBeInTheDocument()
  })
})
