import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasReportsScreen } from "@/components/pruebas/reports/pruebas-reports-screen"
import { PruebasRrhhTestsPanel } from "@/components/pruebas/reports/pruebas-rrhh-tests-panel"
import { PruebasAssignmentsScreen } from "@/components/pruebas/assignments/pruebas-assignments-screen"
import esMessages from "@/messages/es.json"
import { MOCK_IDS } from "@/lib/pruebas/mock-fixtures"
import { resetMockStore, setMockScenario } from "@/lib/pruebas/mock-service"

const searchParamsState = {
  value: new URLSearchParams(),
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => searchParamsState.value,
  usePathname: () => "/portal-pruebas/reportes",
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
  searchParamsState.value = new URLSearchParams()
})

afterEach(() => {
  resetMockStore()
})

describe("PruebasReportsScreen UI", () => {
  it("shows catalog, defaults to assignments-by-status, and disables export", async () => {
    renderWithIntl(<PruebasReportsScreen />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Reportes" }),
      ).toBeInTheDocument()
    })

    expect(screen.getByTestId("reports-catalog")).toBeInTheDocument()
    expect(
      screen.getByTestId("reports-catalog-assignments-by-status"),
    ).toHaveAttribute("aria-selected", "true")
    expect(screen.getByTestId("reports-export-pdf")).toBeDisabled()
    expect(screen.getByTestId("reports-export-csv")).toBeDisabled()
    expect(screen.getByTestId("reports-export-hint")).toHaveTextContent(
      /disponible al conectar backend/i,
    )
    expect(
      screen.getByTestId("reports-chart-assignments-by-status"),
    ).toBeInTheDocument()
  })

  it("switches to technical scores with Diego 12/20", async () => {
    renderWithIntl(<PruebasReportsScreen />)

    await waitFor(() => {
      expect(
        screen.getByTestId("reports-catalog-technical-scores"),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("reports-catalog-technical-scores"))

    await waitFor(() => {
      expect(
        screen.getByTestId("reports-chart-technical-scores"),
      ).toBeInTheDocument()
    })

    expect(screen.getAllByTestId("reports-technical-score")[0]).toHaveTextContent(
      "12",
    )
    expect(screen.getAllByTestId("reports-technical-score")[0]).toHaveTextContent(
      "20",
    )
  })

  it("switches to psychometric dimensions for Sofía", async () => {
    renderWithIntl(<PruebasReportsScreen />)

    await waitFor(() => {
      expect(
        screen.getByTestId("reports-catalog-psychometric-dimensions"),
      ).toBeInTheDocument()
    })

    fireEvent.click(
      screen.getByTestId("reports-catalog-psychometric-dimensions"),
    )

    await waitFor(() => {
      expect(
        screen.getByTestId("reports-chart-psychometric-dimensions"),
      ).toBeInTheDocument()
    })

    expect(
      screen.getByTestId("reports-chart-psychometric-dimensions-footnote"),
    ).toHaveTextContent(/0 a 100/i)
    expect(screen.getAllByText("Análisis").length).toBeGreaterThan(0)
    expect(
      screen.getAllByTestId("reports-dimension-score").length,
    ).toBeGreaterThan(0)
  })

  it("shows empty state when filters match nothing", async () => {
    renderWithIntl(<PruebasReportsScreen />)

    await waitFor(() => {
      expect(screen.getByTestId("reports-filter-from")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("reports-filter-from"), {
      target: { value: "2099-01-01" },
    })
    fireEvent.change(screen.getByTestId("reports-filter-to"), {
      target: { value: "2099-01-02" },
    })

    await waitFor(() => {
      expect(screen.getByText("Sin coincidencias")).toBeInTheDocument()
    })
  })

  it("shows error state when the mock scenario fails", async () => {
    setMockScenario("error")
    renderWithIntl(<PruebasReportsScreen />)

    await waitFor(() => {
      expect(
        screen.getByText("No se pudieron cargar los reportes"),
      ).toBeInTheDocument()
    })
  })
})

describe("PruebasRrhhTestsPanel UI", () => {
  it("lists seeded examples with links to results or tracking", async () => {
    renderWithIntl(<PruebasRrhhTestsPanel />)

    await waitFor(() => {
      expect(screen.getByTestId("rrhh-pruebas-panel")).toBeInTheDocument()
    })

    expect(
      screen.getAllByTestId(
        `rrhh-pruebas-open-${MOCK_IDS.assignmentDiegoPendingReview}`,
      )[0],
    ).toHaveAttribute(
      "href",
      `/portal-pruebas/resultados/${MOCK_IDS.assignmentDiegoPendingReview}`,
    )
    expect(
      screen.getAllByTestId(
        `rrhh-pruebas-open-${MOCK_IDS.assignmentAnaInProgress}`,
      )[0],
    ).toHaveAttribute("href", "/portal-pruebas/seguimiento")
  })
})

describe("assignments returnTo", () => {
  it("shows Volver for a safe HR path and hides it for unsafe values", async () => {
    searchParamsState.value = new URLSearchParams({
      returnTo: "/portal-rrhh/vacantes/demo",
    })
    const { unmount } = renderWithIntl(<PruebasAssignmentsScreen />)

    await waitFor(() => {
      expect(screen.getByTestId("assignments-back-to-rrhh")).toHaveAttribute(
        "href",
        "/portal-rrhh/vacantes/demo",
      )
    })
    unmount()

    searchParamsState.value = new URLSearchParams({
      returnTo: "https://evil.example/x",
    })
    renderWithIntl(<PruebasAssignmentsScreen />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Asignaciones" }),
      ).toBeInTheDocument()
    })
    expect(screen.queryByTestId("assignments-back-to-rrhh")).not.toBeInTheDocument()
  })
})
