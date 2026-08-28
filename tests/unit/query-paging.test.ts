import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  QUERY_PAGE_SIZE_MAX,
  buildPageQuery,
  clampQueryPage,
  clampQueryPageSize,
  clampSearchLimit,
  fetchAllHeaderPagedList,
  fetchHeaderPagedList,
  readPagingMeta,
  unwrapListArray,
} from "@/lib/api/query-paging"
import { apiClient } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  apiClient: {
    getWithHeaders: vi.fn(),
  },
}))

function headersFrom(record: Record<string, string>): Headers {
  return new Headers(record)
}

describe("query paging helpers", () => {
  it("clamps page to 1-based integers", () => {
    expect(clampQueryPage(undefined)).toBe(1)
    expect(clampQueryPage(0)).toBe(1)
    expect(clampQueryPage(2.8)).toBe(2)
  })

  it("clamps pageSize to max 100", () => {
    expect(clampQueryPageSize(undefined)).toBe(50)
    expect(clampQueryPageSize(200)).toBe(QUERY_PAGE_SIZE_MAX)
    expect(clampQueryPageSize(20)).toBe(20)
  })

  it("clamps search limit to max 50", () => {
    expect(clampSearchLimit(20)).toBe(20)
    expect(clampSearchLimit(200)).toBe(50)
  })

  it("unwraps arrays and common envelopes", () => {
    expect(unwrapListArray([{ id: 1 }])).toEqual([{ id: 1 }])
    expect(unwrapListArray({ candidates: [{ id: 2 }] })).toEqual([{ id: 2 }])
    expect(unwrapListArray({ vacancies: [{ id: 3 }] })).toEqual([{ id: 3 }])
    expect(unwrapListArray({ stages: [{ id: 4 }] })).toEqual([{ id: 4 }])
    expect(unwrapListArray({ statuses: [{ id: 5 }] })).toEqual([{ id: 5 }])
    expect(unwrapListArray(null)).toEqual([])
  })

  it("appends page params without dropping existing query", () => {
    expect(buildPageQuery("/api/Templates?type=Document", 2, 50)).toBe(
      "/api/Templates?type=Document&page=2&pageSize=50"
    )
  })

  it("reads X-Total-Count from headers", () => {
    const meta = readPagingMeta(
      headersFrom({
        "X-Total-Count": "120",
        "X-Page": "2",
        "X-Page-Size": "50",
      }),
      [],
      { page: 2, pageSize: 50, itemCount: 50 }
    )
    expect(meta.totalCount).toBe(120)
    expect(meta.page).toBe(2)
    expect(meta.pageSize).toBe(50)
    expect(meta.hasNextPage).toBe(true)
  })

  it("falls back to full-page inference when headers are missing", () => {
    const full = readPagingMeta(headersFrom({}), [], {
      page: 1,
      pageSize: 50,
      itemCount: 50,
    })
    expect(full.hasNextPage).toBe(true)
    const short = readPagingMeta(headersFrom({}), [], {
      page: 1,
      pageSize: 50,
      itemCount: 12,
    })
    expect(short.hasNextPage).toBe(false)
    expect(short.totalCount).toBe(12)
  })
})

describe("fetchHeaderPagedList", () => {
  beforeEach(() => {
    vi.mocked(apiClient.getWithHeaders).mockReset()
  })

  it("requests page and pageSize and maps items from an array body", async () => {
    vi.mocked(apiClient.getWithHeaders).mockResolvedValueOnce({
      data: [{ id: "a" }, { id: "b" }],
      headers: headersFrom({
        "X-Total-Count": "2",
        "X-Page": "1",
        "X-Page-Size": "50",
      }),
    })

    const result = await fetchHeaderPagedList("/api/recruiter/candidates/all", {
      page: 1,
      pageSize: 50,
    })

    expect(apiClient.getWithHeaders).toHaveBeenCalledWith(
      "/api/recruiter/candidates/all?page=1&pageSize=50"
    )
    expect(result.items).toHaveLength(2)
    expect(result.totalCount).toBe(2)
  })

  it("fetches all pages until X-Total-Count is covered", async () => {
    vi.mocked(apiClient.getWithHeaders)
      .mockResolvedValueOnce({
        data: [{ id: 1 }],
        headers: headersFrom({
          "X-Total-Count": "2",
          "X-Page": "1",
          "X-Page-Size": "1",
        }),
      })
      .mockResolvedValueOnce({
        data: [{ id: 2 }],
        headers: headersFrom({
          "X-Total-Count": "2",
          "X-Page": "2",
          "X-Page-Size": "1",
        }),
      })

    const items = await fetchAllHeaderPagedList("/api/recruiter/vacancies", 1)
    expect(items).toEqual([{ id: 1 }, { id: 2 }])
    expect(apiClient.getWithHeaders).toHaveBeenCalledTimes(2)
  })
})
