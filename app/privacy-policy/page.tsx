import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ApplicanTreeLogo } from "@/components/branding/ApplicanTreeLogo"
import LanguageSwitcher from "@/components/language-switcher"
import {
  PRIVACY_POLICY_CONTACT_EMAIL,
  PRIVACY_POLICY_PRODUCT_NAME,
} from "@/lib/legal/privacy-policy"
import { publicOpportunitiesTheme as theme } from "@/lib/public-opportunities-theme"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.privacyPolicy")
  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

interface PolicySectionProps {
  title: string
  children: ReactNode
}

function PolicySection({ title, children }: PolicySectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {children}
      </div>
    </section>
  )
}

interface PolicyListProps {
  items: string[]
}

function PolicyList({ items }: PolicyListProps) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("PrivacyPolicy")
  const productName = PRIVACY_POLICY_PRODUCT_NAME

  const informationItems = [
    t("sections.informationWeCollect.items.nameEmail"),
    t("sections.informationWeCollect.items.profilePicture"),
    t("sections.informationWeCollect.items.accountIdentifiers"),
    t("sections.informationWeCollect.items.professionalInfo"),
    t("sections.informationWeCollect.items.technicalUsage"),
  ]

  const howWeUseItems = [
    t("sections.howWeUse.items.operate"),
    t("sections.howWeUse.items.authenticate"),
    t("sections.howWeUse.items.recruitment"),
    t("sections.howWeUse.items.support"),
    t("sections.howWeUse.items.improve"),
    t("sections.howWeUse.items.legal"),
  ]

  const linkedInItems = [
    t("sections.linkedInSignIn.items.name"),
    t("sections.linkedInSignIn.items.email"),
    t("sections.linkedInSignIn.items.profilePicture"),
    t("sections.linkedInSignIn.items.linkedInId"),
    t("sections.linkedInSignIn.items.authProvider"),
  ]

  const dataSharingItems = [
    t("sections.dataSharing.items.serviceProviders"),
    t("sections.dataSharing.items.organization"),
    t("sections.dataSharing.items.legal"),
    t("sections.dataSharing.items.protection"),
  ]

  return (
    <div className="relative flex min-h-screen flex-col bg-ats-warm-white text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={theme.heroGradientShort} />
        <div
          className={`absolute left-[-8%] top-6 h-56 w-56 ${theme.orbTerracotta}`}
        />
        <div
          className={`absolute right-[4%] top-10 h-64 w-64 ${theme.orbCobre}`}
        />
      </div>

      <header
        className={`relative z-40 overflow-visible border-b ${theme.border} bg-card/95 backdrop-blur-sm`}
      >
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/auth/iniciar-sesion"
            className="inline-flex items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ats-cobre focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={t("header.homeAriaLabel")}
          >
            <ApplicanTreeLogo className="h-10 w-auto sm:h-11" />
            <span className="text-sm font-semibold text-foreground sm:text-base">
              {productName}
            </span>
          </Link>

          <LanguageSwitcher triggerClassName={theme.navAction} />
        </div>
      </header>

      <main className="relative z-0 flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <article
          className={`mx-auto w-full max-w-3xl space-y-10 rounded-[28px] border ${theme.border} bg-card/90 px-6 py-8 shadow-[0_20px_60px_rgba(87,88,91,0.08)] backdrop-blur-sm sm:px-10 sm:py-12`}
        >
          <header className="space-y-4 border-b border-border pb-8">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              {t("page.eyebrow")}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t("page.title")}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {t("page.intro", { productName })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("page.lastUpdated")}
            </p>
          </header>

          <PolicySection title={t("sections.informationWeCollect.title")}>
            <p>{t("sections.informationWeCollect.p1")}</p>
            <p>{t("sections.informationWeCollect.p2")}</p>
            <PolicyList items={informationItems} />
          </PolicySection>

          <PolicySection title={t("sections.howWeUse.title")}>
            <p>{t("sections.howWeUse.p1")}</p>
            <PolicyList items={howWeUseItems} />
            <p>{t("sections.howWeUse.p2", { productName })}</p>
          </PolicySection>

          <PolicySection title={t("sections.linkedInSignIn.title")}>
            <p>{t("sections.linkedInSignIn.p1")}</p>
            <PolicyList items={linkedInItems} />
            <p>{t("sections.linkedInSignIn.p2")}</p>
          </PolicySection>

          <PolicySection title={t("sections.dataSharing.title")}>
            <p>{t("sections.dataSharing.p1")}</p>
            <PolicyList items={dataSharingItems} />
          </PolicySection>

          <PolicySection title={t("sections.dataSecurity.title")}>
            <p>{t("sections.dataSecurity.p1")}</p>
          </PolicySection>

          <PolicySection title={t("sections.dataRetention.title")}>
            <p>{t("sections.dataRetention.p1")}</p>
          </PolicySection>

          <PolicySection title={t("sections.yourRights.title")}>
            <p>{t("sections.yourRights.p1")}</p>
            <p>{t("sections.yourRights.p2")}</p>
          </PolicySection>

          <PolicySection title={t("sections.contact.title")}>
            <p>{t("sections.contact.p1")}</p>
            <p>
              <a
                href={`mailto:${PRIVACY_POLICY_CONTACT_EMAIL}`}
                className={`font-medium ${theme.linkAccent} underline-offset-4 hover:underline`}
              >
                {PRIVACY_POLICY_CONTACT_EMAIL}
              </a>
            </p>
          </PolicySection>
        </article>
      </main>

      <footer
        className={`relative z-0 border-t ${theme.border} bg-card/80 px-4 py-6 text-center text-sm text-muted-foreground backdrop-blur-sm sm:px-6`}
      >
        <p>
          &copy; {new Date().getFullYear()} {productName}. {t("footer.copyright")}
        </p>
      </footer>
    </div>
  )
}
