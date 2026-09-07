"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  LoginBrandLockup,
  LoginBrandPanel,
} from "@/components/auth/LoginBrandPanel"
import LanguageSwitcher from "@/components/language-switcher"
import { PRIVACY_POLICY_CONTACT_EMAIL } from "@/lib/legal/privacy-policy"

export const AUTH_FIELD_LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"

export const AUTH_TITLE_CLASS =
  "text-[26px] font-semibold tracking-tight text-slate-900"

export const AUTH_SUBTITLE_CLASS = "text-sm text-slate-500"

export const AUTH_LINK_CLASS =
  "font-semibold text-vo-purple transition-colors hover:text-vo-purple-hover hover:underline"

interface AuthSplitShellProps {
  children: ReactNode
  showMobileLockup?: boolean
}

/**
 * Split-screen chrome shared by ApplicantTree auth routes:
 * brand panel on large screens, support/language header, white card, legal footer.
 */
export function AuthSplitShell({
  children,
  showMobileLockup = true,
}: AuthSplitShellProps) {
  const t = useTranslations("Auth.login")

  return (
    <div className="min-h-screen font-sans lg:grid lg:h-screen lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:overflow-hidden">
      <LoginBrandPanel />

      <section className="relative flex min-h-screen flex-col bg-background lg:h-full lg:overflow-y-auto">
        <header className="flex items-center justify-end gap-4 px-5 pt-5 sm:px-8">
          <a
            href={`mailto:${PRIVACY_POLICY_CONTACT_EMAIL}`}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple/40 focus-visible:ring-offset-2 sm:text-sm"
            data-testid="auth-login-support"
            aria-label={t("supportHelp")}
          >
            <span className="sm:hidden">{t("supportHelpShort")}</span>
            <span className="hidden sm:inline">{t("supportHelp")}</span>
          </a>
          <LanguageSwitcher
            triggerClassName="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-white px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple/40"
          />
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            {showMobileLockup ? (
              <div className="mb-6 lg:hidden">
                <LoginBrandLockup tone="onLight" />
              </div>
            ) : null}
            {children}
          </div>
        </div>

        <footer
          className="px-5 pb-5 text-center text-[11px] text-slate-400 sm:px-8"
          data-testid="auth-login-legal-footer"
        >
          <a
            href="https://creativastudios.us/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-slate-600"
          >
            {t("poweredByFooter")}
          </a>
          <span aria-hidden> • </span>
          <Link
            href="/privacy-policy"
            className="transition-colors hover:text-slate-600"
          >
            {t("legalPrivacy")}
          </Link>
          <span aria-hidden> • </span>
          <Link
            href="/privacy-policy"
            className="transition-colors hover:text-slate-600"
          >
            {t("legalTerms")}
          </Link>
          <span aria-hidden> • </span>
          <Link
            href="/privacy-policy#security"
            className="transition-colors hover:text-slate-600"
          >
            {t("legalSecurity")}
          </Link>
        </footer>
      </section>
    </div>
  )
}
