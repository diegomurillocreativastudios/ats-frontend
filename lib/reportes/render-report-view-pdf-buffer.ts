import { createPdfDebugLogger } from "@/lib/pdf/pdf-debug-log"
import { renderHtmlToPdfBuffer } from "@/lib/technical-sheet/html-to-pdf-chromium"

const REPORT_PDF_VIEWPORT = {
  width: 1440,
  height: 1200,
  deviceScaleFactor: 1,
} as const

/**
 * Renderiza HTML completo del reporte RRHH a PDF (A4).
 * Mismo pipeline Chromium que la ficha técnica (`renderHtmlToPdfBuffer`).
 */
export async function renderReportViewPdfBuffer(fullHtml: string): Promise<Buffer> {
  const log = createPdfDebugLogger("render")
  log("renderReportViewPdfBuffer: inicio", { htmlChars: fullHtml.length })

  const buffer = await renderHtmlToPdfBuffer(fullHtml, {
    mediaType: "screen",
    pdf: {
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    },
    viewport: REPORT_PDF_VIEWPORT,
    setContent: {
      waitUntil: "load",
      timeoutMs: 60_000,
    },
  })

  log("renderReportViewPdfBuffer: listo", { pdfBytes: buffer.length })
  return buffer
}
