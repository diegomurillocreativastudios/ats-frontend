/** Nombre comercial de la plataforma. */
export const APP_NAME = "ApplicanTree"

export const APP_TAGLINE = "Inteligencia aplicada al reclutamiento"

const DEFAULT_COMPANY_NAME = "Applican Tree"

/**
 * Nombre de la empresa en documentos legales (autorización y consentimiento).
 * Definí `NEXT_PUBLIC_COMPANY_NAME` en `.env.local` o en el entorno de deploy.
 */
export function getCompanyName(): string {
  const fromEnv = process.env.NEXT_PUBLIC_COMPANY_NAME?.trim()
  return fromEnv || DEFAULT_COMPANY_NAME
}

/** Ruta pública del logo SVG (árbol + wordmark). */
export const APP_LOGO_SVG_SRC = "/Applican_Tree.svg"

/** Nombre de archivo en `public/` (SVG único para UI, PDFs y reportes). */
export const APP_LOGO_SVG_FILE = "Applican_Tree.svg"
