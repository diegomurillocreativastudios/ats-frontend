/**
 * Mide tiempos de Chromium/PDF simulando Vercel (VERCEL=1).
 * Uso: npx tsx scripts/measure-pdf-timing.ts
 */
import { PdfTimingCollector, setActivePdfTiming } from "../lib/pdf/pdf-timing"
import { renderReportViewPdfBuffer } from "../lib/reportes/render-report-view-pdf-buffer"

process.env.VERCEL = "1"
process.env.REPORT_PDF_DEBUG = "1"
process.env.CHROMIUM_PACK_URL =
  process.env.CHROMIUM_PACK_URL ??
  "https://dev-visible-outsource-ats-ai.vercel.app/chromium-pack.tar"

const html = `<!DOCTYPE html><html><body><h1>PDF OK</h1></body></html>`

async function main() {
  const timing = new PdfTimingCollector()
  setActivePdfTiming(timing)

  console.log("CHROMIUM_PACK_URL:", process.env.CHROMIUM_PACK_URL)

  try {
    const buf = await renderReportViewPdfBuffer(html)
    const entries = timing.getEntries()
    console.log("\n| Paso | ms | Resultado |")
    console.log("|------|-----|-----------|")
    for (const e of entries) {
      const label = e.detail ? `${e.result} (${e.detail.slice(0, 80)})` : e.result
      console.log(`| ${e.step} | ${e.ms} | ${label} |`)
    }
    console.log(`| **total** | ${timing.getTotalMs()} | pdf ${buf.length} bytes |`)
  } catch (error) {
    console.error("FAIL:", error)
    for (const e of timing.getEntries()) {
      console.log(`- ${e.step}: ${e.ms}ms ${e.result} ${e.detail ?? ""}`)
    }
    process.exitCode = 1
  } finally {
    setActivePdfTiming(null)
  }
}

void main()
