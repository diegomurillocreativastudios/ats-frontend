/**
 * Opciones para selects del formulario de perfil candidato (es-ES).
 */

export interface SelectOption {
  value: string
  label: string
}

/** Orden de regiones (sin mostrar títulos en UI): Norte América → Centro América → Sudamérica → Europa → resto. */
const NORTH_AMERICA_ISO2 = new Set<string>([
  "US",
  "CA",
  "MX",
  "GL",
  "BM",
  "PM",
  "AG",
  "AI",
  "AW",
  "BB",
  "BL",
  "BQ",
  "BS",
  "CU",
  "CW",
  "DM",
  "DO",
  "GD",
  "GP",
  "HT",
  "JM",
  "KN",
  "KY",
  "LC",
  "MF",
  "MQ",
  "MS",
  "PR",
  "SX",
  "TC",
  "TT",
  "VC",
  "VG",
  "VI",
])

const CENTRAL_AMERICA_ISO2 = new Set<string>(["BZ", "GT", "SV", "HN", "NI", "CR", "PA"])

const SOUTH_AMERICA_ISO2 = new Set<string>([
  "AR",
  "BO",
  "BR",
  "CL",
  "CO",
  "EC",
  "FK",
  "GF",
  "GY",
  "PY",
  "PE",
  "SR",
  "UY",
  "VE",
])

const EUROPE_ISO2 = new Set<string>([
  "AD",
  "AL",
  "AT",
  "AX",
  "BA",
  "BE",
  "BG",
  "BY",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FO",
  "FR",
  "GB",
  "GG",
  "GI",
  "GR",
  "HR",
  "HU",
  "IE",
  "IM",
  "IS",
  "IT",
  "JE",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MD",
  "ME",
  "MK",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "RU",
  "SE",
  "SI",
  "SJ",
  "SK",
  "SM",
  "UA",
  "VA",
  "XK",
  "TR",
  "GE",
  "AM",
  "AZ",
])

function getCountryRegionOrder(iso2: string): number {
  const u = iso2.toUpperCase()
  if (NORTH_AMERICA_ISO2.has(u)) return 0
  if (CENTRAL_AMERICA_ISO2.has(u)) return 1
  if (SOUTH_AMERICA_ISO2.has(u)) return 2
  if (EUROPE_ISO2.has(u)) return 3
  return 4
}

function sortOptionsByRegionThenNameEs(
  items: Array<{ sortKey: string; label: string }>
): void {
  items.sort((a, b) => {
    const rg = getCountryRegionOrder(a.sortKey) - getCountryRegionOrder(b.sortKey)
    if (rg !== 0) return rg
    return a.label.localeCompare(b.label, "es")
  })
}

/** Nombres preferidos en UI (ISO 3166-1 alpha-2 → etiqueta). */
const COUNTRY_LABEL_OVERRIDES: Record<string, string> = {
  QA: "Qatar",
}

/**
 * Etiqueta de país para selects y vistas (Intl es-ES + overrides de producto).
 */
export function resolveCountryDisplayLabel(
  iso2: string,
  intlOrApiLabel?: string | null
): string {
  const upper = iso2.trim().toUpperCase()
  const override = COUNTRY_LABEL_OVERRIDES[upper]
  if (override) return override

  if (intlOrApiLabel != null && String(intlOrApiLabel).trim() !== "") {
    return String(intlOrApiLabel).trim()
  }

  const display = new Intl.DisplayNames(["es"], { type: "region" })
  try {
    return display.of(upper) ?? upper
  } catch {
    return upper
  }
}

let countryOptionsCache: SelectOption[] | null = null

/**
 * Países y territorios ISO 3166-1 alpha-2 con nombre en español (sin banderas).
 * Orden: Norte América, Centro América, América del Sur, Europa, resto (alfabético en cada grupo).
 */
export function getCountrySelectOptions(): SelectOption[] {
  if (countryOptionsCache) return countryOptionsCache

  let codes: string[] = []
  try {
    const intl = Intl as typeof Intl & {
      supportedValuesOf?: (type: string) => string[]
    }
    if (typeof intl.supportedValuesOf === "function") {
      codes = intl.supportedValuesOf("region").filter(
        (r): r is string => typeof r === "string" && r.length === 2 && /^[A-Z]{2}$/i.test(r)
      )
    }
  } catch {
    codes = []
  }

  if (codes.length === 0) {
    codes = [
      "SV",
      "GT",
      "HN",
      "NI",
      "CR",
      "PA",
      "MX",
      "US",
      "ES",
      "AR",
      "BR",
      "CO",
      "CL",
      "PE",
      "EC",
      "BO",
      "PY",
      "UY",
      "VE",
      "DE",
      "FR",
      "IT",
      "GB",
      "CA",
      "AU",
      "JP",
      "CN",
      "IN",
    ]
  }

  const display = new Intl.DisplayNames(["es"], { type: "region" })
  const seen = new Set<string>()
  const rows: Array<{ sortKey: string; label: string; value: string }> = []

  for (const code of codes) {
    const upper = code.toUpperCase()
    let name: string
    try {
      name = display.of(upper) ?? upper
    } catch {
      name = upper
    }
    name = resolveCountryDisplayLabel(upper, name)
    if (!name || name === upper || seen.has(name)) continue
    seen.add(name)
    rows.push({ sortKey: upper, value: name, label: name })
  }

  sortOptionsByRegionThenNameEs(rows)

  const out: SelectOption[] = rows.map((r) => ({ value: r.value, label: r.label }))

  countryOptionsCache = out
  return out
}

let countryIso2OptionsCache: SelectOption[] | null = null

/**
 * Misma lista que `getCountrySelectOptions`, pero `value` es ISO 3166-1 alpha-2 (p. ej. `SV`, `MX`) para APIs que exigen código.
 * Sin banderas; mismo orden regional.
 */
export function getCountryIso2SelectOptions(): SelectOption[] {
  if (countryIso2OptionsCache) return countryIso2OptionsCache

  let codes: string[] = []
  try {
    const intl = Intl as typeof Intl & {
      supportedValuesOf?: (type: string) => string[]
    }
    if (typeof intl.supportedValuesOf === "function") {
      codes = intl.supportedValuesOf("region").filter(
        (r): r is string => typeof r === "string" && r.length === 2 && /^[A-Z]{2}$/i.test(r)
      )
    }
  } catch {
    codes = []
  }

  if (codes.length === 0) {
    codes = [
      "SV",
      "GT",
      "HN",
      "NI",
      "CR",
      "PA",
      "MX",
      "US",
      "ES",
      "AR",
      "BR",
      "CO",
      "CL",
      "PE",
      "EC",
      "BO",
      "PY",
      "UY",
      "VE",
      "DE",
      "FR",
      "IT",
      "GB",
      "CA",
      "AU",
      "JP",
      "CN",
      "IN",
    ]
  }

  const display = new Intl.DisplayNames(["es"], { type: "region" })
  const seen = new Set<string>()
  const rows: Array<{ sortKey: string; label: string; value: string }> = []

  for (const code of codes) {
    const upper = code.toUpperCase()
    if (seen.has(upper)) continue
    seen.add(upper)
    let name: string
    try {
      name = display.of(upper) ?? upper
    } catch {
      name = upper
    }
    name = resolveCountryDisplayLabel(upper, name)
    rows.push({ sortKey: upper, value: upper, label: name })
  }

  sortOptionsByRegionThenNameEs(rows)

  const out: SelectOption[] = rows.map((r) => ({ value: r.value, label: r.label }))

  countryIso2OptionsCache = out
  return out
}

/**
 * Texto para mostrar un `countryCode` ISO alpha-2 devuelto por el API (`null` = sin especificar).
 */
export function formatCountryCodeLabel(code: string | null | undefined): string {
  if (code == null || String(code).trim() === "") return "—"
  const upper = String(code).trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(upper)) return upper
  return resolveCountryDisplayLabel(upper)
}

/** Estado civil (valores en español para persistir en API). */
export const MARITAL_STATUS_OPTIONS: SelectOption[] = [
  { value: "Soltero/a", label: "Soltero/a" },
  { value: "Casado/a", label: "Casado/a" },
  { value: "Unión libre", label: "Unión libre" },
  { value: "Divorciado/a", label: "Divorciado/a" },
  { value: "Viudo/a", label: "Viudo/a" },
  { value: "Separado/a", label: "Separado/a" },
]

/** Género */
export const GENDER_OPTIONS: SelectOption[] = [
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino", label: "Femenino" },
]

/**
 * Disponibilidad laboral (perfil y preferencias).
 */
export const AVAILABILITY_OPTIONS: SelectOption[] = [
  { value: "Inmediata", label: "Inmediata" },
  { value: "En 15 días o menos", label: "En 15 días o menos" },
  { value: "En 1 mes", label: "En 1 mes" },
  { value: "En 2 meses o más", label: "En 2 meses o más" },
  { value: "A convenir", label: "A convenir" },
  { value: "Según propuesta", label: "Según propuesta" },
]

/**
 * Traductor acotado para labels de opciones del formulario de perfil.
 *
 * Etapa 5D (i18n): solo se traduce el LABEL visible. El `value` canónico en
 * español (el que persiste el backend) NO cambia, por lo que el payload y las
 * validaciones de negocio quedan intactos.
 */
export type ProfileOptionTranslator = (key: string) => string

/** Estado civil con label traducible; `value` canónico (es) preservado. */
export function getMaritalStatusOptions(t: ProfileOptionTranslator): SelectOption[] {
  return [
    { value: "Soltero/a", label: t("options.maritalStatus.single") },
    { value: "Casado/a", label: t("options.maritalStatus.married") },
    { value: "Unión libre", label: t("options.maritalStatus.freeUnion") },
    { value: "Divorciado/a", label: t("options.maritalStatus.divorced") },
    { value: "Viudo/a", label: t("options.maritalStatus.widowed") },
    { value: "Separado/a", label: t("options.maritalStatus.separated") },
  ]
}

/** Género con label traducible; `value` canónico (es) preservado. */
export function getGenderOptions(t: ProfileOptionTranslator): SelectOption[] {
  return [
    { value: "Masculino", label: t("options.gender.male") },
    { value: "Femenino", label: t("options.gender.female") },
  ]
}

/** Disponibilidad con label traducible; `value` canónico (es) preservado. */
export function getAvailabilityOptions(t: ProfileOptionTranslator): SelectOption[] {
  return [
    { value: "Inmediata", label: t("options.availability.immediate") },
    { value: "En 15 días o menos", label: t("options.availability.within15Days") },
    { value: "En 1 mes", label: t("options.availability.within1Month") },
    { value: "En 2 meses o más", label: t("options.availability.within2MonthsOrMore") },
    { value: "A convenir", label: t("options.availability.toBeAgreed") },
    { value: "Según propuesta", label: t("options.availability.perProposal") },
  ]
}

/**
 * Si el valor guardado no coincide con ninguna opción (texto libre previo), mostrarlo como opción extra.
 */
export function mergeLegacySelectOption(
  options: SelectOption[],
  currentValue: string
): SelectOption[] {
  const t = currentValue.trim()
  if (!t) return options
  if (options.some((o) => o.value === t)) return options
  return [{ value: t, label: `${t} (valor actual)` }, ...options]
}
