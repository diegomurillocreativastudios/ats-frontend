import { timedStep } from "@/lib/pdf/pdf-debug-log"

const HEAD_TIMEOUT_MS = 5_000
const RANGE_TIMEOUT_MS = 5_000
const MIN_PACK_BYTES = 50 * 1024 * 1024
const RANGE_HEADER = "bytes=0-1023"

const ACCEPTABLE_CONTENT_TYPES = [
  "application/x-tar",
  "application/octet-stream",
  "application/gzip",
  "binary/octet-stream",
]

/** URL sin query/hash ni credenciales (seguro para logs). */
export function redactChromiumPackUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.username = ""
    parsed.password = ""
    parsed.search = ""
    parsed.hash = ""
    return parsed.toString()
  } catch {
    return "[invalid-url]"
  }
}

function parseContentLength(header: string | null): number | null {
  if (!header) return null
  const n = Number.parseInt(header, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseTotalBytesFromContentRange(header: string | null): number | null {
  if (!header) return null
  const match = /\/(\d+)\s*$/i.exec(header.trim())
  if (!match?.[1]) return null
  const n = Number.parseInt(match[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function getPackByteSize(res: Response): number | null {
  const fromRange = parseTotalBytesFromContentRange(res.headers.get("content-range"))
  if (fromRange !== null) return fromRange
  return parseContentLength(res.headers.get("content-length"))
}

function assertPackHeaders(res: Response, method: "HEAD" | "GET Range"): void {
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase()
  const byteSize = getPackByteSize(res)

  if (contentType && !ACCEPTABLE_CONTENT_TYPES.some((t) => contentType.includes(t))) {
    throw new Error(
      `Chromium pack content-type inesperado (${method}): "${contentType}" (¿HTML/login en lugar del .tar?)`
    )
  }

  if (byteSize !== null && byteSize < MIN_PACK_BYTES) {
    throw new Error(
      `Chromium pack demasiado pequeño (${method}): ${byteSize} bytes (esperado > ${MIN_PACK_BYTES})`
    )
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    })
  } finally {
    clearTimeout(timer)
  }
}

async function cancelResponseBody(res: Response): Promise<void> {
  try {
    await res.body?.cancel()
  } catch {
    // ignore cancel errors
  }
}

/**
 * @returns true si HEAD validó el pack; false si hay que intentar GET Range.
 */
async function tryHeadValidation(
  chromiumPackUrl: string,
  log?: (step: string, extra?: Record<string, unknown>) => void
): Promise<boolean> {
  const redacted = redactChromiumPackUrl(chromiumPackUrl)
  log?.("validateChromiumPack: HEAD start", { chromiumPackUrl: redacted })

  try {
    const res = await fetchWithTimeout(
      chromiumPackUrl,
      { method: "HEAD" },
      HEAD_TIMEOUT_MS
    )

    log?.("validateChromiumPack: HEAD response", {
      chromiumPackUrl: redacted,
      headStatus: res.status,
      statusText: res.statusText,
    })

    if (res.ok) {
      assertPackHeaders(res, "HEAD")
      log?.("validateChromiumPack: OK via HEAD", {
        chromiumPackUrl: redacted,
        headStatus: res.status,
        contentType: (res.headers.get("content-type") ?? "").split(";")[0]?.trim() || "(missing)",
        contentLength: getPackByteSize(res) ?? "(missing)",
      })
      return true
    }

    log?.("validateChromiumPack: HEAD failed, trying GET Range", {
      chromiumPackUrl: redacted,
      headStatus: res.status,
    })
    return false
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    log?.("validateChromiumPack: HEAD request failed, trying GET Range", {
      chromiumPackUrl: redacted,
      error: message,
    })
    return false
  }
}

async function tryGetRangeValidation(
  chromiumPackUrl: string,
  log?: (step: string, extra?: Record<string, unknown>) => void
): Promise<void> {
  const redacted = redactChromiumPackUrl(chromiumPackUrl)
  log?.("validateChromiumPack: GET Range start", { chromiumPackUrl: redacted })

  let res: Response
  try {
    res = await fetchWithTimeout(
      chromiumPackUrl,
      {
        method: "GET",
        headers: { Range: RANGE_HEADER },
      },
      RANGE_TIMEOUT_MS
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Chromium pack no accesible (GET Range timeout o red): ${message}`)
  }

  log?.("validateChromiumPack: GET Range response", {
    chromiumPackUrl: redacted,
    getRangeStatus: res.status,
    statusText: res.statusText,
  })

  if (res.status !== 200 && res.status !== 206) {
    await cancelResponseBody(res)
    throw new Error(
      `Chromium pack no accesible por GET Range: ${res.status} ${res.statusText}`
    )
  }

  try {
    assertPackHeaders(res, "GET Range")
    log?.("validateChromiumPack: OK via GET Range", {
      chromiumPackUrl: redacted,
      getRangeStatus: res.status,
      contentType: (res.headers.get("content-type") ?? "").split(";")[0]?.trim() || "(missing)",
      contentLength: getPackByteSize(res) ?? "(missing)",
    })
  } finally {
    await cancelResponseBody(res)
  }
}

/**
 * Comprueba que el tar de Chromium sea accesible antes de `executablePath`.
 * HEAD primero; si falla (p. ej. 401 en Vercel) hace GET con Range sin descargar el archivo completo.
 */
export async function validateChromiumPackUrl(
  chromiumPackUrl: string,
  log?: (step: string, extra?: Record<string, unknown>) => void
): Promise<void> {
  if (process.env.REPORT_PDF_SKIP_CHROMIUM_PACK_VALIDATION === "1") {
    log?.("validateChromiumPack: skipped (REPORT_PDF_SKIP_CHROMIUM_PACK_VALIDATION=1)", {
      chromiumPackUrl: redactChromiumPackUrl(chromiumPackUrl),
    })
    return
  }

  await timedStep("validate chromium-pack.tar", async () => {
    const headOk = await tryHeadValidation(chromiumPackUrl, log)
    if (headOk) return
    await tryGetRangeValidation(chromiumPackUrl, log)
  })
}
