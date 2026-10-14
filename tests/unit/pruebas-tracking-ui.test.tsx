import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasTrackingScreen } from "@/components/pruebas/tracking/pruebas-tracking-screen"
import esMessages from "@/messages/es.json"
import { MOCK_IDS } from "@/lib/pruebas/mock-fixtures"
import {
  debugSnapshotStore,
  resetMockStore,
  setMockScenario,
} from "@/lib/pruebas/mock-service"
import { waitForDialogClosed } from "@/tests/helpers/wait-for-dialog-closed"

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

async function openAssignment(assignmentId: string) {
  await waitFor(() => {
    expect(
      screen.getAllByTestId(`tracking-open-${assignmentId}`).length,
    ).toBeGreaterThan(0)
  })
  fireEvent.click(screen.getAllByTestId(`tracking-open-${assignmentId}`)[0]!)
  await waitFor(() => {
    expect(screen.getByTestId("tracking-detail")).toBeInTheDocument()
  })
}

describe("PruebasTrackingScreen UI", () => {
  it("lists seed assignments and shows Carlos retry action", async () => {
    renderWithIntl(<PruebasTrackingScreen />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Seguimiento" }),
      ).toBeInTheDocument()
    })

    expect(screen.getAllByTestId("tracking-row").length).toBe(8)

    await openAssignment(MOCK_IDS.assignmentCarlosExpired)
    expect(screen.getByTestId("tracking-action-retry")).toBeInTheDocument()
    expect(screen.queryByTestId("tracking-action-cancel")).not.toBeInTheDocument()
  })

  it("lets Elena cancel but not remind, and records a reminder without claiming email", async () => {
    renderWithIntl(<PruebasTrackingScreen />)
    await openAssignment(MOCK_IDS.assignmentElenaPending)

    expect(screen.getByTestId("tracking-application-closed")).toBeInTheDocument()
    expect(screen.getByTestId("tracking-action-cancel")).toBeInTheDocument()
    expect(screen.queryByTestId("tracking-action-remind")).not.toBeInTheDocument()
    expect(screen.queryByTestId("tracking-action-extend")).not.toBeInTheDocument()
  })

  it("records a simulated reminder toast that does not claim email was sent", async () => {
    renderWithIntl(<PruebasTrackingScreen />)
    await openAssignment(MOCK_IDS.assignmentMariaDup)

    const beforeEvents = debugSnapshotStore().trackingEvents.length
    fireEvent.click(screen.getByTestId("tracking-action-remind"))

    await waitFor(() => {
      expect(
        screen.getByText(/No se envió ningún correo/i),
      ).toBeInTheDocument()
    })
    expect(debugSnapshotStore().trackingEvents.length).toBe(beforeEvents + 1)
  })

  it("cancels with confirmation and supports simulated failure", async () => {
    renderWithIntl(<PruebasTrackingScreen />)
    await openAssignment(MOCK_IDS.assignmentAnaInProgress)

    fireEvent.click(screen.getByTestId("tracking-simulate-failure"))
    fireEvent.click(screen.getByTestId("tracking-action-cancel"))

    const dialog = await screen.findByRole("dialog", {
      name: "Cancelar asignación",
    })
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Cancelar asignación" }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(/falló de forma simulada/i),
      ).toBeInTheDocument()
    })
    expect(
      debugSnapshotStore().assignments.find(
        (item) => item.id === MOCK_IDS.assignmentAnaInProgress,
      )?.status,
    ).toBe("in_progress")

    await waitForDialogClosed("Cancelar asignación")

    fireEvent.click(screen.getByTestId("tracking-simulate-failure"))
    fireEvent.click(screen.getByTestId("tracking-action-cancel"))
    const confirmDialog = await screen.findByRole("dialog", {
      name: "Cancelar asignación",
    })
    fireEvent.click(
      within(confirmDialog).getByRole("button", { name: "Cancelar asignación" }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(/Asignación cancelada en modo demostración/i),
      ).toBeInTheDocument()
    })
    expect(
      debugSnapshotStore().assignments.find(
        (item) => item.id === MOCK_IDS.assignmentAnaInProgress,
      )?.status,
    ).toBe("cancelled")
  })

  it("links Diego pending review to the manual review detail and results", async () => {
    renderWithIntl(<PruebasTrackingScreen />)
    await openAssignment(MOCK_IDS.assignmentDiegoPendingReview)

    const reviewLink = screen.getByTestId("tracking-open-review")
    expect(reviewLink).toHaveAttribute(
      "href",
      `/portal-pruebas/revision/${MOCK_IDS.assignmentDiegoPendingReview}`,
    )
    expect(screen.getByTestId("tracking-open-result")).toHaveAttribute(
      "href",
      `/portal-pruebas/resultados/${MOCK_IDS.assignmentDiegoPendingReview}`,
    )
  })

  it("authorizes retry for Carlos and returns assignment to pending", async () => {
    renderWithIntl(<PruebasTrackingScreen />)
    await openAssignment(MOCK_IDS.assignmentCarlosExpired)

    fireEvent.click(screen.getByTestId("tracking-action-retry"))

    await waitFor(() => {
      expect(
        screen.getByText(/Reintento autorizado en modo demostración/i),
      ).toBeInTheDocument()
    })

    const carlos = debugSnapshotStore().assignments.find(
      (item) => item.id === MOCK_IDS.assignmentCarlosExpired,
    )
    expect(carlos?.status).toBe("pending")
    expect(carlos?.allowedAttempts).toBe(2)
  })
})
