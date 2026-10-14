import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasCandidateScreen } from "@/components/pruebas/candidate/pruebas-candidate-screen"
import { PruebasTrackingScreen } from "@/components/pruebas/tracking/pruebas-tracking-screen"
import esMessages from "@/messages/es.json"
import { MOCK_IDS } from "@/lib/pruebas/mock-fixtures"
import {
  debugSnapshotStore,
  resetMockStore,
  setMockScenario,
} from "@/lib/pruebas/mock-service"
import { waitForDialogClosed } from "@/tests/helpers/wait-for-dialog-closed"

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: ReactNode
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
})

afterEach(() => {
  resetMockStore()
})

async function answerCurrentAndNext(options?: {
  submit?: boolean
}) {
  const form = await screen.findByTestId("candidate-question-form")
  const kind = form.getAttribute("data-kind")

  if (kind === "single_choice" || kind === "true_false" || kind === "likert") {
    const radios = within(form).getAllByRole("radio")
    fireEvent.click(radios[0]!)
  } else if (kind === "multiple_choice") {
    const boxes = within(form).getAllByRole("checkbox")
    fireEvent.click(boxes[0]!)
  } else if (kind === "numeric") {
    fireEvent.change(within(form).getByRole("spinbutton"), {
      target: { value: "30" },
    })
  } else if (kind === "open") {
    fireEvent.change(within(form).getByRole("textbox"), {
      target: { value: "Respuesta demo" },
    })
  }

  if (options?.submit) {
    fireEvent.click(screen.getByTestId("candidate-submit"))
  } else {
    fireEvent.click(screen.getByTestId("candidate-next"))
  }
}

describe("PruebasCandidateScreen UI", () => {
  it("blocks unknown tokens", async () => {
    renderWithIntl(<PruebasCandidateScreen demoToken="asg-missing" />)
    await waitFor(() => {
      expect(screen.getByTestId("candidate-blocked-invalid")).toBeInTheDocument()
    })
  })

  it("shows expired for Carlos", async () => {
    renderWithIntl(
      <PruebasCandidateScreen demoToken={MOCK_IDS.assignmentCarlosExpired} />,
    )
    await waitFor(() => {
      expect(screen.getByTestId("candidate-blocked-expired")).toBeInTheDocument()
    })
  })

  it("restores Ana saved answer", async () => {
    renderWithIntl(
      <PruebasCandidateScreen demoToken={MOCK_IDS.assignmentAnaInProgress} />,
    )
    await waitFor(() => {
      expect(screen.getByTestId("candidate-taking")).toBeInTheDocument()
    })
    const form = screen.getByTestId("candidate-question-form")
    const checked = within(form).getByRole("radio", { checked: true })
    expect(checked).toHaveAttribute("value", "opt-b")
  })

  it("does not advance Maria with an empty answer", async () => {
    renderWithIntl(
      <PruebasCandidateScreen demoToken={MOCK_IDS.assignmentMariaDup} />,
    )
    await waitFor(() => {
      expect(screen.getByTestId("candidate-welcome")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId("candidate-start"))
    await waitFor(() => {
      expect(screen.getByTestId("candidate-taking")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId("candidate-next"))
    expect(screen.getByTestId("candidate-required-error")).toBeInTheDocument()
  })

  it("simulates save failure without writing the session", async () => {
    renderWithIntl(
      <PruebasCandidateScreen demoToken={MOCK_IDS.assignmentAnaInProgress} />,
    )
    await waitFor(() => {
      expect(screen.getByTestId("candidate-taking")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId("candidate-simulate-save-failure"))
    fireEvent.click(screen.getByTestId("candidate-next"))
    await waitFor(() => {
      expect(screen.getByTestId("candidate-save-error")).toBeInTheDocument()
    })
    const answers = debugSnapshotStore().sessions.find(
      (session) => session.id === MOCK_IDS.sessionAnaInProgress,
    )?.answers
    expect(answers).toEqual([{ questionId: MOCK_IDS.qSingle, value: "opt-b" }])
  })

  it("simulates time up and blocks submit", async () => {
    renderWithIntl(
      <PruebasCandidateScreen demoToken={MOCK_IDS.assignmentAnaInProgress} />,
    )
    await waitFor(() => {
      expect(screen.getByTestId("candidate-taking")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId("candidate-simulate-time-up"))
    await waitFor(() => {
      expect(screen.getByTestId("candidate-blocked-time_up")).toBeInTheDocument()
    })
  })

  it("walks Maria from welcome to confirmed submit without scores", async () => {
    renderWithIntl(
      <PruebasCandidateScreen demoToken={MOCK_IDS.assignmentMariaDup} />,
    )
    await waitFor(() => {
      expect(screen.getByTestId("candidate-welcome")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId("candidate-start"))
    await waitFor(() => {
      expect(screen.getByTestId("candidate-taking")).toBeInTheDocument()
    })

    for (let index = 0; index < 5; index += 1) {
      await answerCurrentAndNext()
      await waitFor(() => {
        expect(screen.getByTestId("candidate-question-form")).toBeInTheDocument()
      })
    }
    await answerCurrentAndNext({ submit: true })

    const dialog = await screen.findByRole("dialog", {
      name: "Enviar evaluación",
    })
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar" }))

    await waitFor(() => {
      expect(screen.getByTestId("candidate-done")).toBeInTheDocument()
    })
    expect(screen.queryByText(/puntaje/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument()
    expect(
      debugSnapshotStore().assignments.find(
        (item) => item.id === MOCK_IDS.assignmentMariaDup,
      )?.status,
    ).toBe("completed")

    await waitForDialogClosed("Enviar evaluación")
  })
})

describe("tracking entry to candidate demo", () => {
  it("links each detail to the candidate experience", async () => {
    renderWithIntl(<PruebasTrackingScreen />)
    await waitFor(() => {
      expect(
        screen.getAllByTestId(`tracking-open-${MOCK_IDS.assignmentMariaDup}`)
          .length,
      ).toBeGreaterThan(0)
    })
    fireEvent.click(
      screen.getAllByTestId(`tracking-open-${MOCK_IDS.assignmentMariaDup}`)[0]!,
    )
    await waitFor(() => {
      expect(screen.getByTestId("tracking-open-candidate")).toHaveAttribute(
        "href",
        `/pruebas/${MOCK_IDS.assignmentMariaDup}`,
      )
    })
  })
})
