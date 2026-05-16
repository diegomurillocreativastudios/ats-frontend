/**
 * Smoke test mínimo de Chromium + PDF en Vercel (sin HTML/CSS del reporte real).
 * GET ?format=json → tiempos por etapa (sin depender de logs en dashboard).
 */
import { NextResponse } from "next/server"
import { createPdfDebugLogger } from "@/lib/pdf/pdf-debug-log"
import { resolveChromiumPackUrl } from "@/lib/pdf/launch-pdf-browser"
import { PdfTimingCollector, setActivePdfTiming } from "@/lib/pdf/pdf-timing"
import { renderReportViewPdfBuffer } from "@/lib/reportes/render-report-view-pdf-buffer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const MINIMAL_HTML = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>PDF health</title></head>
<body><h1>PDF OK</h1><p>Chromium health check</p></body>
</html>`

export async function GET(request: Request) {
  const log = createPdfDebugLogger("health")
  const url = new URL(request.url)
  const jsonFormat = url.searchParams.get("format") === "json"

  const timing = new PdfTimingCollector()
  setActivePdfTiming(timing)

  try {
    log("GET: inicio", {
      maxDuration: 60,
      vercel: Boolean(process.env.VERCEL),
      jsonFormat,
    })

    let packUrl: string
    try {
      packUrl = resolveChromiumPackUrl()
      log("CHROMIUM_PACK_URL", { packUrl })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      return NextResponse.json(
        {
          ok: false,
          stage: "resolveChromiumPackUrl",
          detail: message,
          timings: timing.getEntries(),
          totalMs: timing.getTotalMs(),
        },
        { status: 500 }
      )
    }

    const pdfBuffer = await renderReportViewPdfBuffer(MINIMAL_HTML)
    const entries = timing.getEntries()
    const totalMs = timing.getTotalMs()

    log("GET: éxito", { pdfBytes: pdfBuffer.length, totalMs })

    if (jsonFormat) {
      return NextResponse.json({
        ok: true,
        packUrl,
        pdfBytes: pdfBuffer.length,
        totalMs,
        maxDurationConfigured: 60,
        vercel: Boolean(process.env.VERCEL),
        timings: entries,
      })
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="pdf-health.pdf"',
        "Cache-Control": "no-store",
        "X-Pdf-Health-Total-Ms": String(totalMs),
      },
    })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    log("GET: error", { message: err.message })
    return NextResponse.json(
      {
        ok: false,
        stage: "render",
        detail: err.message,
        timings: timing.getEntries(),
        totalMs: timing.getTotalMs(),
      },
      { status: 500 }
    )
  } finally {
    setActivePdfTiming(null)
  }
}
