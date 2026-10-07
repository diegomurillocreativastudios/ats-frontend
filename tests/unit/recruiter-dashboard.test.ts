import { describe, expect, it } from "vitest"

import {
  DASHBOARD_METRIC_KEYS,
  DASHBOARD_REMINDER_KEYS,
  DASHBOARD_STALE_CANDIDATE_DAYS,
  DASHBOARD_UPCOMING_INTERVIEW_DAYS,
  RECRUITER_DASHBOARD_LINKS,
  isActionableReminder,
  isDashboardMetricKey,
  isDashboardReminderKey,
  normalizeRecruiterDashboard,
  normalizeReminderDetail,
  reminderDetailLink,
  reminderIncludesCandidate,
  reminderWindowDays,
  resolveReminderRowHref,
  sortDashboardReminders,
  type DashboardReminder,
  type DashboardReminderKey,
} from "@/lib/rrhh/recruiter-dashboard"

const NOW = new Date("2026-10-05T16:00:00.000Z")

function metric(model: ReturnType<typeof normalizeRecruiterDashboard>, key: string) {
  const found = model.metrics.find((item) => item.key === key)
  if (!found) throw new Error(`missing metric ${key}`)
  return found
}

function reminder(
  model: ReturnType<typeof normalizeRecruiterDashboard>,
  key: string
) {
  const found = model.reminders.find((item) => item.key === key)
  if (!found) throw new Error(`missing reminder ${key}`)
  return found
}

describe("normalizeRecruiterDashboard", () => {
  it("devuelve la fecha del backend y expone todas las claves de métrica y recordatorio", () => {
    const model = normalizeRecruiterDashboard(
      {
        generatedAt: "2026-10-05T16:30:00.000Z",
        metrics: [],
        reminders: [],
      },
      NOW
    )
    expect(model.generatedAt).toBe("2026-10-05T16:30:00.000Z")
    expect(model.metrics.map((m) => m.key)).toEqual([...DASHBOARD_METRIC_KEYS])
    expect(model.reminders.map((r) => r.key)).toEqual([...DASHBOARD_REMINDER_KEYS])
  })

  it("usa el instante actual si el backend no envía generatedAt", () => {
    const model = normalizeRecruiterDashboard({}, NOW)
    expect(model.generatedAt).toBe(NOW.toISOString())
  })

  it("marca las métricas ausentes como no disponibles sin inventar ceros", () => {
    const model = normalizeRecruiterDashboard({}, NOW)
    for (const m of model.metrics) {
      expect(m.value).toBeNull()
      expect(m.sourceState).toBe("unavailable")
    }
    expect(metric(model, "activeVacancies").href).toBe(
      RECRUITER_DASHBOARD_LINKS.vacanciesActivas
    )
    expect(metric(model, "upcomingInterviews").href).toBe(
      reminderDetailLink("upcomingInterviews")
    )
  })

  it("conserva el conteo exacto y el estado de la métrica cuando el backend lo informa", () => {
    const model = normalizeRecruiterDashboard(
      {
        metrics: [
          { key: "activeVacancies", count: 6, sourceState: "ready" },
          { key: "pendingEvaluations", count: 3, sourceState: "ready" },
        ],
      },
      NOW
    )
    expect(metric(model, "activeVacancies")).toMatchObject({
      value: 6,
      sourceState: "ready",
    })
    expect(metric(model, "pendingEvaluations")).toMatchObject({
      value: 3,
      sourceState: "ready",
    })
  })

  it("deja los recordatorios como no disponibles cuando el backend no los envía", () => {
    const model = normalizeRecruiterDashboard({}, NOW)
    for (const r of model.reminders) {
      expect(r.sourceState).toBe("unavailable")
      expect(r.count).toBeNull()
    }
    expect(reminder(model, "pendingConsents").href).toBeNull()
  })

  it("resuelve el enlace al detalle cuando el recordatorio tiene conteo", () => {
    const model = normalizeRecruiterDashboard(
      {
        reminders: [
          {
            key: "staleCandidates",
            count: 4,
            sourceState: "ready",
            dueAt: "2026-09-01T00:00:00.000Z",
            context: { days: 14, analyzed: 4, total: 12 },
          },
          {
            key: "pendingApprovals",
            count: null,
            sourceState: "unavailable",
          },
          {
            key: "upcomingInterviews",
            count: 0,
            sourceState: "ready",
          },
        ],
      },
      NOW
    )
    expect(reminder(model, "staleCandidates")).toMatchObject({
      count: 4,
      sourceState: "ready",
      severity: "critical",
      dueAt: "2026-09-01T00:00:00.000Z",
      href: reminderDetailLink("staleCandidates"),
      context: { days: 14, analyzed: 4, total: 12 },
    })
    expect(reminder(model, "pendingApprovals").href).toBeNull()
    expect(reminder(model, "pendingApprovals").sourceState).toBe("unavailable")
    expect(reminder(model, "upcomingInterviews").href).toBeNull()
  })

  it("deja sin enlace las pendientes sin pantalla aunque el servidor las marque listas", () => {
    const model = normalizeRecruiterDashboard(
      {
        reminders: [
          { key: "pendingDocuments", count: 3, sourceState: "ready" },
          { key: "pendingConsents", count: 2, sourceState: "partial" },
          { key: "pendingEvaluations", count: null, sourceState: "unavailable" },
        ],
      },
      NOW
    )
    expect(reminder(model, "pendingDocuments")).toMatchObject({
      count: 3,
      sourceState: "unavailable",
      href: null,
    })
    expect(reminder(model, "pendingConsents")).toMatchObject({
      sourceState: "unavailable",
      href: null,
    })
    expect(reminder(model, "pendingEvaluations").href).toBe(
      RECRUITER_DASHBOARD_LINKS.technicalEvaluationsReport
    )
  })

  it("aplica contextos por defecto cuando el backend no los envía", () => {
    const model = normalizeRecruiterDashboard(
      {
        reminders: [
          { key: "upcomingInterviews", count: 2, sourceState: "ready" },
          { key: "staleCandidates", count: 1, sourceState: "ready" },
        ],
      },
      NOW
    )
    expect(reminder(model, "upcomingInterviews").context).toEqual({
      days: DASHBOARD_UPCOMING_INTERVIEW_DAYS,
    })
    expect(reminder(model, "staleCandidates").context).toEqual({
      days: DASHBOARD_STALE_CANDIDATE_DAYS,
    })
  })

  it("usa el plazo del detalle y, si falta, el valor por defecto", () => {
    expect(reminderWindowDays("upcomingInterviews", null)).toBe(
      DASHBOARD_UPCOMING_INTERVIEW_DAYS
    )
    expect(reminderWindowDays("staleCandidates", { days: 30 })).toBe(30)
    expect(reminderWindowDays("newCandidates", { days: 3 })).toBeNull()
  })
})

describe("isActionableReminder", () => {
  const base: DashboardReminder = {
    key: "staleCandidates",
    count: 0,
    severity: "critical",
    href: "/x",
    sourceState: "ready",
    dueAt: null,
    context: null,
  }

  it("oculta recordatorios en cero o no disponibles y muestra errores", () => {
    expect(isActionableReminder(base)).toBe(false)
    expect(isActionableReminder({ ...base, count: 2 })).toBe(true)
    expect(isActionableReminder({ ...base, count: 2, sourceState: "partial" })).toBe(true)
    expect(
      isActionableReminder({ ...base, sourceState: "unavailable", count: null })
    ).toBe(false)
    expect(isActionableReminder({ ...base, sourceState: "error", count: null })).toBe(true)
  })
})

describe("sortDashboardReminders", () => {
  it("ordena por severidad, fecha y etiqueta de forma determinista", () => {
    const make = (
      key: DashboardReminderKey,
      severity: DashboardReminder["severity"],
      dueAt: string | null
    ): DashboardReminder => ({
      key,
      severity,
      dueAt,
      count: 1,
      href: null,
      sourceState: "ready",
      context: null,
    })
    const labels: Record<string, string> = {
      upcomingInterviews: "C",
      pendingEvaluations: "B",
      newCandidates: "A",
      staleCandidates: "Z",
    }
    const sorted = sortDashboardReminders(
      [
        make("upcomingInterviews", "upcoming", "2026-10-06T00:00:00Z"),
        make("pendingEvaluations", "action", null),
        make("newCandidates", "action", null),
        make("staleCandidates", "critical", "2026-09-01T00:00:00Z"),
      ],
      (key) => labels[key]
    )
    expect(sorted.map((item) => item.key)).toEqual([
      "staleCandidates",
      "newCandidates",
      "pendingEvaluations",
      "upcomingInterviews",
    ])
  })
})

describe("isDashboardReminderKey / isDashboardMetricKey", () => {
  it("acepta solo claves conocidas", () => {
    expect(isDashboardReminderKey("staleCandidates")).toBe(true)
    expect(isDashboardReminderKey("not-a-key")).toBe(false)
    expect(isDashboardReminderKey(null)).toBe(false)
    expect(isDashboardMetricKey("activeVacancies")).toBe(true)
    expect(isDashboardMetricKey("pendingDocuments")).toBe(false)
  })
})

describe("normalizeReminderDetail", () => {
  it("filtra ítems inválidos y conserva campos opcionales", () => {
    const detail = normalizeReminderDetail("staleCandidates", {
      sourceState: "ready",
      totalCount: 2,
      items: [
        {
          id: "app-1",
          candidateProfileId: "cand-1",
          candidateName: "Ana",
          candidateTitle: "Backend Engineer",
          vacancyId: "vac-1",
          vacancyTitle: "Backend",
          companyName: "Acme",
          dueAt: "2026-09-10T00:00:00Z",
          statusLabel: "En revisión",
        },
        { candidateName: "sin id" },
      ],
    })
    expect(detail).toEqual({
      key: "staleCandidates",
      sourceState: "ready",
      totalCount: 2,
      items: [
        {
          id: "app-1",
          applicationId: null,
          candidateProfileId: "cand-1",
          candidateName: "Ana",
          candidateTitle: "Backend Engineer",
          vacancyId: "vac-1",
          vacancyTitle: "Backend",
          companyName: "Acme",
          dueAt: "2026-09-10T00:00:00Z",
          statusLabel: "En revisión",
        },
      ],
      context: null,
    })
  })

  it("conserva el contexto parcial del detalle", () => {
    const detail = normalizeReminderDetail("staleCandidates", {
      sourceState: "partial",
      totalCount: 4,
      analyzed: 2,
      total: 9,
      items: [],
    })
    expect(detail.context).toEqual({ analyzed: 2, total: 9 })
  })

  it("marca como no disponible cuando el backend lo indica", () => {
    const detail = normalizeReminderDetail("pendingApprovals", {
      sourceState: "unavailable",
      totalCount: null,
      items: [],
    })
    expect(detail.sourceState).toBe("unavailable")
    expect(detail.items).toEqual([])
    expect(detail.context).toBeNull()
  })
})

describe("resolveReminderRowHref", () => {
  const baseItem = {
    id: "x",
    applicationId: null,
    candidateProfileId: null,
    candidateName: null,
    candidateTitle: null,
    vacancyId: null,
    vacancyTitle: null,
    companyName: null,
    dueAt: null,
    statusLabel: null,
  }

  it("apunta a entrevistas, candidatos y vacantes según la clave", () => {
    expect(
      resolveReminderRowHref("upcomingInterviews", { ...baseItem, id: "iv-1" })
    ).toBe("/portal-rrhh/interviews/iv-1")
    expect(
      resolveReminderRowHref("upcomingInterviews", {
        ...baseItem,
        id: "iv-1",
        vacancyId: "vac-1",
      })
    ).toBe("/portal-rrhh/interviews/iv-1?vacancyId=vac-1")
    expect(
      resolveReminderRowHref("pendingEvaluations", {
        ...baseItem,
        candidateProfileId: "cand-5",
        vacancyId: "vac-5",
      })
    ).toBe("/portal-rrhh/vacantes/vac-5?candidato=cand-5")
    expect(
      resolveReminderRowHref("pendingEvaluations", {
        ...baseItem,
        vacancyId: "vac-5",
      })
    ).toBe("/portal-rrhh/vacantes/vac-5")
    expect(
      resolveReminderRowHref("inactiveVacancies", { ...baseItem, id: "vac-8" })
    ).toBe("/portal-rrhh/vacantes/vac-8")
    expect(
      resolveReminderRowHref("pendingDocuments", {
        ...baseItem,
        candidateProfileId: "cand-9",
      })
    ).toBeNull()
    expect(
      resolveReminderRowHref("staleCandidates", {
        ...baseItem,
        candidateProfileId: "cand-1",
        vacancyId: "vac-1",
      })
    ).toBe("/portal-rrhh/vacantes/vac-1?candidato=cand-1")
    expect(
      resolveReminderRowHref("newCandidates", {
        ...baseItem,
        candidateProfileId: "cand-2",
        vacancyId: "vac-2",
      })
    ).toBe("/portal-rrhh/vacantes/vac-2?candidato=cand-2")
    expect(
      resolveReminderRowHref("overdueFollowUps", {
        ...baseItem,
        candidateProfileId: "cand-3",
        vacancyId: "vac-3",
      })
    ).toBe("/portal-rrhh/vacantes/vac-3?candidato=cand-3")
    expect(
      resolveReminderRowHref("vacanciesClosingSoon", {
        ...baseItem,
        vacancyId: "vac-9",
      })
    ).toBe("/portal-rrhh/vacantes/vac-9")
    expect(
      resolveReminderRowHref("pendingTechnicalSheets", {
        ...baseItem,
        candidateProfileId: "cand-4",
        vacancyId: "vac-4",
      })
    ).toBe("/portal-rrhh/vacantes/vac-4/candidatos/cand-4/technical-sheet")
    expect(
      resolveReminderRowHref("pendingTechnicalSheets", {
        ...baseItem,
        candidateProfileId: "cand-4",
      })
    ).toBeNull()
    expect(resolveReminderRowHref("pendingApprovals", baseItem)).toBeNull()
    expect(resolveReminderRowHref("staleCandidates", baseItem)).toBeNull()
  })
})

describe("reminderIncludesCandidate", () => {
  it("devuelve falso para recordatorios de vacante", () => {
    expect(reminderIncludesCandidate("vacanciesClosingSoon")).toBe(false)
    expect(reminderIncludesCandidate("inactiveVacancies")).toBe(false)
  })

  it("devuelve verdadero para el resto de recordatorios", () => {
    const peopleKeys: DashboardReminderKey[] = [
      "upcomingInterviews",
      "unconfirmedInterviews",
      "newCandidates",
      "staleCandidates",
      "pendingEvaluations",
      "pendingTechnicalSheets",
      "pendingApprovals",
      "overdueFollowUps",
      "pendingConsents",
      "pendingDocuments",
    ]
    for (const key of peopleKeys) {
      expect(reminderIncludesCandidate(key)).toBe(true)
    }
  })
})
