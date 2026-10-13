import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasEvaluationsList } from "@/components/pruebas/evaluations/pruebas-evaluations-list"
import esMessages from "@/messages/es.json"
import {
  resetMockStore,
  setMockScenario,
} from "@/lib/pruebas/mock-service"

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

function renderList() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <PruebasEvaluationsList />
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
    expect(statuses.every((status) =>
      status === "draft" || status === "published" || status === "archived",
    )).toBe(true)
    expect(statuses).not.toContain("in_progress")
    expect(statuses).not.toContain("completed")
    expect(statuses).not.toContain("expired")
  })

  it("publishes a draft after confirmation and shows demo toast", async () => {
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
      expect(
        screen.getByText("Evaluación publicada en modo demostración."),
      ).toBeInTheDocument()
    })

    await waitFor(() => {
      const rows = screen.getAllByTestId("evaluation-row")
      const draftRows = rows.filter(
        (row) => row.getAttribute("data-lifecycle") === "draft",
      )
      expect(draftRows).toHaveLength(0)
    })
  })

  it("shows empty and error scenarios", async () => {
    setMockScenario("empty")
    const { unmount } = renderList()
    await waitFor(() => {
      expect(screen.getByText("No hay datos de demostración")).toBeInTheDocument()
    })
    unmount()

    setMockScenario("error")
    renderList()
    await waitFor(() => {
      expect(screen.getByTestId("error-state")).toBeInTheDocument()
    })
  })
})
