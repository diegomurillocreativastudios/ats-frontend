import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"

import { InterviewFeedbackModal } from "@/components/rrhh/interview-feedback-modal"
import esMessages from "@/messages/es.json"

const submitInterviewFeedback = vi.fn()

vi.mock("@/lib/api/interview-feedback", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/interview-feedback")>()
  return {
    ...actual,
    submitInterviewFeedback: (...args: unknown[]) =>
      submitInterviewFeedback(...args),
  }
})

function renderModal(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe("InterviewFeedbackModal", () => {
  beforeEach(() => {
    submitInterviewFeedback.mockReset()
  })

  it("does not submit empty or whitespace-only feedback", () => {
    const onComplete = vi.fn()
    renderModal(
      <InterviewFeedbackModal
        isOpen
        onClose={vi.fn()}
        applicationId="app-1"
        onComplete={onComplete}
      />
    )

    const submit = screen.getByRole("button", { name: "Enviar" })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByLabelText("Feedback"), {
      target: { value: "   " },
    })
    expect(submit).toBeDisabled()
    expect(submitInterviewFeedback).not.toHaveBeenCalled()
  })

  it("disables submit while the request is in flight", async () => {
    let resolvePost: ((value: unknown) => void) | undefined
    submitInterviewFeedback.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve
        })
    )
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

    fireEvent.change(screen.getByLabelText("Feedback"), {
      target: { value: "Buena comunicación" },
    })
    const submit = screen.getByRole("button", { name: "Enviar" })
    fireEvent.click(submit)
    fireEvent.click(submit)

    expect(await screen.findByRole("button", { name: "Enviando…" })).toBeDisabled()
    expect(submitInterviewFeedback).toHaveBeenCalledTimes(1)

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
    expect(onClose).toHaveBeenCalled()
  })

  it("refreshes the board on 409 without retrying", async () => {
    submitInterviewFeedback.mockRejectedValueOnce({
      status: 409,
      body: { message: "The application is not in the interview stage." },
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

    fireEvent.change(screen.getByLabelText("Feedback"), {
      target: { value: "Notas del reclutador" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith({
        variant: "error",
        message:
          "La postulación ya no se encuentra en la etapa de entrevista. El tablero será actualizado.",
        shouldRefresh: true,
      })
    })
    expect(onClose).toHaveBeenCalled()
    expect(submitInterviewFeedback).toHaveBeenCalledTimes(1)
  })
})
