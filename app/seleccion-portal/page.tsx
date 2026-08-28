import Link from "next/link"
import { redirect } from "next/navigation"
import { Briefcase, Shield, Sparkles, Users, type LucideIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { getServerSessionUser } from "@/lib/server-session-user"
import {
  getAccessiblePortalKeys,
  PORTAL_HOME_HREF,
  resolveSolePortalHref,
  type PortalKey,
} from "@/lib/portal-access"
import LanguageSwitcher from "@/components/language-switcher"
import ProductBrand from "@/components/branding/ProductBrand"

interface PortalCardCopy {
  nameKey: "candidateName" | "opportunitiesName" | "rrhhName" | "adminName"
  descKey: "candidateDesc" | "opportunitiesDesc" | "rrhhDesc" | "adminDesc"
  ariaKey: "candidateAria" | "opportunitiesAria" | "rrhhAria" | "adminAria"
}

interface PortalCardConfig {
  href: string
  testId: string
  icon: LucideIcon
  iconWrapClass: string
  copy: PortalCardCopy
}

const PORTAL_CARDS: Record<PortalKey, PortalCardConfig> = {
  candidate: {
    href: PORTAL_HOME_HREF.candidate,
    testId: "portal-selector-candidato",
    icon: Users,
    iconWrapClass: "bg-vo-sky/15 text-vo-navy",
    copy: {
      nameKey: "candidateName",
      descKey: "candidateDesc",
      ariaKey: "candidateAria",
    },
  },
  opportunities: {
    href: PORTAL_HOME_HREF.opportunities,
    testId: "portal-selector-oportunidades",
    icon: Sparkles,
    iconWrapClass: "bg-vo-cobre/10 text-vo-cobre dark:text-emerald-400",
    copy: {
      nameKey: "opportunitiesName",
      descKey: "opportunitiesDesc",
      ariaKey: "opportunitiesAria",
    },
  },
  rrhh: {
    href: PORTAL_HOME_HREF.rrhh,
    testId: "portal-selector-rrhh",
    icon: Briefcase,
    iconWrapClass: "bg-vo-purple/10 text-vo-purple",
    copy: {
      nameKey: "rrhhName",
      descKey: "rrhhDesc",
      ariaKey: "rrhhAria",
    },
  },
  admin: {
    href: PORTAL_HOME_HREF.admin,
    testId: "portal-selector-admin",
    icon: Shield,
    iconWrapClass: "bg-vo-navy/10 text-vo-navy",
    copy: {
      nameKey: "adminName",
      descKey: "adminDesc",
      ariaKey: "adminAria",
    },
  },
}

function portalGridClass(count: number): string {
  if (count >= 4) return "sm:grid-cols-2 lg:grid-cols-4"
  if (count === 3) return "sm:grid-cols-2 md:grid-cols-3"
  if (count === 2) return "sm:grid-cols-2"
  return ""
}

export async function generateMetadata() {
  const t = await getTranslations("Metadata.portalSelection")

  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function SeleccionPortalPage() {
  const sessionUser = await getServerSessionUser()
  if (!sessionUser) {
    redirect("/auth/iniciar-sesion")
  }

  const solePortalHref = resolveSolePortalHref(sessionUser.role)
  if (solePortalHref) {
    redirect(solePortalHref)
  }

  const accessiblePortals = getAccessiblePortalKeys(sessionUser.role)
  const t = await getTranslations("PortalSelection")

  return (
    <div className="app-premium-bg relative min-h-screen overflow-hidden font-sans text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="ambient-orb ambient-orb--green left-[-120px] top-[-60px] h-[440px] w-[440px]" />
        <div className="ambient-orb ambient-orb--violet right-[-140px] top-[10%] h-[460px] w-[460px]" />
        <div className="ambient-orb ambient-orb--blue bottom-[-160px] left-1/3 h-[420px] w-[420px]" />
      </div>
      <div className="absolute right-3 top-3 z-50 md:right-4 md:top-4">
        <LanguageSwitcher />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-12 md:px-6">
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

        <div className={`grid gap-4 md:gap-6 ${portalGridClass(accessiblePortals.length)}`}>
          {accessiblePortals.map((portalKey) => {
            const card = PORTAL_CARDS[portalKey]
            const Icon = card.icon
            return (
              <Link
                key={portalKey}
                href={card.href}
                data-testid={card.testId}
                className="group glass-iridescent-card glass-card-hover iridescent-hover flex flex-col rounded-2xl p-6 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                aria-label={t(card.copy.ariaKey)}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.iconWrapClass}`}
                >
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <span className="mt-4 font-sans text-lg font-semibold text-foreground group-hover:text-vo-purple">
                  {t(card.copy.nameKey)}
                </span>
                <span className="mt-2 font-sans text-sm text-muted-foreground">
                  {t(card.copy.descKey)}
                </span>
                <span className="mt-4 font-sans text-sm font-medium text-vo-purple group-hover:underline">
                  {t("enter")}
                </span>
              </Link>
            )
          })}
        </div>

        <p className="mt-10 text-center font-sans text-xs text-muted-foreground">
          {t("footer")}
        </p>
      </div>
    </div>
  )
}
