const REGIONAL_INDICATOR_A = 0x1f1e6
const LATIN_CAPITAL_A = 65

/**
 * Convierte un código ISO 3166-1 alpha-2 en emoji de bandera (indicadores regionales).
 */
export function iso2ToFlagEmoji(iso2: string): string {
  const code = iso2.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return ""
  return String.fromCodePoint(
    REGIONAL_INDICATOR_A + (code.charCodeAt(0) - LATIN_CAPITAL_A),
    REGIONAL_INDICATOR_A + (code.charCodeAt(1) - LATIN_CAPITAL_A)
  )
}

/**
 * URL PNG de bandera (20 px de alto equivalente vía `w40`) para un ISO-2.
 */
export function countryFlagPngUrl(iso2: string): string | null {
  const code = iso2.trim().toLowerCase()
  if (!/^[a-z]{2}$/.test(code)) return null
  return `https://flagcdn.com/w40/${code}.png`
}
