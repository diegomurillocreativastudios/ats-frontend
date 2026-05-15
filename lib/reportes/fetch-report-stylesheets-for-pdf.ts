/**
 * Descarga CSS de `<link rel="stylesheet">` en el servidor para inyectarlo en `<style>`.
 * Evita que Chromium cargue muchas hojas por red dentro de `setContent` (frágil en Vercel).
 */
const FETCH_ONE_MS = 12_000
const MAX_SHEETS = 40
const MAX_CHARS_PER_SHEET = 280_000

export async function fetchStylesheetsTextForPdf(
  hrefs: string[],
  budgetChars: number
): Promise<string> {
  if (budgetChars <= 0 || hrefs.length === 0) return ""

  const chunks: string[] = []
  let used = 0
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
      if (!res.ok) continue

      const text = await res.text()
      const cap = Math.min(MAX_CHARS_PER_SHEET, remaining - 80)
      if (cap <= 0) continue
      const slice = text.slice(0, cap)
      const safeComment = href.replace(/\*\//g, "* /").slice(0, 200)
      chunks.push(`\n/* pdf-inlined: ${safeComment} */\n${slice}`)
      used += slice.length + 80
    } catch {
      /* hoja lenta, inválida o bloqueada: seguir con el resto */
    }
  }

  return chunks.join("\n")
}
