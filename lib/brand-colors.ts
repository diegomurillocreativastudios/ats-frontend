/** Paleta oficial Applican Tree — fuente única para UI, PDFs y plantillas HTML. */
export const BRAND_COLORS = {
  greenPrimary: "#6EB940",
  greenLight: "#549E3C",
  greenMedium: "#438C39",
  greenDark: "#337C37",
  greenDeep: "#256D35",
  textGray: "#57585B",
  white: "#FFFFFF",
  black: "#000000",
  /** Aliases legacy (claves históricas ATS / vo-*) */
  grafito: "#57585B",
  terracotta: "#6EB940",
  terracottaHover: "#549E3C",
  cobre: "#438C39",
  cobreHover: "#337C37",
  cobreLight: "#A8D98A",
  arena: "#E8F5E0",
  warmWhite: "#FFFFFF",
  terracottaSoft: "#D4EDCC",
  grafitoSurface: "#454648",
} as const

export type BrandColorKey = keyof typeof BRAND_COLORS
