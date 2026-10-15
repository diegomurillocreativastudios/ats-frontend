"use client"

import { useTranslations } from "next-intl"
import { CheckCircle2, LoaderCircle } from "lucide-react"
import { ApplyStyleProgressBar } from "@/components/public/apply-style-progress-bar"

export type PublicApplicationSubmitProgressTheme = "dark" | "light"

function getLoadingStepFromPercent(percent: number): 1 | 2 | 3 | 4 {
  if (percent < 24) return 1
  if (percent < 48) return 2
  if (percent < 72) return 3
  return 4
}

export function applySubmitProgressPanelClass(
  theme: PublicApplicationSubmitProgressTheme,
  opts: { absolute?: boolean } = {}
): string {
  const position = opts.absolute ? "absolute inset-0 z-20 " : ""
  if (theme === "dark") {
    return `${position}flex w-full min-h-[min(360px,70vh)] flex-col items-center justify-center rounded-[inherit] border border-ats-cobre/25 bg-[linear-gradient(180deg,rgba(32,33,36,0.97)_0%,rgba(32,33,36,0.99)_100%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl ring-1 ring-white/10`
  }
  return `${position}flex w-full min-h-[min(360px,70vh)] flex-col items-center justify-center rounded-lg border border-border bg-white/97 p-6 shadow-xl backdrop-blur-md ring-1 ring-ats-terracotta/15`
}

export function PublicApplicationSubmitProgress({
  theme,
  mode,
  loadingBarPercent = 0,
  showLongWaitHint = false,
}: {
  theme: PublicApplicationSubmitProgressTheme
  mode: "loading" | "success"
  loadingBarPercent?: number
  showLongWaitHint?: boolean
}) {
  const t = useTranslations("PublicOpportunities.applicationForm")
  const isDark = theme === "dark"
  const isSuccess = mode === "success"
  const currentStep = isSuccess ? 5 : getLoadingStepFromPercent(loadingBarPercent)
  const stepLabels = [
    t("steps.creation"),
    t("steps.analysis"),
    t("steps.application"),
    t("steps.saved"),
    t("steps.success"),
  ]
  const activeLabel = stepLabels[currentStep - 1] ?? ""

  return (
    <div
      className="mx-auto w-full max-w-lg space-y-6"
      role="status"
      aria-live="polite"
      aria-relevant="additions text"
      aria-busy={!isSuccess}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={
            isDark
              ? "flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/45 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted/60 shadow-sm"
          }
          aria-hidden
        >
          {isSuccess ? (
            <CheckCircle2 className="h-8 w-8 text-ats-cobre" />
          ) : (
            <LoaderCircle
              className={
                isDark
                  ? "h-7 w-7 animate-spin text-ats-cobre"
                  : "h-7 w-7 animate-spin text-ats-terracotta"
              }
            />
          )}
        </div>
        <p
          className={
            isDark
              ? "mt-4 text-xs font-medium uppercase tracking-[0.2em] text-foreground/50"
              : "mt-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
          }
        >
          {isSuccess ? t("steps.ready") : t("steps.processingTitle")}
        </p>
        <p className="mt-2 text-lg font-semibold text-foreground">{activeLabel}</p>
        {!isSuccess && showLongWaitHint ? (
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t("steps.processingLongWait")}
          </p>
        ) : null}
      </div>

      <ApplyStyleProgressBar
        theme="light"
        mode={isSuccess ? "success" : "loading"}
        percent={isSuccess ? 100 : loadingBarPercent}
      />

      <ol
        className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:gap-2"
        aria-label={t("aria.submitStatus")}
      >
        {[1, 2, 3, 4, 5].map((step) => {
          const isComplete = currentStep > step
          const isCurrent = currentStep === step
          const isSuccessStep = step === 5
          const label = stepLabels[step - 1] ?? ""
          return (
            <li
              key={step}
              className={
                isDark
                  ? `rounded-xl border px-2 py-2.5 text-center text-[11px] font-medium leading-tight transition-colors sm:text-xs ${
                      isCurrent
                        ? isSuccessStep
                          ? "border-ats-cobre/60 bg-ats-cobre/12 text-ats-cobre"
                          : "border-ats-cobre/50 bg-muted/45 text-foreground"
                        : isComplete
                          ? "border-border bg-white/4 text-muted-foreground"
                          : "border-white/8 bg-muted/20 text-muted-foreground"
                    }`
                  : `rounded-xl border px-2 py-2.5 text-center text-[11px] font-medium leading-tight transition-colors sm:text-xs ${
                      isCurrent
                        ? isSuccessStep
                          ? "border-ats-cobre/50 bg-ats-cobre/10 text-ats-cobre"
                          : "border-ats-terracotta/50 bg-ats-terracotta/8 text-foreground"
                        : isComplete
                          ? "border-border bg-muted/50 text-muted-foreground"
                          : "border-border/60 bg-background text-muted-foreground/60"
                    }`
              }
            >
              {label}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
