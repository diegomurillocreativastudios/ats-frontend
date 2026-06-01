import { describe, expect, it } from "vitest"
import { buildSalaryExpectationsTemplateContext } from "@/lib/reportes/salary-expectations-template-context"

describe("buildSalaryExpectationsTemplateContext", () => {
  it("aggregates KPIs and resolves the dominant bucket", () => {
    const ctx = buildSalaryExpectationsTemplateContext({
      totalCount: 3,
      currency: "USD",
      rows: [
        {
          candidateName: "Ana",
          expectedSalaryUsd: 3000,
          vacancyMinSalaryUsd: 2500,
          vacancyMaxSalaryUsd: 3500,
          withinRange: true,
          gapAmountUsd: 0,
        },
        {
          candidateName: "Luis",
          expectedSalaryUsd: 5000,
          vacancyMinSalaryUsd: 2500,
          vacancyMaxSalaryUsd: 3500,
          withinRange: false,
          gapAmountUsd: 1500,
        },
      ],
      summary: {
        totalApplicationsAnalyzed: 3,
        applicationsWithSalary: 2,
        averageUsd: 4000,
        medianUsd: 4000,
        minUsd: 3000,
        maxUsd: 5000,
        percentile25Usd: 3500,
        percentile75Usd: 4500,
        withinRangeCount: 1,
        aboveRangeCount: 1,
        belowRangeCount: 0,
        distribution: [
          { lowerBoundUsd: 2000, upperBoundUsd: 4000, count: 1, label: "2k–4k" },
          { lowerBoundUsd: 4000, upperBoundUsd: null, count: 2, label: "4k+" },
        ],
      },
    })

    expect(ctx.salaryRowsTotal).toBe("3")
    expect(ctx.applicationsWithSalary).toBe("2")
    expect(ctx.applicationsWithoutSalary).toBe("1")
    expect(ctx.coveragePercent).toBe("66.7%")
    expect(ctx.withinRangePercent).toBe("33.3%")
    expect(ctx.dominantBucketLabel).toBe("4k+")
    expect(ctx.dominantBucketCount).toBe("2")
    expect((ctx.detailRows as Array<{ rangeStatus: string }>)[1]?.rangeStatus).toBe(
      "Sobre el rango"
    )
  })

  it("returns em-dash KPIs when there is no summary", () => {
    const ctx = buildSalaryExpectationsTemplateContext({
      totalCount: 0,
      rows: [],
    })

    expect(ctx.salaryRowsTotal).toBe("0")
    expect(ctx.averageSalary).toBe("—")
    expect(ctx.coveragePercent).toBe("—")
    expect(ctx.salaryDistribution).toEqual([])
    expect(ctx.detailRows).toEqual([])
  })
})
