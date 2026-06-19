import { BRAND_COLORS } from "@/lib/brand-colors"

/** Clases reutilizables del portal público de oportunidades (tema oscuro tierra). */
export const publicOpportunitiesTheme = {
  page: "relative min-h-screen overflow-hidden bg-ats-grafito text-white",
  heroGradient:
    "absolute inset-x-0 bg-[linear-gradient(180deg,#A45C40_0%,#3D3E41_38%,#202124_100%)]",
  orbTerracotta: "rounded-full bg-ats-terracotta blur-3xl",
  orbCobre: "rounded-full bg-ats-cobre blur-3xl",
  panel:
    "border border-white/10 bg-[linear-gradient(180deg,rgba(42,43,46,0.94)_0%,rgba(32,33,36,0.96)_100%)] shadow-[0_24px_80px_rgba(32,33,36,0.42)] backdrop-blur",
  panelSoft:
    "border border-white/10 bg-[linear-gradient(180deg,rgba(32,33,36,0.88)_0%,rgba(32,33,36,0.96)_100%)] shadow-[0_20px_60px_rgba(32,33,36,0.36)] backdrop-blur",
  panelAccent:
    "border border-white/10 bg-[linear-gradient(180deg,rgba(164,92,64,0.55)_0%,rgba(32,33,36,0.94)_100%)] shadow-[0_24px_70px_rgba(32,33,36,0.42)]",
  skeleton:
    "border border-white/10 bg-[linear-gradient(180deg,rgba(42,43,46,0.9)_0%,rgba(32,33,36,0.94)_100%)]",
  glass: "border-white/10 bg-white/6",
  glassStrong: "border-white/12 bg-white/8",
  glassHover: "hover:bg-white/10",
  accentIcon: "text-ats-cobre",
  accentIconLight: "text-ats-cobre-light",
  accentRing: "focus:ring-ats-cobre focus:ring-offset-ats-grafito",
  cta:
    "inline-flex items-center justify-center rounded-full bg-ats-warm-white px-5 py-2.5 text-sm font-medium text-ats-grafito transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-ats-grafito",
  ctaPrimary:
    "inline-flex items-center justify-center rounded-full bg-ats-terracotta px-6 py-3 text-sm font-medium text-ats-warm-white transition hover:opacity-95",
  radialHero:
    "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_26%),radial-gradient(circle_at_top_right,rgba(164,92,64,0.34),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(184,115,51,0.18),transparent_28%)]",
  errorText: "text-ats-terracotta-soft",
  linkAccent: "text-ats-cobre-light hover:text-ats-terracotta-soft",
} as const

export { BRAND_COLORS }
