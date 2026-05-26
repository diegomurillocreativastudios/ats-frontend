import { describe, it, expect, vi, beforeEach } from "vitest"
import { apiClient } from "@/lib/api"
import {
    buildRecruiterReportQuery,
    coerceRecruiterReportResponse,
    fetchRecruiterReportByKey,
    fetchRecruiterReportForCatalogItem,
} from "@/lib/api/recruiter-report-runtime"

vi.mock("@/lib/api", () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}))

describe("recruiter-report-runtime", () => {
    beforeEach(() => {
        vi.mocked(apiClient.get).mockReset()
    })

    describe("buildRecruiterReportQuery", () => {
        it("returns an empty string when all filters are empty", () => {
            expect(buildRecruiterReportQuery({})).toBe("")
            expect(
                buildRecruiterReportQuery({ clientId: "", dateFrom: undefined })
            ).toBe("")
        })

        it("serializes scalar filters and trims whitespace", () => {
            const q = buildRecruiterReportQuery({
                clientId: "  abc  ",
                dateFrom: "2026-05-01",
                dateTo: "",
                page: 2,
            })
            expect(q).toBe("?clientId=abc&dateFrom=2026-05-01&page=2")
        })

        it("expands a {from,to} object into <key>From/<key>To params", () => {
            const q = buildRecruiterReportQuery({
                date: { from: "2026-05-01", to: "2026-05-31" },
            })
            expect(q).toBe("?dateFrom=2026-05-01&dateTo=2026-05-31")
        })

        it("appends arrays as repeated query params", () => {
            const q = buildRecruiterReportQuery({
                stageId: ["a", "b", ""],
            })
            expect(q).toBe("?stageId=a&stageId=b")
        })
    })

    describe("coerceRecruiterReportResponse", () => {
        it("returns empty defaults for malformed payloads", () => {
            expect(coerceRecruiterReportResponse(null)).toEqual({
                rows: [],
                totalCount: 0,
                extras: null,
            })
            expect(coerceRecruiterReportResponse("nope")).toEqual({
                rows: [],
                totalCount: 0,
                extras: null,
            })
        })

        it("parses { rows, totalCount } payloads", () => {
            const out = coerceRecruiterReportResponse({
                rows: [
                    { vacancyId: "v1", totalCandidates: 5 },
                    { vacancyId: "v2", totalCandidates: 7 },
                ],
                totalCount: 12,
            })
            expect(out.rows).toHaveLength(2)
            expect(out.totalCount).toBe(12)
        })

        it("derives totalCount from rows.length when missing", () => {
            const out = coerceRecruiterReportResponse({
                rows: [{ vacancyId: "v1" }],
            })
            expect(out.totalCount).toBe(1)
        })

        it("ignores non-object row entries", () => {
            const out = coerceRecruiterReportResponse({
                rows: [{ ok: true }, "skip", null, 42],
            })
            expect(out.rows).toHaveLength(1)
            expect(out.totalCount).toBe(1)
        })

        it("preserves non-rows/non-totalCount payload fields under `extras`", () => {
            const out = coerceRecruiterReportResponse({
                rows: [{ vacancyId: "v1" }],
                totalCount: 1,
                summary: { totalVacancies: 12, slaBreachedCount: 7 },
                aiComparison: {
                    metrics: [
                        { metric: "time-to-fill", benchmark: 45 },
                    ],
                    processes: [],
                },
            })
            expect(out.rows).toHaveLength(1)
            expect(out.totalCount).toBe(1)
            expect(out.extras).not.toBeNull()
            expect(
                (out.extras as Record<string, unknown>).summary
            ).toEqual({ totalVacancies: 12, slaBreachedCount: 7 })
            expect(
                (out.extras as Record<string, unknown>).aiComparison
            ).toBeTypeOf("object")
        })

        it("returns extras as null when the response has no additional fields", () => {
            const out = coerceRecruiterReportResponse({
                rows: [],
                totalCount: 0,
            })
            expect(out.extras).toBeNull()
        })
    })

    describe("fetchRecruiterReportByKey", () => {
        it("hits the catalog endpoint when one is provided", async () => {
            vi.mocked(apiClient.get).mockResolvedValueOnce({
                rows: [{ vacancyId: "v1" }],
                totalCount: 1,
            })

            const out = await fetchRecruiterReportByKey({
                reportKey: "vacancy-progress-by-client",
                endpoint: "/api/recruiter/reports/vacancy-progress-by-client",
                filters: { clientId: "acme" },
            })

            expect(apiClient.get).toHaveBeenCalledWith(
                "/api/recruiter/reports/vacancy-progress-by-client?clientId=acme"
            )
            expect(out.rows).toHaveLength(1)
            expect(out.totalCount).toBe(1)
        })

        it("falls back to the conventional URL when no endpoint is provided", async () => {
            vi.mocked(apiClient.get).mockResolvedValueOnce({
                rows: [],
                totalCount: 0,
            })

            await fetchRecruiterReportByKey({
                reportKey: "candidate-status-by-stage",
            })

            expect(apiClient.get).toHaveBeenCalledWith(
                "/api/recruiter/reports/candidate-status-by-stage"
            )
        })

        it("forwards the catalog item when using fetchRecruiterReportForCatalogItem", async () => {
            vi.mocked(apiClient.get).mockResolvedValueOnce({
                rows: [],
                totalCount: 0,
            })

            await fetchRecruiterReportForCatalogItem(
                {
                    reportKey: "vacancy-progress-by-client",
                    endpoint: "/api/recruiter/reports/vacancy-progress-by-client",
                },
                { dateFrom: "2026-05-01" }
            )

            expect(apiClient.get).toHaveBeenCalledWith(
                "/api/recruiter/reports/vacancy-progress-by-client?dateFrom=2026-05-01"
            )
        })
    })
})
