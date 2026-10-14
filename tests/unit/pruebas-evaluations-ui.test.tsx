import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasEvaluationsList } from "@/components/pruebas/evaluations/pruebas-evaluations-list"
import esMessages from "@/messages/es.json"
import type { AssessmentTestView } from "@/lib/api/recruiter-assessments-tests"

const listAssessmentTests = vi.fn()
const publishAssessmentTest = vi.fn()
const archiveAssessmentTest = vi.fn()
const duplicateAssessmentTest = vi.fn()

vi.mock("@/lib/api/recruiter-assessments-tests", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/recruiter-assessments-tests")
  >("@/lib/api/recruiter-assessments-tests")
  return {
    ...actual,
    listAssessmentTests: (...args: unknown[]) => listAssessmentTests(...args),
    publishAssessmentTest: (...args: unknown[]) => publishAssessmentTest(...args),
    archiveAssessmentTest: (...args: unknown[]) => archiveAssessmentTest(...args),
    duplicateAssessmentTest: (...args: unknown[]) =>
      duplicateAssessmentTest(...args),
  }
})

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

vi.mock("@/hooks/use-is-below-lg", () => ({
  useIsBelowLg: () => false,
}))

const sampleTests: AssessmentTestView[] = [
  {
    id: "t-draft",
    title: "Borrador de comunicación",
    description: "Draft",
    kind: "technical",
    lifecycleStatus: "draft",
    draftVersion: 0,
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "t-pub",
    title: "Razonamiento lógico",
    description: "Published",
    kind: "psychometric",
    lifecycleStatus: "published",
    draftVersion: 1,
    createdAt: "2026-09-01T00:00:00Z",
  },
]

function renderList() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <PruebasEvaluationsList />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  listAssessmentTests.mockReset()
  publishAssessmentTest.mockReset()
  archiveAssessmentTest.mockReset()
  duplicateAssessmentTest.mockReset()
  listAssessmentTests.mockResolvedValue(sampleTests)
  publishAssessmentTest.mockResolvedValue(null)
  archiveAssessmentTest.mockResolvedValue(sampleTests[0])
  duplicateAssessmentTest.mockResolvedValue(sampleTests[0])
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("PruebasEvaluationsList UI", () => {
  it("renders lifecycle statuses only and seed titles", async () => {
    renderList()

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Evaluaciones" }),
      ).toBeInTheDocument()
    })

    expect(screen.getAllByText("Razonamiento lógico").length).toBeGreaterThan(0)
    expect(
      screen.getAllByText("Borrador de comunicación").length,
    ).toBeGreaterThan(0)

    const badges = screen.getAllByTestId("assessment-status-badge")
    const statuses = badges.map((badge) => badge.getAttribute("data-status"))
    expect(
      statuses.every(
        (status) =>
          status === "draft" ||
          status === "published" ||
          status === "archived",
      ),
    ).toBe(true)
    expect(statuses).not.toContain("in_progress")
  })

  it("publishes a draft after confirmation", async () => {
    listAssessmentTests
      .mockResolvedValueOnce(sampleTests)
      .mockResolvedValueOnce([
        { ...sampleTests[0]!, lifecycleStatus: "published" },
        sampleTests[1]!,
      ])

    renderList()

    await waitFor(() => {
      expect(screen.getAllByTestId("evaluation-row").length).toBeGreaterThan(0)
    })

    const draftRow = screen
      .getAllByTestId("evaluation-row")
      .find((row) => row.getAttribute("data-lifecycle") === "draft")
    expect(draftRow).toBeTruthy()

    const openActions = within(draftRow!).getByRole("button", {
      name: /Abrir acciones de Borrador de comunicación/i,
    })
    fireEvent.click(openActions)

    fireEvent.click(screen.getByRole("menuitem", { name: "Publicar" }))

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Publicar" }))

    await waitFor(() => {
      expect(publishAssessmentTest).toHaveBeenCalledWith("t-draft")
      expect(screen.getByText("Evaluación publicada.")).toBeInTheDocument()
    })
  })

  it("shows empty and error scenarios", async () => {
    listAssessmentTests.mockResolvedValueOnce([])
    const { unmount } = renderList()
    await waitFor(() => {
      expect(screen.getByText("Aún no hay evaluaciones")).toBeInTheDocument()
    })
    unmount()

    listAssessmentTests.mockRejectedValueOnce(new Error("boom"))
    renderList()
    await waitFor(() => {
      expect(screen.getByTestId("error-state")).toBeInTheDocument()
    })
  })
})
