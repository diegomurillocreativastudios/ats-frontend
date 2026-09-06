import { NextResponse, type NextRequest } from "next/server"

const MAX_BODY_BYTES = 8_192

/**
 * Accepts Content Security Policy violation reports (FE-SEC-010).
 * Caps body size, returns 204, and logs only non-sensitive violation fields.
 */
export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 })
  }

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  if (raw.length > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 })
  }

  if (raw.length > 0) {
    try {
      const parsed = JSON.parse(raw) as unknown
      const report = extractCspReport(parsed)
      if (report) {
        console.info("[csp-report]", {
          effectiveDirective: report.effectiveDirective,
          blockedUri: truncate(report.blockedUri, 200),
          documentUri: truncate(report.documentUri, 200),
          disposition: report.disposition,
          statusCode: report.statusCode,
        })
      }
    } catch {
      // Malformed body: still acknowledge so browsers stop retrying.
    }
  }

  return new NextResponse(null, { status: 204 })
}

interface CspReportSummary {
  effectiveDirective?: string
  blockedUri?: string
  documentUri?: string
  disposition?: string
  statusCode?: number
}

/**
 * Normalizes legacy `csp-report` and Reporting API array payloads.
 */
function extractCspReport(body: unknown): CspReportSummary | null {
  if (!body || typeof body !== "object") return null

  const record = body as Record<string, unknown>

  if (record["csp-report"] && typeof record["csp-report"] === "object") {
    return mapLegacyReport(record["csp-report"] as Record<string, unknown>)
  }

  if (Array.isArray(body)) {
    const first = body[0]
    if (first && typeof first === "object") {
      const item = first as Record<string, unknown>
      const bodyObj =
        item.body && typeof item.body === "object"
          ? (item.body as Record<string, unknown>)
          : item
      return mapReportingApiBody(bodyObj)
    }
  }

  if (typeof record.effectiveDirective === "string" || typeof record["blocked-uri"] === "string") {
    return mapLegacyReport(record)
  }

  return null
}

function mapLegacyReport(report: Record<string, unknown>): CspReportSummary {
  return {
    effectiveDirective:
      asOptionalString(report["effective-directive"]) ??
      asOptionalString(report.effectiveDirective),
    blockedUri:
      asOptionalString(report["blocked-uri"]) ?? asOptionalString(report.blockedURI),
    documentUri:
      asOptionalString(report["document-uri"]) ??
      asOptionalString(report.documentURI),
    disposition: asOptionalString(report.disposition),
    statusCode:
      typeof report["status-code"] === "number"
        ? report["status-code"]
        : typeof report.statusCode === "number"
          ? report.statusCode
          : undefined,
  }
}

function mapReportingApiBody(body: Record<string, unknown>): CspReportSummary {
  return {
    effectiveDirective: asOptionalString(body.effectiveDirective),
    blockedUri: asOptionalString(body.blockedURL),
    documentUri: asOptionalString(body.documentURL),
    disposition: asOptionalString(body.disposition),
    statusCode: typeof body.statusCode === "number" ? body.statusCode : undefined,
  }
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function truncate(value: string | undefined, max: number): string | undefined {
  if (!value) return value
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}
