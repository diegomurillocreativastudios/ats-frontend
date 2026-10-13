import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasLinksScreen } from "@/components/pruebas/links/pruebas-links-screen"
import esMessages from "@/messages/es.json"
import { MOCK_IDS } from "@/lib/pruebas/mock-fixtures"
import {
  debugSnapshotStore,
  listLinks,
  resetMockStore,
  setMockScenario,
} from "@/lib/pruebas/mock-service"
import { waitForDialogClosed } from "@/tests/helpers/wait-for-dialog-closed"

const searchParamsGet = vi.fn(() => null)

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: searchParamsGet,
  }),
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
  searchParamsGet.mockReturnValue(null)
})

afterEach(() => {
  resetMockStore()
})

describe("PruebasLinksScreen UI", () => {
  it("shows scope notice, excluded closed vacancy, and seeded rows", async () => {
    renderWithIntl(<PruebasLinksScreen />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Vinculaciones" }),
      ).toBeInTheDocument()
    })

    expect(screen.getByTestId("links-scope-notice")).toHaveTextContent(
      /no asigna/i,
    )
    expect(screen.getByTestId("links-excluded-vacancies")).toHaveTextContent(
      /Inventario de almacén \(cerrada\)/i,
    )

    const vacancySelect = screen.getByTestId("links-vacancy-select")
    expect(
      within(vacancySelect).queryByRole("option", {
        name: "Inventario de almacén",
      }),
    ).not.toBeInTheDocument()
    expect(
      within(vacancySelect).getByRole("option", { name: "Analista de datos" }),
    ).toBeInTheDocument()

    expect(await screen.findAllByTestId("link-row")).not.toHaveLength(0)
  })

  it("preselects version from query and rejects duplicate links", async () => {
    searchParamsGet.mockImplementation((key: string) =>
      key === "version" ? MOCK_IDS.versionTechnicalV1 : null,
    )
    const before = (await listLinks()).length
    renderWithIntl(<PruebasLinksScreen />)

    await waitFor(() => {
      expect(screen.getByTestId("links-version-select")).toHaveValue(
        MOCK_IDS.versionTechnicalV1,
      )
    })

    fireEvent.change(screen.getByTestId("links-vacancy-select"), {
      target: { value: MOCK_IDS.vacancyOpen },
    })
    fireEvent.click(screen.getByTestId("links-submit"))

    const createDialog = await screen.findByRole("dialog", {
      name: "Confirmar vinculación",
    })
    fireEvent.click(within(createDialog).getByRole("button", { name: "Vincular" }))

    await waitFor(() => {
      expect(
        screen.getByText(/Ya existe un vínculo para esa versión y vacante/i),
      ).toBeInTheDocument()
    })
    expect((await listLinks()).length).toBe(before)
  })

  it("reactivates an inactive link without creating a new row", async () => {
    const before = (await listLinks()).length
    renderWithIntl(<PruebasLinksScreen />)

    await waitFor(() => {
      expect(screen.getAllByTestId("link-row").length).toBeGreaterThan(0)
    })

    const inactiveRow = screen
      .getAllByTestId("link-row")
      .find(
        (row) => row.getAttribute("data-link-id") === MOCK_IDS.linkInactive,
      )!
    fireEvent.click(
      within(inactiveRow).getByRole("button", { name: "Reactivar" }),
    )

    const reactivateDialog = await screen.findByRole("dialog", {
      name: "Reactivar vínculo",
    })
    fireEvent.click(
      within(reactivateDialog).getByRole("button", { name: "Reactivar" }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(/Vínculo reactivado en modo demostración/i),
      ).toBeInTheDocument()
    })
    await waitForDialogClosed("Reactivar vínculo")

    expect((await listLinks()).length).toBe(before)
    const storeLink = debugSnapshotStore().links.find(
      (item) => item.id === MOCK_IDS.linkInactive,
    )
    expect(storeLink?.active).toBe(true)
  })
})
