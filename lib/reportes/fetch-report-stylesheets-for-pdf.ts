import { createPdfDebugLogger, timedStep } from "@/lib/pdf/pdf-debug-log"

/**
 * Descarga CSS de `<link rel="stylesheet">` en el servidor para inyectarlo en `<style>`.
 * Timeout 5s por hoja; un fallo no bloquea el PDF.
 */
const FETCH_ONE_MS = 5_000
const MAX_SHEETS = 40
const MAX_CHARS_PER_SHEET = 280_000

export interface FetchStylesheetsResult {
  css: string
  fetched: number
  failed: number
  warnings: string[]
}

export async function fetchStylesheetsTextForPdf(
  hrefs: string[],
  budgetChars: number
): Promise<string> {
  const result = await fetchStylesheetsForPdfDetailed(hrefs, budgetChars)
  for (const warning of result.warnings) {
    console.warn("[pdf-css]", warning)
  }
  return result.css
}

export async function fetchStylesheetsForPdfDetailed(
  hrefs: string[],
  budgetChars: number
): Promise<FetchStylesheetsResult> {
  const log = createPdfDebugLogger("css")

  if (budgetChars <= 0 || hrefs.length === 0) {
    return { css: "", fetched: 0, failed: 0, warnings: [] }
  }

  return timedStep("fetchStylesheets (server)", async () => {
    const chunks: string[] = []
    const warnings: string[] = []
    let used = 0
    let fetched = 0
    let failed = 0
    const list = hrefs.slice(0, MAX_SHEETS)

    for (const href of list) {
      if (used >= budgetChars) break
      const remaining = budgetChars - used
      if (remaining < 100) break

      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), FETCH_ONE_MS)
        let res: Response
        try {
          res = await fetch(href, {
            method: "GET",
            signal: controller.signal,
            redirect: "follow",
            cache: "no-store",
            headers: {
              Accept: "text/css,*/*;q=0.1",
              "User-Agent": "ATS-Reportes-PDF/1.0",
            },
          })
        } finally {
          clearTimeout(timer)
        }

        if (!res.ok) {
          failed += 1
          warnings.push(`CSS omitido (${res.status}): ${href}`)
          continue
        }

        const text = await res.text()
        const cap = Math.min(MAX_CHARS_PER_SHEET, remaining - 80)
        if (cap <= 0) continue
        const slice = text.slice(0, cap)
        const safeComment = href.replace(/\*\//g, "* /").slice(0, 200)
        chunks.push(`\n/* pdf-inlined: ${safeComment} */\n${slice}`)
        used += slice.length + 80
        fetched += 1
      } catch (error: unknown) {
        failed += 1
        const message = error instanceof Error ? error.message : String(error)
        warnings.push(`CSS omitido (${message}): ${href}`)
        log("stylesheet fetch failed", { href, message })
      }
    }

    return {
      css: chunks.join("\n"),
      fetched,
      failed,
      warnings,
    }
  })
}
