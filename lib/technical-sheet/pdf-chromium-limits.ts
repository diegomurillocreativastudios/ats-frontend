/**
 * Presupuesto de recursos para generación PDF con Chromium (SSRF / abuso).
 * Ajustable vía env en runtime sin redeploy de lógica.
 */

function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.floor(n)
}

/** Tope de caracteres HTML aceptados antes de Chromium (preview y plantilla). */
export const TECHNICAL_SHEET_PDF_MAX_HTML_CHARS = readPositiveInt(
  process.env.TECHNICAL_SHEET_PDF_MAX_HTML_CHARS,
  1_000_000
)

/** Timeout único de `page.setContent` (no escala con el tamaño del HTML). */
export const TECHNICAL_SHEET_PDF_SET_CONTENT_TIMEOUT_MS = readPositiveInt(
  process.env.TECHNICAL_SHEET_PDF_SET_CONTENT_TIMEOUT_MS,
  45_000
)

/** Timeout de `puppeteer.launch`. */
export const TECHNICAL_SHEET_PDF_LAUNCH_TIMEOUT_MS = readPositiveInt(
  process.env.TECHNICAL_SHEET_PDF_LAUNCH_TIMEOUT_MS,
  30_000
)

/** Espera máxima por imagen (en paralelo) antes de `page.pdf`. */
export const TECHNICAL_SHEET_PDF_IMAGE_WAIT_MS = readPositiveInt(
  process.env.TECHNICAL_SHEET_PDF_IMAGE_WAIT_MS,
  5_000
)

/** Máximo de imágenes a esperar en el documento. */
export const TECHNICAL_SHEET_PDF_MAX_IMAGES = readPositiveInt(
  process.env.TECHNICAL_SHEET_PDF_MAX_IMAGES,
  50
)

/** Máximo de hojas Letter en el pipeline paginado. */
export const TECHNICAL_SHEET_PDF_MAX_PAGES = readPositiveInt(
  process.env.TECHNICAL_SHEET_PDF_MAX_PAGES,
  40
)

/** Browsers Chromium concurrentes por instancia Node. */
export const TECHNICAL_SHEET_PDF_MAX_CONCURRENT = readPositiveInt(
  process.env.TECHNICAL_SHEET_PDF_MAX_CONCURRENT,
  2
)

/** Ventana de cuota por usuario (ms). */
export const TECHNICAL_SHEET_PDF_RATE_LIMIT_WINDOW_MS = readPositiveInt(
  process.env.TECHNICAL_SHEET_PDF_RATE_LIMIT_WINDOW_MS,
  60_000
)

/** Máximo de generaciones PDF por usuario dentro de la ventana. */
export const TECHNICAL_SHEET_PDF_RATE_LIMIT_MAX = readPositiveInt(
  process.env.TECHNICAL_SHEET_PDF_RATE_LIMIT_MAX,
  10
)

/** Tope transversal de filas en reportes PDFKit. */
export const REPORT_PDF_MAX_ROWS = readPositiveInt(
  process.env.REPORT_PDF_MAX_ROWS,
  5_000
)
