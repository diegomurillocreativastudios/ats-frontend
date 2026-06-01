import { describe, expect, it } from "vitest"
import { buildRecruiterProductivityTemplateContext } from "@/lib/reportes/recruiter-productivity-template-context"

describe("buildRecruiterProductivityTemplateContext", () => {
  it("aggregates KPIs and ranks recruiters by hires", () => {
    const ctx = buildRecruiterProductivityTemplateContext({
      totalCount: 2,
      rows: [
        { displayName: "Ana", applicationsManaged: 10, hires: 2, interviewsScheduled: 4, interviewsCompleted: 3 },
        { displayName: "Luis", applicationsManaged: 5, hires: 5, interviewsScheduled: 2, interviewsCompleted: 1 },
      ],
    })

    expect(ctx.recruitersTotal).toBe("2")
    expect(ctx.totalApplicationsManaged).toBe("15")
    expect(ctx.totalHires).toBe("7")
    expect(ctx.averageConversionPercent).toBe("46.7%")
    expect(ctx.interviewCompletionRate).toBe("66.7%")
    expect(ctx.topRecruiterName).toBe("Luis")
    expect((ctx.recruiterRanking as Array<{ displayName: string }>)[0]?.displayName).toBe(
      "Luis"
    )
  })
})
