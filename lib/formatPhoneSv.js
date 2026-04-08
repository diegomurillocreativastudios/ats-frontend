const SV_CC = "503"
const LOCAL_LEN = 8

/**
 * Formats one digit-only string as +503 0000 0000 when it matches El Salvador patterns.
 * @param {string} digits
 * @returns {string | null}
 */
const formatSvDigits = (digits) => {
  if (!digits || typeof digits !== "string") return null
  const d = digits.replace(/\D/g, "")
  if (d.length === 0) return null

  if (d.length === 11 && d.startsWith(SV_CC)) {
    const local = d.slice(3)
    if (local.length === LOCAL_LEN) {
      return `+${SV_CC} ${local.slice(0, 4)} ${local.slice(4)}`
    }
  }

  if (d.length === LOCAL_LEN) {
    return `+${SV_CC} ${d.slice(0, 4)} ${d.slice(4)}`
  }

  if (d.length === 9 && d.startsWith("0")) {
    const local = d.slice(1)
    if (local.length === LOCAL_LEN) {
      return `+${SV_CC} ${local.slice(0, 4)} ${local.slice(4)}`
    }
  }

  return null
}

/**
 * Display helper for RRHH candidatos: normalize phone strings to +503 0000 0000.
 * Supports "/", multiple numbers, parentheses, hyphens, etc.
 * Non-Salvadoran or ambiguous values are returned unchanged (trimmed).
 * @param {unknown} value
 * @returns {string}
 */
export const formatPhoneSvDisplay = (value) => {
  if (value == null || String(value).trim() === "") return "—"

  const raw = String(value).trim()
  const parts = raw.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean)

  if (parts.length > 1) {
    const mapped = parts.map((part) => {
      const digits = part.replace(/\D/g, "")
      const formatted = formatSvDigits(digits)
      return formatted ?? part
    })
    return mapped.join(" / ")
  }

  const digits = raw.replace(/\D/g, "")
  const formatted = formatSvDigits(digits)
  if (formatted) return formatted

  return raw
}
