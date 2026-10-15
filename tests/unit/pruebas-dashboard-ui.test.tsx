import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PruebasDashboard } from "@/components/pruebas/dashboard/pruebas-dashboard"
import esMessages from "@/messages/es.json"
import type { AssessmentsDashboardView } from "@/lib/api/recruiter-assessments-dashboard"

const fetchAssessmentsDashboard = vi.fn()
const listRecruiterCompanies = vi.fn()
const fetchRecruiterVacancyOptions = vi.fn()

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

vi.mock("@/lib/api/recruiter-assessments-dashboard", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/recruiter-assessments-dashboard")
  >("@/lib/api/recruiter-assessments-dashboard")
  return {
    ...actual,
    fetchAssessmentsDashboard: (...args: unknown[]) =>
      fetchAssessmentsDashboard(...args),
  }
})

vi.mock("@/lib/api/recruiter-companies", () => ({
  listRecruiterCompanies: () => listRecruiterCompanies(),
}))

vi.mock("@/lib/api/admin-interviews-calendar", () => ({
  fetchRecruiterVacancyOptions: () => fetchRecruiterVacancyOptions(),
}))

function populatedView(
  overrides: Partial<AssessmentsDashboardView> = {},
): AssessmentsDashboardView {
  return {
    counts: {
      assigned: 8,
      pending: 2,
      inProgress: 1,
      completed: 3,
      expired: 1,
      cancelled: 1,
      pendingReview: 1,
    },
    activitySeries: [{ date: "2026-10-01", count: 2 }],
    statusDistribution: [
      { status: "pending", count: 2 },
      { status: "in_progress", count: 1 },
      { status: "completed", count: 3 },
      { status: "expired", count: 1 },
      { status: "cancelled", count: 1 },
    ],
    dueSoon: [],
    pendingReviews: [],
    recentActivity: [],
    isEmpty: false,
    isFilterEmpty: false,
    ...overrides,
  }
}

function renderDashboard() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <PruebasDashboard />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  fetchAssessmentsDashboard.mockReset()
  listRecruiterCompanies.mockReset()
  fetchRecruiterVacancyOptions.mockReset()
  listRecruiterCompanies.mockResolvedValue([
    { id: "c1", name: "Acme", isActive: true },
    { id: "c2", name: "Inactive Co", isActive: false },
  ])
  fetchRecruiterVacancyOptions.mockResolvedValue([
    { id: "v1", title: "Dev", companyId: "c1" },
    { id: "v2", title: "QA", companyId: "c1" },
  ])
  fetchAssessmentsDashboard.mockResolvedValue(populatedView())
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("PruebasDashboard UI", () => {
  it("renders metric counts from the assessments dashboard API", async () => {
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
    expect(metrics).toHaveTextContent("Canceladas")
    expect(metrics).toHaveTextContent("Pendientes de revisión")
    expect(
      screen.getByRole("link", { name: /Crear o ver evaluaciones/i }),
    ).toHaveAttribute("href", "/portal-pruebas/evaluaciones")
    expect(fetchAssessmentsDashboard).toHaveBeenCalled()
  })

  it("shows filter-empty without replacing the page chrome", async () => {
    fetchAssessmentsDashboard.mockImplementation(
      async (filters: { kind?: string | null; assignmentStatus?: string | null }) => {
        if (filters.kind === "psychometric" && filters.assignmentStatus === "pending") {
          return populatedView({
            counts: {
              assigned: 0,
              pending: 0,
              inProgress: 0,
              completed: 0,
              expired: 0,
              cancelled: 0,
              pendingReview: 0,
            },
            isEmpty: false,
            isFilterEmpty: true,
            activitySeries: [],
            statusDistribution: [
              { status: "pending", count: 0 },
              { status: "in_progress", count: 0 },
              { status: "completed", count: 0 },
              { status: "expired", count: 0 },
              { status: "cancelled", count: 0 },
            ],
          })
        }
        return populatedView()
      },
    )

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByLabelText("Empresa")).toBeInTheDocument()
    })

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
    expect(screen.getByLabelText("Empresa")).toBeInTheDocument()
    expect(screen.getByLabelText("Métricas de asignaciones")).toBeInTheDocument()
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument()
  })

  it("shows global empty when there are no assignments", async () => {
    fetchAssessmentsDashboard.mockResolvedValue(
      populatedView({
        counts: {
          assigned: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          expired: 0,
          cancelled: 0,
          pendingReview: 0,
        },
        isEmpty: true,
        isFilterEmpty: false,
        activitySeries: [],
      }),
    )

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText("Sin asignaciones")).toBeInTheDocument()
    })
    expect(screen.getByLabelText("Empresa")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /Crear o ver evaluaciones/i }),
    ).toBeInTheDocument()
  })

  it("shows error state when the dashboard request fails", async () => {
    fetchAssessmentsDashboard.mockRejectedValue(
      Object.assign(new Error("Empresa no encontrada"), { status: 404 }),
    )

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByTestId("error-state")).toBeInTheDocument()
    })
    expect(screen.getByText("No se pudo cargar el dashboard")).toBeInTheDocument()
    expect(screen.getByText("Empresa no encontrada")).toBeInTheDocument()
  })

  it("keeps filters visible when a filtered request fails", async () => {
    fetchAssessmentsDashboard
      .mockResolvedValueOnce(populatedView())
      .mockRejectedValueOnce(
        Object.assign(new Error("Rango de fechas inválido"), { status: 400 }),
      )

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByLabelText("Empresa")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Categoría"), {
      target: { value: "technical" },
    })

    await waitFor(() => {
      expect(screen.getByText("Rango de fechas inválido")).toBeInTheDocument()
    })
    expect(screen.getByLabelText("Empresa")).toBeInTheDocument()
    expect(screen.getByLabelText("Métricas de asignaciones")).toBeInTheDocument()
  })
})
