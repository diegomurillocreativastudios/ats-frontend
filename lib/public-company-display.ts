/**
 * Mapeo visual: el API puede seguir enviando el nombre placeholder legacy;
 * en pantalla mostramos el nombre comercial (`DEFAULT_COMPANY_DISPLAY_LABEL`).
 */

/** Valor exacto que aún envían algunos backends; debe coincidir con el API. */
export const LEGACY_PLACEHOLDER_COMPANY_NAME = "Default Company"

export const DEFAULT_COMPANY_DISPLAY_LABEL = "Visible Outsource"

const LEGACY_PLACEHOLDER_LOWER = LEGACY_PLACEHOLDER_COMPANY_NAME.toLowerCase()

export function mapDefaultCompanyDisplayLabel(raw?: string | null): string {
  const t = raw?.trim() ?? ""
  if (t === "") return ""
  if (t.toLowerCase() === LEGACY_PLACEHOLDER_LOWER) {
    return DEFAULT_COMPANY_DISPLAY_LABEL
  }
  return t
}

/**
 * RRHH / reportes: prioriza `clientName` y aplica el mismo mapeo visual del placeholder legacy.
 */
export function displayCompanyOrClientLabel(
  clientName?: string | null,
  companyName?: string | null,
  whenEmpty = "—"
): string {
  const raw = String(clientName ?? companyName ?? "").trim()
  if (raw === "") return whenEmpty
  return mapDefaultCompanyDisplayLabel(raw)
}
