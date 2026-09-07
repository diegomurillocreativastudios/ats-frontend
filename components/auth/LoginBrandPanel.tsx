"use client"

import { useTranslations } from "next-intl"
import { APP_NAME } from "@/lib/app-brand"

const TEAM_AVATARS = [
  { initials: "MR", className: "bg-[#A8D98A] text-[#256D35]" },
  { initials: "LV", className: "bg-[#E8F5E0] text-[#337C37]" },
  { initials: "AN", className: "bg-white text-[#256D35]" },
  { initials: "JP", className: "bg-[#D4EDCC] text-[#438C39]" },
] as const

const PREVIEW_TAGS = [
  "previewTagSourcing",
  "previewTagAnalytics",
  "previewTagEnglish",
] as const

interface LoginBrandLockupProps {
  tone?: "onDark" | "onLight"
}

/**
 * Lockup de marca: árbol + ApplicanTree.
 */
export function LoginBrandLockup({ tone = "onDark" }: LoginBrandLockupProps) {
  const isOnDark = tone === "onDark"

  return (
    <div className="flex min-w-0 items-center gap-3" aria-label={APP_NAME}>
      <span
        className={`auth-brand-logo flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white ${
          isOnDark ? "shadow-sm" : "shadow-sm ring-1 ring-black/5"
        }`}
      >
        <img
          src="/treeApplicant.svg"
          alt=""
          className="h-10 w-10 object-contain"
        />
      </span>
      <p
        className={`truncate text-2xl font-bold tracking-tight ${
          isOnDark ? "text-white" : "text-foreground"
        }`}
      >
        Applican
        <span className={isOnDark ? "text-[#A8D98A]" : "text-vo-purple"}>
          Tree
        </span>
      </p>
    </div>
  )
}

function FeatureCheckIcon() {
  return (
    <span
      className="auth-brand-check mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/25 text-white ring-1 ring-white/35"
      aria-hidden
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  )
}

/**
 * Panel izquierdo de marca para el login de escritorio.
 */
export function LoginBrandPanel() {
  const t = useTranslations("Auth.login")
  const featureKeys = ["feature1", "feature2", "feature3"] as const

  return (
    <aside
      className="relative hidden min-h-screen flex-col overflow-hidden bg-vo-purple text-white lg:flex"
      data-testid="auth-login-brand-panel"
    >
      <div
        className="auth-brand-grid pointer-events-none absolute inset-0 opacity-35"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-[#549E3C] via-vo-purple to-[#438C39]"
        aria-hidden
      />
      <div
        className="auth-brand-orb-a pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#A8D98A]/30 blur-3xl"
        aria-hidden
      />
      <div
        className="auth-brand-orb-b pointer-events-none absolute -right-16 bottom-24 h-80 w-80 rounded-full bg-[#256D35]/25 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-full flex-1 flex-col justify-between gap-8 px-8 py-8 xl:px-12 xl:py-10">
        <header className="flex items-center justify-between gap-4">
          <LoginBrandLockup tone="onDark" />
          <span className="auth-brand-glow inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="auth-brand-live-ring absolute inset-0 rounded-full bg-white/80" />
              <span className="auth-brand-live relative block h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            {t("aiEngineBadge")}
          </span>
        </header>

        <div className="flex flex-col gap-6">
          <p className="w-fit rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-medium text-white/95">
            <span className="auth-brand-spark" aria-hidden>
              ⚡
            </span>{" "}
            {t("themeBadge")}
          </p>

          <div className="flex flex-col gap-4">
            <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.15] tracking-tight text-white">
              {t("brandTitle")}
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-white/80 xl:text-base">
              {t("brandSubtitle")}
            </p>
          </div>

          <ul className="auth-brand-features flex flex-col gap-3">
            {featureKeys.map((key) => (
              <li key={key} className="flex items-start gap-3 text-sm text-white/95 xl:text-[15px]">
                <FeatureCheckIcon />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>

          <article
            className="auth-brand-float relative hidden max-w-md overflow-hidden rounded-2xl border border-white/20 bg-white/12 p-4 shadow-xl backdrop-blur-md [@media(min-height:820px)]:block"
            aria-label={t("previewAria")}
          >
            <span
              className="auth-brand-shimmer pointer-events-none absolute inset-y-0 -left-1/3 z-0 w-1/3 bg-linear-to-r from-transparent via-white/25 to-transparent"
              aria-hidden
            />
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F5E0] text-sm font-semibold text-[#256D35]">
                  {t("previewInitials")}
                </span>
                <div>
                  <p className="font-semibold text-white">{t("previewName")}</p>
                  <p className="text-xs text-white/75">{t("previewRole")}</p>
                </div>
              </div>
              <span className="auth-brand-glow rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/30">
                {t("previewTopBadge")}
              </span>
            </div>

            <p className="relative z-10 mt-4 inline-flex rounded-lg bg-[#256D35]/25 px-2.5 py-1.5 text-xs font-medium text-white ring-1 ring-white/15">
              {t("previewMatch")}
            </p>

            <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
              {PREVIEW_TAGS.map((key) => (
                <span
                  key={key}
                  className="rounded-full border border-white/15 bg-[#256D35]/20 px-2.5 py-1 text-[11px] text-white/90"
                >
                  {t(key)}
                </span>
              ))}
              <span className="rounded-full bg-[#E8F5E0]/90 px-2.5 py-1 text-[11px] font-medium text-[#256D35]">
                {t("previewTagEvaluation")}
              </span>
            </div>
          </article>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {TEAM_AVATARS.map((avatar) => (
                <span
                  key={avatar.initials}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-[#549E3C] ${avatar.className}`}
                >
                  {avatar.initials}
                </span>
              ))}
            </div>
            <p className="text-xs text-white/85 xl:text-sm">
              {t("teamsSocialProof")}
            </p>
          </div>
          <span className="rounded-full border border-white/20 bg-white/12 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white">
            {t("complianceBadge")}
          </span>
        </footer>
      </div>
    </aside>
  )
}
