import { BRAND_COLORS } from "@/lib/brand-colors"

/** Clases reutilizables del portal público de oportunidades (tema claro tierra). */
export const publicOpportunitiesTheme = {
  page: "relative min-h-screen overflow-hidden bg-ats-warm-white text-foreground",
  heroGradient:
    "absolute inset-x-0 top-0 h-[580px] bg-[linear-gradient(180deg,#EAE0D5_0%,#F5F0EA_38%,#FBFAF7_100%)]",
  heroGradientShort:
    "absolute inset-x-0 top-0 h-[420px] bg-[linear-gradient(180deg,#EAE0D5_0%,#F5F0EA_38%,#FBFAF7_100%)]",
  heroGrid:
    "absolute inset-x-0 bottom-0 h-[46%] bg-[linear-gradient(rgba(32,33,36,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(32,33,36,0.04)_1px,transparent_1px)] bg-size-[42px_42px] mask-[linear-gradient(180deg,transparent,black_18%,black_100%)]",
  heroDivider:
    "absolute inset-x-0 top-[360px] h-px bg-linear-to-r from-transparent via-border to-transparent",
  orbTerracotta: "rounded-full bg-ats-terracotta/14 blur-3xl",
  orbCobre: "rounded-full bg-ats-cobre/10 blur-3xl",
  orbBottom: "rounded-full bg-ats-terracotta/8 blur-3xl",
  panel:
    "border border-border bg-card shadow-[0_24px_80px_rgba(32,33,36,0.07)]",
  panelSoft:
    "border border-border bg-ats-warm-white shadow-[0_16px_48px_rgba(32,33,36,0.05)]",
  panelAccent:
    "border border-ats-terracotta/18 bg-[linear-gradient(180deg,rgba(234,224,213,0.55)_0%,#FBFAF7_100%)] shadow-[0_20px_56px_rgba(164,92,64,0.1)]",
  skeleton: "border border-border bg-muted/35 animate-pulse",
  radialHero:
    "bg-[radial-gradient(circle_at_top_left,rgba(164,92,64,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(184,115,51,0.1),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(234,224,213,0.45),transparent_30%)]",
  radialPanel:
    "bg-[radial-gradient(circle_at_top_right,rgba(164,92,64,0.08),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(184,115,51,0.07),transparent_26%)]",
  radialNav:
    "bg-[radial-gradient(circle_at_left,rgba(164,92,64,0.06),transparent_24%),radial-gradient(circle_at_right,rgba(184,115,51,0.08),transparent_28%)]",
  nav: "border-b border-border bg-card/95 shadow-[0_8px_32px_rgba(32,33,36,0.06)] backdrop-blur-sm",
  navAction:
    "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 sm:px-4 text-sm font-medium text-foreground transition-colors hover:border-ats-terracotta/30 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ats-cobre focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  textHeading: "text-foreground",
  textBody: "text-muted-foreground",
  textMuted: "text-muted-foreground/85",
  textSubtle: "text-muted-foreground/70",
  textEyebrow: "text-muted-foreground/75",
  border: "border-border",
  divider: "border-border",
  surface: "bg-muted/30",
  surfaceStrong: "bg-muted/45",
  surfaceHover: "hover:bg-muted/50",
  tableWrap: "overflow-hidden rounded-[28px] border border-border bg-card",
  chip:
    "inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/55 focus:outline-none focus:ring-2 focus:ring-ats-cobre focus:ring-offset-2 focus:ring-offset-background",
  badge:
    "inline-flex items-center gap-2 rounded-full border border-border bg-muted/35 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground",
  input:
    "h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ats-cobre",
  emptyState:
    "rounded-[30px] border border-dashed border-border bg-muted/20 px-6 py-12 text-center",
  errorPanel:
    "rounded-[28px] border border-ats-terracotta/25 bg-ats-terracotta-soft/35 px-5 py-6 text-sm text-ats-terracotta",
  linkAccent: "text-ats-terracotta hover:text-ats-terracotta-hover",
  cta:
    "inline-flex items-center justify-center rounded-full bg-ats-terracotta px-5 py-3 text-sm font-medium text-ats-warm-white transition-transform duration-200 hover:-translate-y-0.5 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ats-cobre focus:ring-offset-2 focus:ring-offset-background",
  ctaOutline:
    "rounded-full border-border bg-card px-4 py-2 text-foreground hover:bg-muted/40",
  accentIcon: "text-ats-cobre",
  accentIconLight: "text-ats-terracotta",
  accentRing: "focus:ring-ats-cobre focus:ring-offset-background",
  errorText: "text-ats-terracotta",
  modal:
    "relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_40px_120px_rgba(32,33,36,0.12)]",
  modalHeader: "flex shrink-0 items-center justify-between border-b border-border px-6 py-5",
  modalFooter:
    "flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-5",
  tipsWidget:
    "overflow-hidden rounded-[26px] border border-border bg-card shadow-[0_16px_48px_rgba(32,33,36,0.08)] transition-opacity duration-300",
} as const

export { BRAND_COLORS }
