/** Paleta oficial ATS — fuente única para UI, PDFs y plantillas HTML. */
export const BRAND_COLORS = {
  grafito: "#202124",
  terracotta: "#A45C40",
  terracottaHover: "#8E4E36",
  cobre: "#B87333",
  cobreHover: "#9A6329",
  cobreLight: "#D4A574",
  arena: "#EAE0D5",
  warmWhite: "#FBFAF7",
  terracottaSoft: "#E8C4B8",
  grafitoSurface: "#2A2B2E",
} as const

export type BrandColorKey = keyof typeof BRAND_COLORS
