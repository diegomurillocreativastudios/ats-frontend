/**
 * PDF del contenido visible del reporte RRHH: Chromium (`page.pdf`) sobre HTML armado en servidor
 * (fragmento del `<main>` del cliente + CSS inline / hojas de estilo).
 */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import { fetchStylesheetsTextForPdf } from "@/lib/reportes/fetch-report-stylesheets-for-pdf"
import { buildReportViewPdfHtmlDocument } from "@/lib/reportes/build-report-view-pdf-html"
import { renderReportViewPdfBuffer } from "@/lib/reportes/render-report-view-pdf-buffer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_FRAGMENT_CHARS = 2_500_000
const MAX_INLINE_CSS_CHARS = 400_000
const MAX_STYLESHEETS = 60
const RESERVE_FOR_TAIL_CSS = 6_000

function withHttpsOrigin(raw: string): string {
  const trimmed = raw.replace(/\/$/, "")
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed.replace(/^\/\//, "")}`
}

function resolvePublicOrigin(): string {
  if (process.env.VERCEL) {
    const branch = process.env.VERCEL_BRANCH_URL?.trim()
    const deployment = process.env.VERCEL_URL?.trim()
    const fromVercel = branch || deployment
    if (fromVercel) return withHttpsOrigin(fromVercel)
  }
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) return withHttpsOrigin(fromEnv)
  return "http://localhost:3000"
}

function isAllowedStylesheetHref(href: string): boolean {
  try {
    const u = new URL(href)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

function sanitizePdfStem(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : ""
  const base = (s || "reporte")
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
  return base || "reporte"
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
    if (!accessToken) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ message: "JSON inválido" }, { status: 400 })
    }

    const record = body as Record<string, unknown>
    const fragmentHtml = typeof record.fragmentHtml === "string" ? record.fragmentHtml : ""
    if (!fragmentHtml.trim()) {
      return NextResponse.json({ message: "fragmentHtml es obligatorio" }, { status: 400 })
    }
    if (fragmentHtml.length > MAX_FRAGMENT_CHARS) {
      return NextResponse.json(
        { message: "El contenido es demasiado grande para generar el PDF." },
        { status: 413 }
      )
    }

    const stylesheetHrefs = Array.isArray(record.stylesheetHrefs)
      ? record.stylesheetHrefs
          .filter((x): x is string => typeof x === "string")
          .filter(isAllowedStylesheetHref)
          .slice(0, MAX_STYLESHEETS)
      : []

    const inlineHeadCssRaw =
      typeof record.inlineHeadCss === "string"
        ? record.inlineHeadCss.slice(0, MAX_INLINE_CSS_CHARS)
        : ""

    const origin = resolvePublicOrigin()
    const keepLinkedSheets = process.env.REPORT_PDF_KEEP_STYLESHEET_LINKS === "1"

    let inlineHeadCss = inlineHeadCssRaw
    let stylesheetHrefsForDocument = stylesheetHrefs

    if (!keepLinkedSheets && stylesheetHrefs.length > 0) {
      const budget = Math.max(0, MAX_INLINE_CSS_CHARS - inlineHeadCssRaw.length - RESERVE_FOR_TAIL_CSS)
      const fetched = await fetchStylesheetsTextForPdf(stylesheetHrefs, budget)
      inlineHeadCss = `${inlineHeadCssRaw}\n${fetched}`.slice(0, MAX_INLINE_CSS_CHARS)
      stylesheetHrefsForDocument = []
    }

    const fullHtml = buildReportViewPdfHtmlDocument({
      baseOrigin: origin,
      fragmentHtml,
      stylesheetHrefs: stylesheetHrefsForDocument,
      inlineHeadCss,
    })

    const pdfBuffer = await renderReportViewPdfBuffer(fullHtml)
    const safeFilename = sanitizePdfStem(record.filename)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.error("PDF_GENERATION_ERROR", err)
    const hideDetail = process.env.REPORT_PDF_HIDE_ERROR_DETAIL === "1"
    return NextResponse.json(
      {
        message: "Error al generar el PDF del reporte.",
        ...(hideDetail ? {} : { detail: err.message }),
      },
      { status: 500 }
    )
  }
}
