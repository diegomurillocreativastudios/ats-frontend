import { downloadElementAsPdf } from "@/lib/pdf/download-element-as-pdf"

function sanitizeFilenameBase(raw: string): string {
  const base = raw
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
  return base || "reporte"
}

/**
 * Resuelve el `<main>` visible del portal de reportes (layout desktop o mobile).
 */
export function resolveReportViewMainElement(): HTMLElement | null {
  const shell = document.querySelector("[data-rrhh-reports-shell]")
  if (!shell) return null

  const mains = shell.querySelectorAll("main")
  for (const main of mains) {
    if (!(main instanceof HTMLElement)) continue
    const { width, height } = main.getBoundingClientRect()
    if (width > 0 && height > 0) return main
  }

  const first = mains[0]
  return first instanceof HTMLElement ? first : null
}

/**
 * Captura el contenido visible del reporte RRHH y descarga un PDF en el navegador.
 */
export async function downloadReportViewAsPdf(filenameBase: string): Promise<void> {
  const element = resolveReportViewMainElement()
  if (!element) {
    throw new Error("No se encontró el contenido del reporte.")
  }

  const name = sanitizeFilenameBase(filenameBase)
  await downloadElementAsPdf({
    element,
    fileName: `${name}.pdf`,
    orientation: "portrait",
    format: "a4",
    scale: 2,
    marginMm: 0,
  })
}
