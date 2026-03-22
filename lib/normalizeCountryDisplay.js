const stripDiacritics = (str) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

/**
 * Normalizes country strings for display in RRHH lists (e.g. demonyms → country name).
 * @param {unknown} value
 * @returns {string}
 */
export const normalizeCountryDisplay = (value) => {
  if (value == null || String(value).trim() === "") return "—"

  const raw = String(value).trim()
  const key = stripDiacritics(raw).toLowerCase().replace(/\s+/g, " ").trim()

  if (key === "sv") return "El Salvador"
  if (key === "el salvador" || key === "elsalvador") return "El Salvador"
  if (key.startsWith("salvadoren")) return "El Salvador"
  if (key === "salvadoran" || key === "salvadorian") return "El Salvador"

  return raw
}

/**
 * When the API omits country but the phone was normalized to +503 …, assume El Salvador.
 * @param {unknown} countryValue
 * @param {string} formattedPhone — output of formatPhoneSvDisplay (or "—")
 * @returns {string}
 */
export const resolveCountryDisplay = (countryValue, formattedPhone) => {
  const country = normalizeCountryDisplay(countryValue)
  if (country !== "—") return country
  if (
    formattedPhone &&
    formattedPhone !== "—" &&
    formattedPhone.includes("+503")
  ) {
    return "El Salvador"
  }
  return country
}
