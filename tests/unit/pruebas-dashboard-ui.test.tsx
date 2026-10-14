import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasDashboard } from "@/components/pruebas/dashboard/pruebas-dashboard"
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

function renderDashboard() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <PruebasDashboard />
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

describe("PruebasDashboard UI", () => {
  it("renders seed metric counts", async () => {
    renderDashboard()

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Dashboard de pruebas" }),
      ).toBeInTheDocument()
    })

    const metrics = screen.getByLabelText("Métricas de asignaciones")
    expect(metrics).toHaveTextContent("Asignadas")
    expect(metrics).toHaveTextContent("8")
    expect(metrics).toHaveTextContent("Pendientes")
    expect(metrics).toHaveTextContent("Completadas")
    expect(metrics).toHaveTextContent("Pendientes de revisión")
    expect(
      screen.getByRole("link", { name: /Crear o ver evaluaciones/i }),
    ).toHaveAttribute("href", "/portal-pruebas/evaluaciones")
  })

  it("shows filter-empty without replacing the page chrome", async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByLabelText("Empresa")).toBeInTheDocument()
    })

    // Psychometric seed assignment is completed → pending status yields zero.
    fireEvent.change(screen.getByLabelText("Categoría"), {
      target: { value: "psychometric" },
    })
    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "pending" },
    })

    await waitFor(() => {
      expect(screen.getByText("Sin coincidencias")).toBeInTheDocument()
    })
    expect(screen.getByRole("heading", { name: "Dashboard de pruebas" })).toBeInTheDocument()
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument()
  })

  it("shows global empty for empty scenario", async () => {
    setMockScenario("empty")
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText("No hay datos de demostración")).toBeInTheDocument()
    })
  })

  it("shows error state for error scenario", async () => {
    setMockScenario("error")
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByTestId("error-state")).toBeInTheDocument()
    })
    expect(screen.getByText("No se pudo cargar el dashboard")).toBeInTheDocument()
  })
})
