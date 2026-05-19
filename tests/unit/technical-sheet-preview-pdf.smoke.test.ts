import { existsSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { buildPaginatedTechnicalSheetSrcDoc } from "@/lib/technical-sheet/build-paginated-technical-sheet-src-doc"
import { renderTechnicalSheetPdfBuffer } from "@/lib/technical-sheet/render-technical-sheet-pdf-response"

const hasLocalChrome =
  existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome") ||
  Boolean(process.env.PUPPETEER_EXECUTABLE_PATH?.trim())

const previewDoc = buildPaginatedTechnicalSheetSrcDoc([
  `<section class="technical-sheet-page" style="width:816px;height:1056px;position:relative;background:#fff"><article class="ts-article"><section><h2>Prueba PDF</h2><p>Contenido de smoke test.</p></section></article></section>`,
])

describe.skipIf(!hasLocalChrome)("technical sheet preview PDF (real Chromium)", () => {
  it(
    "renders preview HTML to a valid PDF buffer",
    async () => {
      const buf = await renderTechnicalSheetPdfBuffer({
        payload: { candidate: { fullName: "Smoke Test" } },
        templates: [],
        candidateProfileId: "00000000-0000-0000-0000-000000000001",
        vacancyTitleFallback: "RPA",
        previewHtml: previewDoc,
      })

      expect(buf.length).toBeGreaterThan(1000)
      expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF")
    },
    120_000
  )
})
