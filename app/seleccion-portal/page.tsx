import { redirect } from "next/navigation"
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
import PortalSelectionGallery, {
  PORTAL_SELECTION_IMAGES,
  type PortalSelectionItem,
} from "@/components/seleccion-portal/portal-selection-gallery"
import { NOINDEX_NOFOLLOW } from "@/lib/seo/public-metadata"

interface PortalCardCopy {
  nameKey:
    | "candidateName"
    | "opportunitiesName"
    | "rrhhName"
    | "pruebasName"
    | "adminName"
  descKey:
    | "candidateDesc"
    | "opportunitiesDesc"
    | "rrhhDesc"
    | "pruebasDesc"
    | "adminDesc"
  ariaKey:
    | "candidateAria"
    | "opportunitiesAria"
    | "rrhhAria"
    | "pruebasAria"
    | "adminAria"
}

interface PortalCardConfig {
  href: string
  testId: string
  copy: PortalCardCopy
}

const PORTAL_CARDS: Record<PortalKey, PortalCardConfig> = {
  candidate: {
    href: PORTAL_HOME_HREF.candidate,
    testId: "portal-selector-candidato",
    copy: {
      nameKey: "candidateName",
      descKey: "candidateDesc",
      ariaKey: "candidateAria",
    },
  },
  opportunities: {
    href: PORTAL_HOME_HREF.opportunities,
    testId: "portal-selector-oportunidades",
    copy: {
      nameKey: "opportunitiesName",
      descKey: "opportunitiesDesc",
      ariaKey: "opportunitiesAria",
    },
  },
  rrhh: {
    href: PORTAL_HOME_HREF.rrhh,
    testId: "portal-selector-rrhh",
    copy: {
      nameKey: "rrhhName",
      descKey: "rrhhDesc",
      ariaKey: "rrhhAria",
    },
  },
  pruebas: {
    href: PORTAL_HOME_HREF.pruebas,
    testId: "portal-selector-pruebas",
    copy: {
      nameKey: "pruebasName",
      descKey: "pruebasDesc",
      ariaKey: "pruebasAria",
    },
  },
  admin: {
    href: PORTAL_HOME_HREF.admin,
    testId: "portal-selector-admin",
    copy: {
      nameKey: "adminName",
      descKey: "adminDesc",
      ariaKey: "adminAria",
    },
  },
}

export async function generateMetadata() {
  const t = await getTranslations("Metadata.portalSelection")

  return {
    title: t("title"),
    description: t("description"),
    robots: NOINDEX_NOFOLLOW,
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

  const portals: PortalSelectionItem[] = accessiblePortals.map((portalKey) => {
    const card = PORTAL_CARDS[portalKey]
    return {
      key: portalKey,
      href: card.href,
      testId: card.testId,
      name: t(card.copy.nameKey),
      description: t(card.copy.descKey),
      ariaLabel: t(card.copy.ariaKey),
      image: PORTAL_SELECTION_IMAGES[portalKey],
    }
  })

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
        <header className="mb-6 text-center md:mb-8">
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

        <PortalSelectionGallery
          portals={portals}
          galleryLabel={t("subtitle")}
          enterLabel={t("enter")}
        />

        <p className="mt-8 text-center font-sans text-xs text-muted-foreground md:mt-10">
          {t("footer")}
        </p>
      </div>
    </div>
  )
}
