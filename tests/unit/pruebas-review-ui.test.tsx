import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasReviewDetailScreen } from "@/components/pruebas/review/pruebas-review-detail-screen"
import { PruebasReviewQueueScreen } from "@/components/pruebas/review/pruebas-review-queue-screen"
import esMessages from "@/messages/es.json"
import { MOCK_IDS } from "@/lib/pruebas/mock-fixtures"
import {
  debugSnapshotStore,
  resetMockStore,
  setMockScenario,
} from "@/lib/pruebas/mock-service"

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  useParams: () => ({ assignmentId: MOCK_IDS.assignmentDiegoPendingReview }),
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/portal-pruebas/revision",
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
  pushMock.mockReset()
})

afterEach(() => {
  resetMockStore()
})

describe("PruebasReviewQueueScreen UI", () => {
  it("lists Diego in the pending queue", async () => {
    renderWithIntl(<PruebasReviewQueueScreen />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Revisión manual" }),
      ).toBeInTheDocument()
    })

    expect(screen.getAllByTestId("review-queue-row").length).toBeGreaterThan(0)
    expect(
      screen.getAllByTestId(`review-open-${MOCK_IDS.assignmentDiegoPendingReview}`)
        .length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText("Diego Navarro").length).toBeGreaterThan(0)
  })
})

describe("PruebasReviewDetailScreen UI", () => {
  it("shows answer, blocks invalid points, and finishes review", async () => {
    renderWithIntl(<PruebasReviewDetailScreen />)

    await waitFor(() => {
      expect(screen.getByTestId("review-open-items")).toBeInTheDocument()
    })

    expect(
      screen.getByTestId(`review-answer-${MOCK_IDS.qOpen}`),
    ).toHaveTextContent(/sprint/i)

    fireEvent.click(screen.getByTestId("review-save"))
    await waitFor(() => {
      expect(
        screen.getByTestId(`review-points-error-${MOCK_IDS.qOpen}`),
      ).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId(`review-points-${MOCK_IDS.qOpen}`), {
      target: { value: "4" },
    })
    fireEvent.change(screen.getByTestId(`review-notes-${MOCK_IDS.qOpen}`), {
      target: { value: "Buen criterio" },
    })

    fireEvent.click(screen.getByTestId("review-finish"))
    const dialog = await screen.findByRole("dialog", {
      name: "Finalizar revisión",
    })
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Finalizar" }),
    )

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/portal-pruebas/revision")
    })

    const store = debugSnapshotStore()
    expect(
      store.results.find(
        (item) => item.assignmentId === MOCK_IDS.assignmentDiegoPendingReview,
      )?.reviewStatus,
    ).toBe("reviewed")
    expect(
      store.results.find(
        (item) => item.assignmentId === MOCK_IDS.assignmentDiegoPendingReview,
      )?.score,
    ).toBe(12)
  })
})
