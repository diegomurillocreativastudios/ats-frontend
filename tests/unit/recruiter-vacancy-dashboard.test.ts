import { describe, expect, it } from "vitest"
import type { VacancyProgressByClientRow } from "@/lib/api/recruiter-reports"
import {
  buildVacancyDashboardSnapshot,
  type VacancyDashboardListItem,
} from "@/lib/rrhh/recruiter-vacancy-dashboard"

const NOW = new Date("2026-10-05T12:00:00.000Z")

function progressRow(
  overrides: Partial<VacancyProgressByClientRow>
): VacancyProgressByClientRow {
  return {
    vacancyStatus: "open",
    totalCandidates: 0,
    progressPercent: 0,
    ...overrides,
  }
}

function listItem(
  overrides: Partial<VacancyDashboardListItem> & Pick<VacancyDashboardListItem, "id">
): VacancyDashboardListItem {
  return {
    publicSlug: null,
    title: overrides.id,
    company: "Acme",
    status: "activa",
    isPublished: true,
    candidates: 0,
    ...overrides,
  }
}

describe("buildVacancyDashboardSnapshot", () => {
  it("cuenta tarjetas, ordena la lista por señal y enlaza con el slug", () => {
    const snapshot = buildVacancyDashboardSnapshot({
      now: NOW,
      progressTotal: 5,
      listTotal: 3,
      progressRows: [
        progressRow({
          vacancyId: "critical-1",
          vacancyTitle: "Zeta",
          clientName: "Norte",
          openedAt: "2026-09-01T00:00:00.000Z",
          totalCandidates: 0,
          progressPercent: 0,
        }),
        progressRow({
          vacancyId: "attention-1",
          vacancyTitle: "Beta",
          clientName: "Sur",
          openedAt: "2026-10-01T00:00:00.000Z",
          totalCandidates: 4,
          progressPercent: 10,
        }),
        progressRow({
          vacancyId: "overdue-1",
          vacancyTitle: "Alfa",
          openedAt: "2026-08-01T00:00:00.000Z",
          totalCandidates: 5,
          progressPercent: 80,
        }),
        progressRow({
          vacancyId: "   ",
          vacancyTitle: "Sin id",
          openedAt: "2026-10-04T00:00:00.000Z",
          totalCandidates: 0,
          progressPercent: 80,
        }),
        progressRow({
          vacancyId: "closed-1",
          vacancyStatus: "closed",
          openedAt: "2026-01-01T00:00:00.000Z",
          totalCandidates: 0,
        }),
      ],
      listItems: [
        listItem({
          id: "critical-1",
          publicSlug: "zeta-norte",
          title: "Zeta",
          isPublished: false,
        }),
        listItem({
          id: "draft-hidden",
          status: "borrador",
          isPublished: false,
        }),
        listItem({
          id: "quiet-hidden",
          publicSlug: "quiet-role",
          title: "Silenciosa",
          company: "—",
          isPublished: false,
        }),
      ],
    })

    expect(snapshot.withoutCandidates).toBe(1)
    expect(snapshot.overdue).toBe(2)
    expect(snapshot.unpublished).toBe(2)
    expect(snapshot.activeVacancies).toBe(2)
    expect(snapshot.progressPartial).toBeNull()
    expect(snapshot.listPartial).toBeNull()
    expect(snapshot.attention.map((row) => row.vacancyId)).toEqual([
      "critical-1",
      "attention-1",
      "overdue-1",
      "quiet-hidden",
    ])
    expect(snapshot.attention[0]).toMatchObject({
      signal: "critical",
      clientName: "Norte",
      href: "/portal-rrhh/vacantes/zeta-norte",
    })
    expect(snapshot.attention[1]?.signal).toBe("attention")
    expect(snapshot.attention[2]).toMatchObject({
      signal: "overdue",
      href: "/portal-rrhh/vacantes/overdue-1",
    })
    expect(snapshot.attention[3]).toMatchObject({
      signal: "unpublished",
      title: "Silenciosa",
      clientName: null,
      href: "/portal-rrhh/vacantes/quiet-role",
    })
  })

  it("marca conteo parcial y recorta la lista a seis", () => {
    const progressRows = Array.from({ length: 7 }, (_, index) =>
      progressRow({
        vacancyId: `v-${index}`,
        vacancyTitle: `Vacante ${index}`,
        openedAt: "2026-09-01T00:00:00.000Z",
        totalCandidates: 0,
        progressPercent: 0,
      })
    )

    const snapshot = buildVacancyDashboardSnapshot({
      now: NOW,
      progressRows,
      progressTotal: 20,
      listItems: [],
      listTotal: 4,
    })

    expect(snapshot.attention).toHaveLength(6)
    expect(snapshot.progressPartial).toEqual({ analyzed: 7, total: 20 })
    expect(snapshot.listPartial).toEqual({ analyzed: 0, total: 4 })
    expect(snapshot.attention.every((row) => row.signal === "critical")).toBe(true)
  })
})
