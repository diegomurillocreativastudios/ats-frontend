import { describe, expect, it } from "vitest"
import {
  buildReportTemplateContext,
  supportsSchemaReportPipeline,
} from "@/lib/reportes/report-template-context-registry"

describe("supportsSchemaReportPipeline", () => {
  it("includes all catalog report keys with schema PDF", () => {
    expect(supportsSchemaReportPipeline("vacancy-progress-by-client")).toBe(true)
    expect(supportsSchemaReportPipeline("candidate-status-by-stage")).toBe(true)
    expect(supportsSchemaReportPipeline("technical-evaluations")).toBe(true)
    expect(supportsSchemaReportPipeline("recruitment-sources")).toBe(true)
    expect(supportsSchemaReportPipeline("preliminary-match-scores")).toBe(true)
    expect(supportsSchemaReportPipeline("time-to-hire-kpi")).toBe(true)
    expect(supportsSchemaReportPipeline("recruiter-productivity")).toBe(true)
    expect(supportsSchemaReportPipeline("salary-expectations")).toBe(true)
    expect(supportsSchemaReportPipeline("unknown-report")).toBe(false)
  })
})

describe("buildReportTemplateContext", () => {
  it("builds candidate-status context with stage distribution", () => {
    const ctx = buildReportTemplateContext({
      reportKey: "candidate-status-by-stage",
      reportName: "Estatus candidatos",
      rows: [
        {
          candidateName: "Ana",
          vacancyTitle: "Dev",
          currentStageName: "Entrevista",
          daysInStage: 5,
        },
        {
          candidateName: "Luis",
          vacancyTitle: "QA",
          currentStageName: "Entrevista",
          daysInStage: 2,
        },
      ],
      totalCount: 2,
      appliedFilters: { dateFrom: "2026-01-01", dateTo: "2026-01-31" },
      clientName: "Todos",
      generatedAt: "25/05/2026",
    })

    expect(ctx.totalCandidates).toBe("2")
    expect(Array.isArray(ctx.stageDistribution)).toBe(true)
    expect((ctx.stageDistribution as { name: string }[])[0]?.name).toBe(
      "Entrevista"
    )
    expect(Array.isArray(ctx.detailRows)).toBe(true)
  })

  it("builds time-to-hire-kpi context from extras.summary and aiComparison", () => {
    const ctx = buildReportTemplateContext({
      reportKey: "time-to-hire-kpi",
      reportName: "Time to Hire KPI",
      rows: [
        {
          clientId: "c1",
          clientName: "Appli AI",
          vacancyId: "v1",
          vacancyTitle: "React Frontend Developer",
          vacancyStatus: "Open",
          openedAt: "2026-03-27T19:51:11.516276Z",
          firstHireAt: null,
          isFilled: false,
          timeToFillDays: null,
          timeToHireDays: null,
          daysOpen: 59.2,
          isSlaBreached: true,
          averageDaysByStage: null,
          totalCandidates: 0,
          candidatesHired: 0,
        },
        {
          clientId: "c1",
          clientName: "Appli AI",
          vacancyId: "v2",
          vacancyTitle: "Backend Developer",
          vacancyStatus: "Filled",
          openedAt: "2026-02-01T00:00:00Z",
          firstHireAt: "2026-03-10T00:00:00Z",
          isFilled: true,
          timeToFillDays: 37,
          timeToHireDays: 30,
          daysOpen: 37,
          isSlaBreached: false,
          averageDaysByStage: null,
          totalCandidates: 5,
          candidatesHired: 1,
        },
      ],
      totalCount: 2,
      appliedFilters: { dateFrom: "2026-01-01", dateTo: "2026-05-31" },
      clientName: "Todos",
      generatedAt: "25/05/2026",
      extras: {
        summary: {
          totalVacancies: 12,
          filledVacancies: 1,
          openVacancies: 11,
          averageTimeToFillDays: 37,
          medianTimeToFillDays: 37,
          minTimeToFillDays: 37,
          maxTimeToFillDays: 37,
          averageTimeToHireDays: 30,
          medianTimeToHireDays: 30,
          averageDaysOpenUnfilled: 32.9,
          fillRatePercent: 8.33,
          slaBreachedCount: 7,
          slaThresholdDays: 30,
        },
        aiComparison: {
          metrics: [
            {
              metric: "time-to-fill",
              label: "Time to Fill",
              unit: "days",
              actual: 37,
              benchmark: 45,
              deltaAbsolute: -8,
              deltaPercent: -17.8,
              improvedVsBenchmark: true,
            },
            {
              metric: "fill-rate",
              label: "Fill Rate",
              unit: "percent",
              actual: 8.33,
              benchmark: 65,
              deltaAbsolute: -56.67,
              deltaPercent: -87.2,
              improvedVsBenchmark: false,
            },
          ],
          processes: [
            {
              processKey: "cv-parsing",
              processLabel: "CV parsing & structuring",
              aiMinutes: 3,
              manualMinutes: 20,
              deltaMinutes: 17,
              savingsPercent: 85,
            },
          ],
        },
      },
    })

    expect(ctx.totalVacancies).toBe("12")
    expect(ctx.filledVacancies).toBe("1")
    expect(ctx.openVacancies).toBe("11")
    expect(ctx.averageTimeToFillDays).toBe("37")
    expect(ctx.fillRatePercent).toBe("8.3%")
    expect(ctx.slaBreachedCount).toBe("7")
    expect(ctx.slaThresholdDays).toBe("30")
    expect(Array.isArray(ctx.aiMetrics)).toBe(true)
    expect((ctx.aiMetrics as Array<{ label: string }>)[0]?.label).toBe(
      "Time to Fill"
    )
    expect(Array.isArray(ctx.aiProcesses)).toBe(true)
    expect(
      (ctx.aiProcesses as Array<{ processLabel: string }>)[0]?.processLabel
    ).toBe("CV parsing & structuring")
    expect(Array.isArray(ctx.detailRows)).toBe(true)
    expect((ctx.detailRows as Array<Record<string, string>>).length).toBe(2)
    expect(
      (ctx.detailRows as Array<{ vacancyTitle: string }>)[0]?.vacancyTitle
    ).toBe("React Frontend Developer")
  })

  it("falls back to em-dash when time-to-hire-kpi metrics are null", () => {
    const ctx = buildReportTemplateContext({
      reportKey: "time-to-hire-kpi",
      reportName: "Time to Hire KPI",
      rows: [],
      totalCount: 0,
      appliedFilters: {},
      clientName: "Todos",
      generatedAt: "25/05/2026",
      extras: {
        summary: {
          totalVacancies: 0,
          filledVacancies: 0,
          openVacancies: 0,
          averageTimeToFillDays: null,
          medianTimeToFillDays: null,
          averageTimeToHireDays: null,
          fillRatePercent: 0,
          slaBreachedCount: 0,
          slaThresholdDays: 30,
        },
      },
    })

    expect(ctx.averageTimeToFillDays).toBe("—")
    expect(ctx.medianTimeToFillDays).toBe("—")
    expect(ctx.averageTimeToHireDays).toBe("—")
    expect(ctx.aiMetrics).toEqual([])
    expect(ctx.aiProcesses).toEqual([])
  })

  it("builds recruiter-productivity KPIs and detail rows", () => {
    const ctx = buildReportTemplateContext({
      reportKey: "recruiter-productivity",
      reportName: "Productividad del reclutador",
      rows: [
        {
          displayName: "Ana López",
          email: "ana@example.com",
          isAdmin: false,
          isRecruiter: true,
          applicationsManaged: 20,
          hires: 4,
          interviewsScheduled: 10,
          interviewsCompleted: 8,
          stageMoves: 15,
          openVacancies: 3,
          conversionPercent: 20,
          averageTimeToHireDays: 25,
          averagePreliminaryMatchScore: 72.5,
        },
        {
          displayName: "Carlos Ruiz",
          email: "carlos@example.com",
          isAdmin: true,
          isRecruiter: true,
          applicationsManaged: 30,
          hires: 6,
          interviewsScheduled: 12,
          interviewsCompleted: 9,
          stageMoves: 20,
          openVacancies: 5,
          conversionPercent: 20,
          averageTimeToHireDays: 30,
          averagePreliminaryMatchScore: 68,
        },
      ],
      totalCount: 2,
      appliedFilters: { dateFrom: "2026-01-01", dateTo: "2026-01-31" },
      clientName: "Todos",
      generatedAt: "25/05/2026",
    })

    expect(ctx.recruitersTotal).toBe("2")
    expect(ctx.totalApplicationsManaged).toBe("50")
    expect(ctx.totalHires).toBe("10")
    expect(ctx.totalInterviewsScheduled).toBe("22")
    expect(ctx.averageConversionPercent).toBe("20.0%")
    expect(ctx.topRecruiterName).toBe("Carlos Ruiz")
    expect(ctx.topRecruiterHires).toBe("6")
    expect(Array.isArray(ctx.recruiterRanking)).toBe(true)
    expect((ctx.recruiterRanking as Array<{ displayName: string }>)[0]?.displayName).toBe(
      "Carlos Ruiz"
    )
    expect(Array.isArray(ctx.detailRows)).toBe(true)
    expect(
      (ctx.detailRows as Array<{ displayName: string; roleLabel: string }>)[0]?.roleLabel
    ).toBe("Reclutador")
  })

  it("builds salary-expectations context from extras.summary and currency", () => {
    const ctx = buildReportTemplateContext({
      reportKey: "salary-expectations",
      reportName: "Pretensión salarial",
      rows: [
        {
          candidateName: "Ana López",
          vacancyTitle: "Frontend",
          clientName: "Acme",
          currentStageName: "Entrevista",
          pipelineStatus: "Activa",
          appliedAt: "2026-04-10T10:00:00Z",
          expectedSalaryUsd: 3500,
          vacancyMinSalaryUsd: 3000,
          vacancyMaxSalaryUsd: 4000,
          withinRange: true,
          gapAmountUsd: 0,
        },
        {
          candidateName: "Luis",
          vacancyTitle: "Backend",
          clientName: "Acme",
          currentStageName: "Screening",
          pipelineStatus: "Activa",
          appliedAt: "2026-04-12T10:00:00Z",
          expectedSalaryUsd: 4500,
          vacancyMinSalaryUsd: 3000,
          vacancyMaxSalaryUsd: 4000,
          withinRange: false,
          gapAmountUsd: 500,
        },
      ],
      totalCount: 2,
      appliedFilters: { dateFrom: "2026-04-01", dateTo: "2026-04-30" },
      clientName: "Acme",
      generatedAt: "25/05/2026",
      extras: {
        currency: "USD",
        summary: {
          totalApplicationsAnalyzed: 2,
          applicationsWithSalary: 2,
          averageUsd: 4000,
          medianUsd: 4000,
          minUsd: 3500,
          maxUsd: 4500,
          percentile25Usd: 3625,
          percentile75Usd: 4375,
          distribution: [
            { lowerBoundUsd: 3000, upperBoundUsd: 4000, count: 1, label: "3,000 – 4,000" },
            { lowerBoundUsd: 4000, upperBoundUsd: null, count: 1, label: "4,000+" },
          ],
          withinRangeCount: 1,
          aboveRangeCount: 1,
          belowRangeCount: 0,
        },
      },
    })

    expect(ctx.currency).toBe("USD")
    expect(ctx.salaryRowsTotal).toBe("2")
    expect(ctx.applicationsWithSalary).toBe("2")
    expect(ctx.coveragePercent).toBe("100.0%")
    expect(ctx.withinRangeCount).toBe("1")
    expect(ctx.aboveRangeCount).toBe("1")
    expect(ctx.withinRangePercent).toBe("50.0%")
    expect(typeof ctx.averageSalary).toBe("string")
    expect(String(ctx.averageSalary)).toContain("4")
    expect(Array.isArray(ctx.salaryDistribution)).toBe(true)
    expect((ctx.salaryDistribution as Array<{ count: string }>).length).toBe(2)
    expect(Array.isArray(ctx.detailRows)).toBe(true)
    expect(
      (ctx.detailRows as Array<{ rangeStatus: string }>)[0]?.rangeStatus
    ).toBe("Dentro del rango")
    expect(
      (ctx.detailRows as Array<{ rangeStatus: string }>)[1]?.rangeStatus
    ).toBe("Sobre el rango")
  })

  it("falls back to em-dash when salary-expectations summary is empty", () => {
    const ctx = buildReportTemplateContext({
      reportKey: "salary-expectations",
      reportName: "Pretensión salarial",
      rows: [],
      totalCount: 0,
      appliedFilters: {},
      clientName: "Todos",
      generatedAt: "25/05/2026",
    })

    expect(ctx.salaryRowsTotal).toBe("0")
    expect(ctx.averageSalary).toBe("—")
    expect(ctx.medianSalary).toBe("—")
    expect(ctx.salaryDistribution).toEqual([])
    expect(ctx.dominantBucketLabel).toBe("—")
  })

  it("builds recruitment-sources funnel KPIs", () => {
    const ctx = buildReportTemplateContext({
      reportKey: "recruitment-sources",
      reportName: "Fuentes",
      rows: [
        {
          sourceLabel: "LinkedIn",
          candidatesCount: 10,
          hiresCount: 2,
          conversionPercent: 20,
        },
      ],
      totalCount: 1,
      appliedFilters: { dateFrom: "2026-01-01", dateTo: "2026-01-31" },
      clientName: "Todos",
      generatedAt: "25/05/2026",
    })

    expect(ctx.totalCandidates).toBe("10")
    expect(ctx.totalHires).toBe("2")
    expect(Array.isArray(ctx.funnelStages)).toBe(true)
  })
})
