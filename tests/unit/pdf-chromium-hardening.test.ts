import { afterEach, describe, expect, it, vi } from "vitest"
import {
  assertTechnicalSheetPdfRateLimit,
  getTechnicalSheetPdfSemaphoreSnapshotForTests,
  resetTechnicalSheetPdfConcurrencyForTests,
  TechnicalSheetPdfBusyError,
  TechnicalSheetPdfRateLimitError,
  tryAcquireTechnicalSheetPdfSlot,
  withTechnicalSheetPdfSlot,
} from "@/lib/technical-sheet/pdf-chromium-concurrency"
import {
  assertTechnicalSheetPdfHtmlSize,
  isValidTechnicalSheetPreviewHtml,
  TECHNICAL_SHEET_PDF_MAX_HTML_CHARS,
} from "@/lib/technical-sheet/validate-technical-sheet-preview-html"
import { resolveSetContentTimeoutMs } from "@/lib/technical-sheet/html-to-pdf-chromium"
import {
  REPORT_PDF_MAX_ROWS,
  TECHNICAL_SHEET_PDF_RATE_LIMIT_MAX,
  TECHNICAL_SHEET_PDF_SET_CONTENT_TIMEOUT_MS,
} from "@/lib/technical-sheet/pdf-chromium-limits"
import { buildPdfChromiumLaunchEnv } from "@/lib/technical-sheet/pdf-chromium-launch"

const validDoc = `<!DOCTYPE html><html><head></head><body><main class="technical-sheet-doc"><section class="technical-sheet-page"></section></main></body></html>`

describe("technical sheet PDF resource limits", () => {
  it("uses a fixed setContent timeout (does not scale with HTML size)", () => {
    expect(resolveSetContentTimeoutMs("x".repeat(50_000))).toBe(
      TECHNICAL_SHEET_PDF_SET_CONTENT_TIMEOUT_MS
    )
    expect(resolveSetContentTimeoutMs("x".repeat(500_000))).toBe(
      TECHNICAL_SHEET_PDF_SET_CONTENT_TIMEOUT_MS
    )
  })

  it("rejects oversized preview HTML", () => {
    const oversized = `${validDoc}${"a".repeat(TECHNICAL_SHEET_PDF_MAX_HTML_CHARS)}`
    expect(isValidTechnicalSheetPreviewHtml(oversized)).toBe(false)
  })

  it("assertTechnicalSheetPdfHtmlSize throws 413 for oversized payloads", () => {
    const huge = "x".repeat(TECHNICAL_SHEET_PDF_MAX_HTML_CHARS + 1)
    try {
      assertTechnicalSheetPdfHtmlSize(huge)
      expect.unreachable("should have thrown")
    } catch (e) {
      const err = e as Error & { status?: number }
      expect(err.status).toBe(413)
    }
  })

  it("exposes a positive report row cap", () => {
    expect(REPORT_PDF_MAX_ROWS).toBeGreaterThan(0)
  })
})

describe("technical sheet PDF concurrency and quota", () => {
  afterEach(() => {
    resetTechnicalSheetPdfConcurrencyForTests()
  })

  it("returns null from tryAcquire when the semaphore is full", () => {
    resetTechnicalSheetPdfConcurrencyForTests({ maxConcurrent: 1 })
    const release = tryAcquireTechnicalSheetPdfSlot()
    expect(release).not.toBeNull()
    expect(tryAcquireTechnicalSheetPdfSlot()).toBeNull()
    release?.()
    expect(tryAcquireTechnicalSheetPdfSlot()).not.toBeNull()
  })

  it("withTechnicalSheetPdfSlot throws 503 when busy", async () => {
    resetTechnicalSheetPdfConcurrencyForTests({ maxConcurrent: 1 })
    const release = tryAcquireTechnicalSheetPdfSlot()
    expect(release).not.toBeNull()
    await expect(withTechnicalSheetPdfSlot(async () => "ok")).rejects.toBeInstanceOf(
      TechnicalSheetPdfBusyError
    )
    try {
      await withTechnicalSheetPdfSlot(async () => "ok")
    } catch (e) {
      expect((e as TechnicalSheetPdfBusyError).status).toBe(503)
    }
    release?.()
  })

  it("rate limit throws 429 with Retry-After budget", () => {
    resetTechnicalSheetPdfConcurrencyForTests({ maxConcurrent: 2 })
    const key = "user:rate-test"
    for (let i = 0; i < TECHNICAL_SHEET_PDF_RATE_LIMIT_MAX; i++) {
      assertTechnicalSheetPdfRateLimit(key)
    }
    try {
      assertTechnicalSheetPdfRateLimit(key)
      expect.unreachable("should have thrown")
    } catch (e) {
      expect(e).toBeInstanceOf(TechnicalSheetPdfRateLimitError)
      const err = e as TechnicalSheetPdfRateLimitError
      expect(err.status).toBe(429)
      expect(err.retryAfterSec).toBeGreaterThanOrEqual(1)
    }
  })

  it("releases the semaphore after work completes", async () => {
    resetTechnicalSheetPdfConcurrencyForTests({ maxConcurrent: 1 })
    await withTechnicalSheetPdfSlot(async () => "done")
    expect(getTechnicalSheetPdfSemaphoreSnapshotForTests().active).toBe(0)
  })
})

describe("buildPdfChromiumLaunchEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("does not forward application secrets", () => {
    vi.stubEnv("PATH", "/usr/bin")
    vi.stubEnv("HOME", "/home/nextjs")
    vi.stubEnv("API_URL", "https://api.secret.internal")
    vi.stubEnv("BACKEND_URL", "https://backend.secret.internal")
    vi.stubEnv("DATABASE_URL", "postgres://secret")
    const env = buildPdfChromiumLaunchEnv()
    expect(env.PATH).toBe("/usr/bin")
    expect(env.HOME).toBe("/home/nextjs")
    expect(env.API_URL).toBeUndefined()
    expect(env.BACKEND_URL).toBeUndefined()
    expect(env.DATABASE_URL).toBeUndefined()
  })
})
