import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TechnicalSheetPayload } from "@/lib/api/technical-sheet"

const renderHtmlToPdfBuffer = vi.fn()
const renderPaginatedTechnicalSheetPdfFromInterpolated = vi.fn()
const buildTechnicalSheetPdfKitBuffer = vi.fn()
const renderSchemaToHtmlMock = vi.fn()

vi.mock("@/lib/technical-sheet/html-to-pdf-chromium", () => ({
  renderHtmlToPdfBuffer,
}))

vi.mock("@/lib/technical-sheet/technical-sheet-pdf-render-paginated", () => ({
  renderPaginatedTechnicalSheetPdfFromInterpolated,
}))

vi.mock("@/lib/technical-sheet/build-technical-sheet-pdfkit", () => ({
  buildTechnicalSheetPdfKitBuffer,
}))

vi.mock("@/lib/technical-sheet/schema/render-technical-sheet-schema-to-html", () => ({
  renderTechnicalSheetSchemaToHtml: (...args: unknown[]) =>
    renderSchemaToHtmlMock(...args),
}))

vi.mock("@/lib/technical-sheet/technical-sheet-template-context", () => ({
  buildTechnicalSheetTemplateContext: vi.fn(() => ({
    header: { fullName: "Ana", address: "", englishLevel: "" },
    logoUrl: "data:image/png;base64,abc",
  })),
}))

vi.mock("@/lib/technical-sheet/inline-preview-html-images-for-pdf", () => ({
  inlineVisibleLogoInPreviewHtml: vi.fn(async (html: string) => html),
}))

vi.mock("@/lib/technical-sheet/resolve-visible-logo-data-uri", () => ({
  resolveVisibleLogoDataUriForPdf: vi.fn(async () => "data:image/png;base64,abc"),
}))

vi.mock("@/lib/technical-sheet/server-public-app-url", () => ({
  buildVisibleLogoUrlForTechnicalSheet: vi.fn(() => ""),
}))

vi.mock("@/lib/templates/technical-sheet-template", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/templates/technical-sheet-template")>()
  return {
    ...actual,
    findTechnicalSheetDocumentTemplate: vi.fn(() => ({
      id: 1,
      type: "Document",
      name: "Ficha",
      contentTemplate: JSON.stringify({
        version: 1,
        kind: "technical-sheet",
        sections: [{ type: "paragraph", title: "Resumen", text: "{{candidate.profileSummary}}" }],
      }),
      isTechnicalSheet: true,
      isReport: false,
    })),
  }
})

const baseInput = {
  payload: {} as TechnicalSheetPayload,
  templates: [],
  candidateProfileId: "0878c983-ca0e-4db0-b101-1b708546f78a",
  vacancyTitleFallback: "RPA",
}

describe("renderTechnicalSheetPdfBuffer", () => {
  beforeEach(() => {
    vi.resetModules()
    renderHtmlToPdfBuffer.mockReset()
    renderPaginatedTechnicalSheetPdfFromInterpolated.mockReset()
    buildTechnicalSheetPdfKitBuffer.mockReset()
    renderSchemaToHtmlMock.mockReset()
    renderSchemaToHtmlMock.mockReturnValue("<p>schema</p>")
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
  })

  it("uses schema Chromium pipeline by default", async () => {
    renderPaginatedTechnicalSheetPdfFromInterpolated.mockResolvedValue(
      Buffer.from("%PDF-schema-chromium")
    )

    const { renderTechnicalSheetPdfBuffer } = await import(
      "@/lib/technical-sheet/render-technical-sheet-pdf-response"
    )

    const result = await renderTechnicalSheetPdfBuffer(baseInput)

    expect(result.buffer.toString("utf8")).toBe("%PDF-schema-chromium")
    expect(result.engine).toBe("chromium")
    expect(result.fallbackFrom).toBeUndefined()
    expect(renderPaginatedTechnicalSheetPdfFromInterpolated).toHaveBeenCalled()
    expect(renderHtmlToPdfBuffer).not.toHaveBeenCalled()
    expect(buildTechnicalSheetPdfKitBuffer).not.toHaveBeenCalled()
  })

  it("uses PDFKit schema pipeline when engine is pdfkit", async () => {
    buildTechnicalSheetPdfKitBuffer.mockResolvedValue(Buffer.from("%PDF-kit"))

    const { renderTechnicalSheetPdfBuffer } = await import(
      "@/lib/technical-sheet/render-technical-sheet-pdf-response"
    )

    const result = await renderTechnicalSheetPdfBuffer({
      ...baseInput,
      engine: "pdfkit",
    })

    expect(result.buffer.toString("utf8")).toBe("%PDF-kit")
    expect(result.engine).toBe("pdfkit")
    expect(buildTechnicalSheetPdfKitBuffer).toHaveBeenCalled()
    expect(renderHtmlToPdfBuffer).not.toHaveBeenCalled()
    expect(renderPaginatedTechnicalSheetPdfFromInterpolated).not.toHaveBeenCalled()
  })

  it("uses schema Chromium pipeline when engine is chromium (never client HTML)", async () => {
    renderPaginatedTechnicalSheetPdfFromInterpolated.mockResolvedValue(
      Buffer.from("%PDF-schema-chromium")
    )

    const { renderTechnicalSheetPdfBuffer } = await import(
      "@/lib/technical-sheet/render-technical-sheet-pdf-response"
    )

    const result = await renderTechnicalSheetPdfBuffer({
      ...baseInput,
      engine: "chromium",
    })

    expect(result.buffer.toString("utf8")).toBe("%PDF-schema-chromium")
    expect(result.engine).toBe("chromium")
    expect(renderPaginatedTechnicalSheetPdfFromInterpolated).toHaveBeenCalled()
    expect(renderHtmlToPdfBuffer).not.toHaveBeenCalled()
    expect(buildTechnicalSheetPdfKitBuffer).not.toHaveBeenCalled()
  })

  it("falls back to PDFKit when Chromium launch fails", async () => {
    renderPaginatedTechnicalSheetPdfFromInterpolated.mockRejectedValue(
      new Error("chromium schema failed")
    )
    buildTechnicalSheetPdfKitBuffer.mockResolvedValue(Buffer.from("%PDF-kit-fallback"))

    const { renderTechnicalSheetPdfBuffer } = await import(
      "@/lib/technical-sheet/render-technical-sheet-pdf-response"
    )

    const result = await renderTechnicalSheetPdfBuffer({
      ...baseInput,
      engine: "chromium",
    })

    expect(result.buffer.toString("utf8")).toBe("%PDF-kit-fallback")
    expect(result.engine).toBe("pdfkit")
    expect(result.fallbackFrom).toBe("chromium")
    expect(buildTechnicalSheetPdfKitBuffer).toHaveBeenCalled()
  })

  it("does not fall back when the schema template is missing", async () => {
    const { findTechnicalSheetDocumentTemplate } = await import(
      "@/lib/templates/technical-sheet-template"
    )
    vi.mocked(findTechnicalSheetDocumentTemplate).mockReturnValueOnce(null as never)

    const { renderTechnicalSheetPdfBuffer, TechnicalSheetPdfError } = await import(
      "@/lib/technical-sheet/render-technical-sheet-pdf-response"
    )

    await expect(
      renderTechnicalSheetPdfBuffer({
        ...baseInput,
        engine: "chromium",
      })
    ).rejects.toBeInstanceOf(TechnicalSheetPdfError)

    expect(buildTechnicalSheetPdfKitBuffer).not.toHaveBeenCalled()
  })
})
