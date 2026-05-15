import { getApiErrorMessage } from "@/lib/api-error"

const PDF_ROUTE = "/api/recruiter/reportes/pdf"

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const objUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = objUrl
  a.download = filename
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objUrl)
}

function sanitizeFilenameBase(raw: string): string {
  const base = raw
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
  return base || "reporte"
}

/**
 * Envía el HTML del `<main>` del portal de reportes al endpoint Next y descarga el PDF (Chromium).
 */
export async function downloadRecruiterReportViewPdf(filenameBase: string): Promise<void> {
  const root = document.querySelector("[data-rrhh-reports-shell] main")
  if (!root) {
    throw new Error("No se encontró el contenido del reporte.")
  }

  const stylesheetHrefs = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map((el) => (el as HTMLLinkElement).href)
    .filter((h) => /^https?:\/\//i.test(h))
    .slice(0, 60)

  const inlineHeadCss = [...document.querySelectorAll("head style")]
    .map((el) => el.textContent ?? "")
    .join("\n")

  const fragmentHtml = root.innerHTML

  const res = await fetch(PDF_ROUTE, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fragmentHtml,
      stylesheetHrefs,
      inlineHeadCss,
      filename: filenameBase,
    }),
  })

  if (!res.ok) {
    let message = `Error ${res.status}`
    try {
      const j = await res.json()
      const parsed = getApiErrorMessage(j)
      if (parsed) message = parsed
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  const blob = await res.blob()
  const name = sanitizeFilenameBase(filenameBase)
  triggerBlobDownload(blob, `${name}.pdf`)
}
