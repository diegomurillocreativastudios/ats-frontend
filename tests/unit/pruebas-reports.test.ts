import { beforeEach, describe, expect, it } from "vitest"

import { createMockFixtures, MOCK_IDS } from "@/lib/pruebas/mock-fixtures"
import { resetMockStore, setMockScenario } from "@/lib/pruebas/mock-service"
import {
  buildAssignmentStatusReportRows,
  buildPsychometricDimensionReportRows,
  buildRrhhTestsPanelRows,
  buildTechnicalScoreReportRows,
  countAssignmentStatuses,
  parseSafeRrhhReturnTo,
} from "@/lib/pruebas/reports"

beforeEach(() => {
  resetMockStore()
  setMockScenario("populated")
})

const EMPTY_FILTERS = {
  vacancyId: null,
  assignedFrom: null,
  assignedTo: null,
}

describe("buildAssignmentStatusReportRows", () => {
  it("includes all assignment statuses and counts them", () => {
    const store = createMockFixtures()
    const rows = buildAssignmentStatusReportRows(store, EMPTY_FILTERS)
    const ids = rows.map((row) => row.assignmentId)

    expect(ids).toContain(MOCK_IDS.assignmentSofiaPending)
    expect(ids).toContain(MOCK_IDS.assignmentDiegoPendingReview)
    expect(ids).toContain(MOCK_IDS.assignmentAnaInProgress)
    expect(ids).toContain(MOCK_IDS.assignmentMariaDup)
    expect(ids).toContain(MOCK_IDS.assignmentCarlosExpired)
    expect(ids).toContain(MOCK_IDS.assignmentNoraCancelled)

    const counts = countAssignmentStatuses(rows)
    const byStatus = Object.fromEntries(
      counts.map((point) => [point.status, point.count]),
    )
    expect(byStatus.completed).toBeGreaterThanOrEqual(3)
    expect(byStatus.pending).toBeGreaterThanOrEqual(1)
    expect(byStatus.in_progress).toBeGreaterThanOrEqual(1)
    expect(byStatus.expired).toBeGreaterThanOrEqual(1)
    expect(byStatus.cancelled).toBeGreaterThanOrEqual(1)
  })

  it("filters by vacancy and assignedAt range", () => {
    const store = createMockFixtures()
    const byDate = buildAssignmentStatusReportRows(store, {
      vacancyId: null,
      assignedFrom: "2026-10-10",
      assignedTo: "2026-10-10",
    })
    expect(byDate.map((row) => row.assignmentId)).toEqual([
      MOCK_IDS.assignmentDiegoPendingReview,
    ])

    const empty = buildAssignmentStatusReportRows(store, {
      vacancyId: "vacancy-does-not-exist",
      assignedFrom: null,
      assignedTo: null,
    })
    expect(empty).toHaveLength(0)
  })
})

describe("buildTechnicalScoreReportRows", () => {
  it("includes Diego 12/20 and excludes psychometric results", () => {
    const store = createMockFixtures()
    const rows = buildTechnicalScoreReportRows(store, EMPTY_FILTERS)

    expect(rows).toHaveLength(1)
    expect(rows[0]?.assignmentId).toBe(MOCK_IDS.assignmentDiegoPendingReview)
    expect(rows[0]?.candidateName).toBe("Diego Navarro")
    expect(rows[0]?.score).toBe(12)
    expect(rows[0]?.maxScore).toBe(20)
  })
})

describe("buildPsychometricDimensionReportRows", () => {
  it("expands Sofía dimensions on a 0–100 scale", () => {
    const store = createMockFixtures()
    const rows = buildPsychometricDimensionReportRows(store, EMPTY_FILTERS)

    expect(rows).toHaveLength(4)
    const byDimension = Object.fromEntries(
      rows.map((row) => [row.dimension, row.score]),
    )
    expect(byDimension.Análisis).toBe(81)
    expect(byDimension.Comunicación).toBe(72)
    expect(byDimension.Colaboración).toBe(65)
    expect(byDimension.Adaptabilidad).toBe(70)
    expect(rows.every((row) => row.candidateName === "Sofía Ruiz")).toBe(true)
  })
})

describe("buildRrhhTestsPanelRows", () => {
  it("links completed assignments to results and others to tracking", () => {
    const store = createMockFixtures()
    const rows = buildRrhhTestsPanelRows(store)

    const diego = rows.find(
      (row) => row.assignmentId === MOCK_IDS.assignmentDiegoPendingReview,
    )
    expect(diego?.href).toBe(
      `/portal-pruebas/resultados/${MOCK_IDS.assignmentDiegoPendingReview}`,
    )

    const ana = rows.find(
      (row) => row.assignmentId === MOCK_IDS.assignmentAnaInProgress,
    )
    expect(ana?.href).toBe("/portal-pruebas/seguimiento")
  })
})

describe("parseSafeRrhhReturnTo", () => {
  it("accepts relative HR paths and rejects unsafe values", () => {
    expect(parseSafeRrhhReturnTo("/portal-rrhh/vacantes/abc")).toBe(
      "/portal-rrhh/vacantes/abc",
    )
    expect(
      parseSafeRrhhReturnTo(encodeURIComponent("/portal-rrhh/candidatos/1")),
    ).toBe("/portal-rrhh/candidatos/1")

    expect(parseSafeRrhhReturnTo("https://evil.example/x")).toBeNull()
    expect(parseSafeRrhhReturnTo("//evil.example/x")).toBeNull()
    expect(parseSafeRrhhReturnTo("/portal-pruebas/asignaciones")).toBeNull()
    expect(parseSafeRrhhReturnTo("/portal-rrhh\\escape")).toBeNull()
    expect(parseSafeRrhhReturnTo(null)).toBeNull()
  })
})
