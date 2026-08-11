import { sanitizeTemplateHtml } from "@/lib/html/sanitize-template-html"

/**
 * Sanitizes technical-sheet preview HTML before validate/rasterize on the server.
 * Uses the shared template allowlist (scripts, handlers, javascript: URIs stripped).
 */
export function sanitizeTechnicalSheetPreviewHtml(html: string): string {
  return sanitizeTemplateHtml(html)
}
