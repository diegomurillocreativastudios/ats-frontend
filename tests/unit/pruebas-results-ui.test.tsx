import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasResultsDetailScreen } from "@/components/pruebas/results/pruebas-results-detail-screen"
import { PruebasResultsListScreen } from "@/components/pruebas/results/pruebas-results-list-screen"
import esMessages from "@/messages/es.json"
import { MOCK_IDS } from "@/lib/pruebas/mock-fixtures"
import { resetMockStore, setMockScenario } from "@/lib/pruebas/mock-service"

const paramsState: { assignmentId: string } = {
  assignmentId: MOCK_IDS.assignmentSofiaPending,
}

vi.mock("next/navigation", () => ({
  useParams: () => ({ assignmentId: paramsState.assignmentId }),
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/portal-pruebas/resultados",
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
  paramsState.assignmentId = MOCK_IDS.assignmentSofiaPending
})

afterEach(() => {
  resetMockStore()
})

describe("PruebasResultsListScreen UI", () => {
  it("lists Diego and Lucía among completed technical results", async () => {
    renderWithIntl(<PruebasResultsListScreen />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Resultados" }),
      ).toBeInTheDocument()
    })

    expect(
      screen.queryByTestId(`results-open-${MOCK_IDS.assignmentSofiaPending}`),
    ).not.toBeInTheDocument()
    expect(
      screen.getAllByTestId(
        `results-open-${MOCK_IDS.assignmentDiegoPendingReview}`,
      ).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByTestId(`results-open-${MOCK_IDS.assignmentLuciaSubmitted}`)
        .length,
    ).toBeGreaterThan(0)
    expect(screen.queryByLabelText("Tipo")).not.toBeInTheDocument()
  })

  it("shows error state when the mock scenario fails", async () => {
    setMockScenario("error")
    renderWithIntl(<PruebasResultsListScreen />)

    await waitFor(() => {
      expect(screen.getByText("No se pudieron cargar los resultados")).toBeInTheDocument()
    })
  })
})

describe("PruebasResultsDetailScreen UI", () => {
  it("shows Sofía dimensions and instrument scale footnote", async () => {
    paramsState.assignmentId = MOCK_IDS.assignmentSofiaPending
    renderWithIntl(<PruebasResultsDetailScreen />)

    await waitFor(() => {
      expect(screen.getByTestId("results-dimensions-chart")).toBeInTheDocument()
    })

    expect(screen.getByTestId("results-dimensions-chart-footnote")).toHaveTextContent(
      /0 a 100/i,
    )
    expect(screen.getByTestId("results-export")).toBeDisabled()
    expect(screen.getByTestId("results-view-application")).toHaveAttribute(
      "href",
      `/portal-rrhh/vacantes/${MOCK_IDS.vacancyOpen}`,
    )
  })

  it("shows Diego score, pending review and correct single-choice verdict", async () => {
    paramsState.assignmentId = MOCK_IDS.assignmentDiegoPendingReview
    renderWithIntl(<PruebasResultsDetailScreen />)

    await waitFor(() => {
      expect(screen.getByTestId("results-score-summary")).toBeInTheDocument()
    })

    expect(screen.getByTestId("results-score-summary")).toHaveTextContent("12")
    expect(screen.getByTestId("results-score-summary")).toHaveTextContent("20")
    expect(screen.getByTestId("results-detail-status")).toHaveAttribute(
      "data-status",
      "pending",
    )
    expect(screen.getByTestId("results-categories-insufficient")).toBeInTheDocument()
    expect(
      screen.getByTestId(`results-verdict-${MOCK_IDS.qSingle}`),
    ).toHaveAttribute("data-verdict", "correct")
    expect(screen.getByTestId("results-open-review")).toHaveAttribute(
      "href",
      `/portal-pruebas/revision/${MOCK_IDS.assignmentDiegoPendingReview}`,
    )
  })

  it("shows no-result panel for Lucía and not-found for unknown ids", async () => {
    paramsState.assignmentId = MOCK_IDS.assignmentLuciaSubmitted
    const { unmount } = renderWithIntl(<PruebasResultsDetailScreen />)

    await waitFor(() => {
      expect(screen.getByTestId("results-detail")).toHaveAttribute(
        "data-outcome",
        "no_result",
      )
    })
    expect(screen.getByTestId("empty-state")).toHaveTextContent(/sin resultado/i)
    unmount()

    paramsState.assignmentId = "asg-missing"
    renderWithIntl(<PruebasResultsDetailScreen />)
    await waitFor(() => {
      expect(screen.getByText("Resultado no disponible")).toBeInTheDocument()
    })
  })
})
