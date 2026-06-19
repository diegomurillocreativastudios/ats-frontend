import Link from "next/link"
import { Briefcase, Shield, Sparkles, Users } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { getServerSessionUser } from "@/lib/server-session-user"
import { isAdminRole } from "@/lib/roles"
import LanguageSwitcher from "@/components/language-switcher"
import ProductBrand from "@/components/branding/ProductBrand"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.portalSelection")

  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function SeleccionPortalPage() {
  const sessionUser = await getServerSessionUser()
  const showAdmin = isAdminRole(sessionUser?.role)
  const t = await getTranslations("PortalSelection")

  return (
    <div className="relative min-h-screen bg-muted/40 font-sans text-foreground">
      <div className="absolute right-3 top-3 z-50 md:right-4 md:top-4">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-12 md:px-6">
        <header className="mb-10 text-center">
          <div className="flex justify-center">
            <ProductBrand
              layout="stacked"
              tone="onLight"
              density="authMobileLogin"
            />
          </div>
          <h1 className="mt-6 font-sans text-2xl font-bold tracking-tight md:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 font-sans text-sm text-muted-foreground md:text-base">
            {t("subtitle")}
          </p>
        </header>

        <div
          className={`grid gap-4 md:gap-6 ${
            showAdmin
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : "sm:grid-cols-2 md:grid-cols-3"
          }`}
        >
          <Link
            href="/portal-candidato"
            data-testid="portal-selector-candidato"
            className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-vo-purple/40 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            aria-label={t("candidateAria")}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-vo-sky/15 text-vo-navy">
              <Users className="h-6 w-6" aria-hidden />
            </span>
            <span className="mt-4 font-sans text-lg font-semibold text-foreground group-hover:text-vo-purple">
              {t("candidateName")}
            </span>
            <span className="mt-2 font-sans text-sm text-muted-foreground">
              {t("candidateDesc")}
            </span>
            <span className="mt-4 font-sans text-sm font-medium text-vo-purple group-hover:underline">
              {t("enter")}
            </span>
          </Link>

          <Link
            href="/portal-oportunidades"
            data-testid="portal-selector-oportunidades"
            className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-vo-purple/40 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            aria-label={t("opportunitiesAria")}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-vo-cobre/10 text-vo-cobre dark:text-emerald-400">
              <Sparkles className="h-6 w-6" aria-hidden />
            </span>
            <span className="mt-4 font-sans text-lg font-semibold text-foreground group-hover:text-vo-purple">
              {t("opportunitiesName")}
            </span>
            <span className="mt-2 font-sans text-sm text-muted-foreground">
              {t("opportunitiesDesc")}
            </span>
            <span className="mt-4 font-sans text-sm font-medium text-vo-purple group-hover:underline">
              {t("enter")}
            </span>
          </Link>

          <Link
            href="/portal-rrhh"
            data-testid="portal-selector-rrhh"
            className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-vo-purple/40 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            aria-label={t("rrhhAria")}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-vo-purple/10 text-vo-purple">
              <Briefcase className="h-6 w-6" aria-hidden />
            </span>
            <span className="mt-4 font-sans text-lg font-semibold text-foreground group-hover:text-vo-purple">
              {t("rrhhName")}
            </span>
            <span className="mt-2 font-sans text-sm text-muted-foreground">
              {t("rrhhDesc")}
            </span>
            <span className="mt-4 font-sans text-sm font-medium text-vo-purple group-hover:underline">
              {t("enter")}
            </span>
          </Link>

          {showAdmin ? (
            <Link
              href="/portal-admin/usuarios"
              data-testid="portal-selector-admin"
              className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-vo-purple/40 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
              aria-label={t("adminAria")}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-vo-navy/10 text-vo-navy">
                <Shield className="h-6 w-6" aria-hidden />
              </span>
              <span className="mt-4 font-sans text-lg font-semibold text-foreground group-hover:text-vo-purple">
                {t("adminName")}
              </span>
              <span className="mt-2 font-sans text-sm text-muted-foreground">
                {t("adminDesc")}
              </span>
              <span className="mt-4 font-sans text-sm font-medium text-vo-purple group-hover:underline">
                {t("enter")}
              </span>
            </Link>
          ) : null}
        </div>

        <p className="mt-10 text-center font-sans text-xs text-muted-foreground">
          {t("footer")}
        </p>
      </div>
    </div>
  )
}
