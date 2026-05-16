import { timedStep } from "@/lib/pdf/pdf-debug-log"

const HEAD_TIMEOUT_MS = 5_000
const MIN_PACK_BYTES = 50 * 1024 * 1024

const ACCEPTABLE_CONTENT_TYPES = [
  "application/x-tar",
  "application/octet-stream",
  "application/gzip",
  "binary/octet-stream",
]

function parseContentLength(header: string | null): number | null {
  if (!header) return null
  const n = Number.parseInt(header, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * HEAD rápido al tar de Chromium antes de `executablePath` (evita colgar la función sin error).
 */
export async function validateChromiumPackUrl(
  chromiumPackUrl: string,
  log?: (step: string, extra?: Record<string, unknown>) => void
): Promise<void> {
  await timedStep("HEAD chromium-pack.tar", async () => {
    log?.("validateChromiumPack: HEAD start", { url: chromiumPackUrl })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(chromiumPackUrl, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
        cache: "no-store",
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Chromium pack no accesible (HEAD timeout o red): ${message}`)
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      throw new Error(`Chromium pack no accesible: ${res.status} ${res.statusText}`)
    }

    const contentType = (res.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase()
    const contentLength = parseContentLength(res.headers.get("content-length"))

    if (contentType && !ACCEPTABLE_CONTENT_TYPES.some((t) => contentType.includes(t))) {
      throw new Error(
        `Chromium pack content-type inesperado: "${contentType}" (¿HTML/login en lugar del .tar?)`
      )
    }

    if (contentLength !== null && contentLength < MIN_PACK_BYTES) {
      throw new Error(
        `Chromium pack demasiado pequeño: ${contentLength} bytes (esperado > ${MIN_PACK_BYTES})`
      )
    }

    log?.("validateChromiumPack: HEAD ok", {
      status: res.status,
      contentType: contentType || "(missing)",
      contentLength: contentLength ?? "(missing)",
    })
  })
}
