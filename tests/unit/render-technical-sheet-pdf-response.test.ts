import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TechnicalSheetPayload } from "@/lib/api/technical-sheet"

const renderHtmlToPdfBuffer = vi.fn()
const renderPaginatedTechnicalSheetPdfFromInterpolated = vi.fn()
const buildTechnicalSheetPdfKitBuffer = vi.fn()

vi.mock("@/lib/technical-sheet/html-to-pdf-chromium", () => ({
  renderHtmlToPdfBuffer,
}))

vi.mock("@/lib/technical-sheet/technical-sheet-pdf-render-paginated", () => ({
  renderPaginatedTechnicalSheetPdfFromInterpolated,
}))

vi.mock("@/lib/technical-sheet/build-technical-sheet-pdfkit", () => ({
  buildTechnicalSheetPdfKitBuffer,
}))

vi.mock("@/lib/technical-sheet/inline-preview-html-images-for-pdf", () => ({
  inlineVisibleLogoInPreviewHtml: vi.fn(async (html: string) => html),
}))

vi.mock("@/lib/technical-sheet/resolve-visible-logo-data-uri", () => ({
  resolveVisibleLogoDataUriForPdf: vi.fn(async () => "data:image/png;base64,abc"),
}))

vi.mock("@/lib/templates/technical-sheet-template", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/templates/technical-sheet-template")>()
  return {
    ...actual,
    findTechnicalSheetDocumentTemplate: vi.fn(() => ({
      id: 1,
      type: "Document",
      name: "Ficha",
      contentTemplate: "<article class='ts-article'><section><h2>X</h2></section></article>",
      isTechnicalSheet: true,
      isReport: false,
    })),
  }
})

const previewDoc = `<!DOCTYPE html><html><body><main class="technical-sheet-doc"><section class="technical-sheet-page"><article class="ts-article"></article></section></main></body></html>`

const baseInput = {
  payload: {} as TechnicalSheetPayload,
  templates: [],
  candidateProfileId: "0878c983-ca0e-4db0-b101-1b708546f78a",
  vacancyTitleFallback: "RPA",
  preferPdfKit: false,
}

describe("renderTechnicalSheetPdfBuffer", () => {
  beforeEach(() => {
    vi.resetModules()
    renderHtmlToPdfBuffer.mockReset()
    renderPaginatedTechnicalSheetPdfFromInterpolated.mockReset()
    buildTechnicalSheetPdfKitBuffer.mockReset()
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
  })

  it("throws when preview Chromium fails instead of falling back to server template", async () => {
    renderHtmlToPdfBuffer.mockRejectedValue(new Error("chromium preview failed"))
    renderPaginatedTechnicalSheetPdfFromInterpolated.mockResolvedValue(Buffer.from("%PDF-server"))

    const { renderTechnicalSheetPdfBuffer } = await import(
      "@/lib/technical-sheet/render-technical-sheet-pdf-response"
    )

    await expect(
      renderTechnicalSheetPdfBuffer({
        ...baseInput,
        previewHtml: previewDoc,
      })
    ).rejects.toThrow("chromium preview failed")

    expect(renderHtmlToPdfBuffer).toHaveBeenCalled()
    expect(renderPaginatedTechnicalSheetPdfFromInterpolated).not.toHaveBeenCalled()
  })

  it("uses preview HTML when Chromium succeeds", async () => {
    renderHtmlToPdfBuffer.mockResolvedValue(Buffer.from("%PDF-preview"))

    const { renderTechnicalSheetPdfBuffer } = await import(
      "@/lib/technical-sheet/render-technical-sheet-pdf-response"
    )

    const buf = await renderTechnicalSheetPdfBuffer({
      ...baseInput,
      previewHtml: previewDoc,
    })

    expect(buf.toString("utf8")).toBe("%PDF-preview")
    expect(renderPaginatedTechnicalSheetPdfFromInterpolated).not.toHaveBeenCalled()
  })
})
