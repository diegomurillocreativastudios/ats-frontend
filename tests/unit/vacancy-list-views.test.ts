import { describe, expect, it } from "vitest"
import type { VacancyProgressByClientRow } from "@/lib/api/recruiter-reports"
import type { VacancyListItem } from "@/lib/vacancies/map-vacancy-list-item"
import {
  createPagedLoadState,
  foldPagedBatch,
  parseVacancyListView,
  selectActiveVacancies,
  selectOverdueRows,
  selectUnpublishedVacancies,
  selectWithoutCandidateRows,
  toProgressViewRows,
  vacancyListViewPath,
} from "@/lib/rrhh/vacancy-list-views"

const NOW = new Date("2026-10-05T12:00:00.000Z")

function listItem(
  overrides: Partial<VacancyListItem> & Pick<VacancyListItem, "id" | "status" | "isPublished">
): VacancyListItem {
  return {
    publicSlug: null,
    title: overrides.id,
    description: "",
    company: "Acme",
    companyId: null,
    jobCategory: "",
    department: "",
    departmentId: "",
    modality: "",
    modalityId: "",
    location: "",
    requirementsSummary: "",
    requirementsRaw: null,
    candidates: 0,
    interviews: null,
    statusRaw: overrides.status,
    iconKey: "briefcase",
    needsRematch: false,
    createdAt: null,
    createdAtLabel: null,
    countryCode: null,
    countryLabel: "",
    stateCode: null,
    isActive: true,
    logoSrc: null,
    ...overrides,
  }
}

function progressRow(
  overrides: Partial<VacancyProgressByClientRow>
): VacancyProgressByClientRow {
  return {
    vacancyStatus: "open",
    totalCandidates: 0,
    ...overrides,
  }
}

describe("parseVacancyListView", () => {
  it("acepta las cuatro vistas y descarta el resto", () => {
    expect(parseVacancyListView("activas")).toBe("activas")
    expect(parseVacancyListView("sin-postulaciones")).toBe("sin-postulaciones")
    expect(parseVacancyListView("fuera-de-plazo")).toBe("fuera-de-plazo")
    expect(parseVacancyListView("no-publicadas")).toBe("no-publicadas")
    expect(parseVacancyListView("todas")).toBeNull()
    expect(parseVacancyListView(null)).toBeNull()
    expect(vacancyListViewPath("activas")).toBe("/portal-rrhh/vacantes?vista=activas")
  })
})

describe("vistas de vacantes", () => {
  const items = [
    listItem({ id: "open-1", status: "activa", isPublished: true, title: "Abierta" }),
    listItem({
      id: "hidden-1",
      status: "activa",
      isPublished: false,
      publicSlug: "oculta",
      title: "Oculta",
    }),
    listItem({ id: "draft-1", status: "borrador", isPublished: false, title: "Borrador" }),
  ]

  it("separa activas y no publicadas", () => {
    expect(selectActiveVacancies(items).map((item) => item.id)).toEqual(["open-1", "hidden-1"])
    expect(selectUnpublishedVacancies(items).map((item) => item.id)).toEqual(["hidden-1"])
  })

  it("separa sin postulaciones y fuera de plazo, y enlaza con el slug", () => {
    const rows = [
      progressRow({
        vacancyId: "hidden-1",
        vacancyTitle: "Oculta",
        clientName: "Norte",
        openedAt: "2026-10-01T00:00:00.000Z",
        totalCandidates: 0,
      }),
      progressRow({
        vacancyId: "slow-1",
        vacancyTitle: "Lenta",
        openedAt: "2026-08-01T00:00:00.000Z",
        totalCandidates: 3,
      }),
      progressRow({
        vacancyId: "   ",
        openedAt: "2026-08-01T00:00:00.000Z",
        totalCandidates: 0,
      }),
      progressRow({
        vacancyId: "closed-1",
        vacancyStatus: "closed",
        openedAt: "2026-01-01T00:00:00.000Z",
        totalCandidates: 0,
      }),
    ]

    expect(selectWithoutCandidateRows(rows).map((row) => row.vacancyId)).toEqual(["hidden-1"])
    expect(selectOverdueRows(rows, NOW).map((row) => row.vacancyId)).toEqual(["slow-1"])
    expect(toProgressViewRows(selectWithoutCandidateRows(rows), items, NOW)).toEqual([
      {
        vacancyId: "hidden-1",
        title: "Oculta",
        clientName: "Norte",
        daysOpen: 4,
        candidateCount: 0,
        href: "/portal-rrhh/vacantes/oculta",
      },
    ])
  })
})

describe("foldPagedBatch", () => {
  it("marca el corte cuando aún quedan registros al llegar al tope", () => {
    const first = foldPagedBatch(
      createPagedLoadState<number>(),
      { items: [1], totalCount: 3, hasNextPage: true },
      1
    )
    expect(first.done).toBe(true)
    expect(first.truncated).toBe(true)
    expect(first.items).toEqual([1])
    expect(first.totalCount).toBe(3)
  })

  it("cierra sin corte cuando la página trae el total", () => {
    const done = foldPagedBatch(
      createPagedLoadState<string>(),
      { items: ["a", "b"], totalCount: 2, hasNextPage: false },
      50
    )
    expect(done.done).toBe(true)
    expect(done.truncated).toBe(false)
    expect(done.items).toEqual(["a", "b"])
  })
})
