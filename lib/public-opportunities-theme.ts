import { BRAND_COLORS } from "@/lib/brand-colors"

/** Clases reutilizables del portal público de oportunidades (tema verde Applican Tree). */
export const publicOpportunitiesTheme = {
  page: "relative flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden overscroll-y-none bg-ats-warm-white text-foreground",
  pageScroll:
    "relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain",
  heroGradient:
    "absolute inset-x-0 top-0 h-[580px] bg-[linear-gradient(180deg,#E8F5E0_0%,#F0F7EC_38%,#FFFFFF_100%)]",
  heroGradientShort:
    "absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(180deg,#E8F5E0_0%,#F0F7EC_38%,#FFFFFF_100%)]",
  heroGrid:
    "absolute inset-x-0 bottom-0 h-[46%] bg-[linear-gradient(rgba(87,88,91,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(87,88,91,0.04)_1px,transparent_1px)] bg-size-[42px_42px] mask-[linear-gradient(180deg,transparent,black_18%,black_100%)]",
  heroDivider:
    "absolute inset-x-0 top-[360px] h-px bg-linear-to-r from-transparent via-border to-transparent",
  orbTerracotta: "rounded-full bg-ats-terracotta/14 blur-3xl",
  orbCobre: "rounded-full bg-ats-cobre/10 blur-3xl",
  orbBottom: "rounded-full bg-ats-terracotta/8 blur-3xl",
  shellInner: "mx-auto w-full max-w-6xl",
  shellDirectory: "mx-auto w-full max-w-[1400px]",
  directoryGrid:
    "grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-10",
  directoryRail:
    "space-y-4 lg:sticky lg:top-6 lg:self-start lg:border-r lg:border-border lg:pr-8",
  articleGrid:
    "grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12",
  articleTitle:
    "max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl",
  articleRail:
    "space-y-5 lg:sticky lg:top-6 lg:self-start lg:border-l lg:border-border lg:pl-8",
  articleRailIllustration:
    "mx-auto hidden w-full max-w-[14rem] lg:block lg:max-w-none",
  articleRailIllustrationImage:
    "h-auto w-full max-h-48 object-contain object-center",
  applyGrid:
    "grid gap-10 lg:grid-cols-[24rem_minmax(0,1fr)] lg:items-start lg:gap-12",
  applyIllustrationFrame:
    "mx-auto w-full max-w-[10rem]",
  applyIllustrationImage:
    "h-auto w-full object-contain object-center",
  storySection: "scroll-mt-8 border-t border-border pt-8",
  filterLabel: "mb-1.5 block text-sm font-medium text-foreground",
  filterInput:
    "h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ats-cobre",
  filterSelect:
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ats-cobre disabled:cursor-not-allowed disabled:opacity-60",
  panel:
    "glass-iridescent-border border border-border bg-card backdrop-blur-xl shadow-[0_24px_80px_rgba(87,88,91,0.10)]",
  panelSoft:
    "border border-border bg-ats-warm-white shadow-[0_16px_48px_rgba(87,88,91,0.05)]",
  panelAccent:
    "border border-ats-terracotta/18 bg-[linear-gradient(180deg,rgba(232,245,224,0.55)_0%,#FFFFFF_100%)] shadow-[0_20px_56px_rgba(110,185,64,0.1)]",
  skeleton: "border border-border bg-muted/35 animate-pulse",
  radialHero:
    "bg-[radial-gradient(circle_at_top_left,rgba(110,185,64,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(67,140,57,0.1),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(232,245,224,0.45),transparent_30%)]",
  radialPanel:
    "bg-[radial-gradient(circle_at_top_right,rgba(110,185,64,0.08),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(67,140,57,0.07),transparent_26%)]",
  radialNav:
    "bg-[radial-gradient(circle_at_left,rgba(110,185,64,0.06),transparent_24%),radial-gradient(circle_at_right,rgba(67,140,57,0.08),transparent_28%)]",
  nav: "border-b border-border bg-card/95 shadow-[0_8px_32px_rgba(87,88,91,0.06)] backdrop-blur-sm",
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
  tableWrap: "overflow-hidden rounded-2xl border border-border bg-card backdrop-blur-xl",
  chip:
    "inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/55 focus:outline-none focus:ring-2 focus:ring-ats-cobre focus:ring-offset-2 focus:ring-offset-background",
  badge:
    "inline-flex items-center gap-2 rounded-full border border-border bg-muted/35 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground",
  input:
    "h-11 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ats-cobre",
  select:
    "h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ats-cobre disabled:cursor-not-allowed disabled:opacity-60",
  emptyState:
    "rounded-[30px] border border-dashed border-border bg-muted/20 px-6 py-12 text-center",
  errorPanel:
    "rounded-[28px] border border-destructive/25 bg-destructive/10 px-5 py-6 text-sm text-destructive",
  linkAccent: "text-ats-terracotta hover:text-ats-terracotta-hover",
  cta:
    "inline-flex items-center justify-center rounded-full bg-ats-terracotta px-5 py-3 text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ats-cobre focus:ring-offset-2 focus:ring-offset-background",
  ctaOutline:
    "rounded-full border-border bg-card px-4 py-2 text-foreground hover:bg-muted/40",
  accentIcon: "text-ats-cobre",
  accentIconLight: "text-ats-terracotta",
  accentRing: "focus:ring-ats-cobre focus:ring-offset-background",
  errorText: "text-destructive",
  modal:
    "relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_40px_120px_rgba(87,88,91,0.12)]",
  modalHeader: "flex shrink-0 items-center justify-between border-b border-border px-6 py-5",
  modalFooter:
    "flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-5",
  tipsWidget:
    "overflow-hidden rounded-[26px] border border-border bg-card shadow-[0_16px_48px_rgba(87,88,91,0.08)] transition-opacity duration-300",
  heroCardOverlay:
    "absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(110,185,64,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(67,140,57,0.08),transparent_24%)]",
  heroIllustrationFrame:
    "hidden w-full max-w-[32rem] shrink-0 overflow-visible md:block md:w-[min(36rem,48%)] md:max-w-none",
  heroIllustrationImage:
    "block h-auto w-full max-h-[22rem] overflow-visible object-contain object-center lg:max-h-[28rem] [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-h-[22rem] [&_svg]:overflow-visible lg:[&_svg]:max-h-[28rem]",
  activeBadge:
    "inline-flex items-center gap-2 rounded-full border border-ats-terracotta/25 bg-ats-terracotta/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-ats-cobre",
  alertPanel:
    "rounded-[28px] border border-ats-terracotta/30 bg-ats-terracotta/10 px-5 py-6 text-sm text-ats-cobre",
  emptyStateIcon:
    "mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-border bg-muted/45 text-ats-cobre shadow-[0_24px_60px_rgba(110,185,64,0.14)]",
  progressBarGlow: "shadow-[0_0_24px_rgba(110,185,64,0.35)]",
  tipsIconSurface:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-ats-cobre-light/30 bg-linear-to-br from-ats-terracotta/20 to-ats-cobre/20",
} as const

export { BRAND_COLORS }
