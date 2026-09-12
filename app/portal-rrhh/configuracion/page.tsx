import { getTranslations } from "next-intl/server"
import { CalendarClock, UserRound, type LucideIcon } from "lucide-react"
import { RrhhPortalShell } from "@/components/rrhh/rrhh-portal-shell"
import { SettingsHubLink } from "@/components/rrhh/settings-hub-link"
import { SettingsPageSection } from "@/components/rrhh/settings-page-section"

interface SettingsHubItem {
  href: string
  icon: LucideIcon
  title: string
  description: string
}

/** Destinos del hub en dos columnas, sin pastillas. */
function SettingsHubList({ items }: { items: SettingsHubItem[] }) {
  return (
    <div className="grid max-w-4xl grid-cols-1 gap-10 md:grid-cols-2 md:gap-x-16 md:gap-y-8">
      {items.map((item) => (
        <SettingsHubLink
          key={item.href}
          href={item.href}
          icon={item.icon}
          title={item.title}
          description={item.description}
        />
      ))}
    </div>
  )
}

export async function generateMetadata() {
  const t = await getTranslations("Metadata.recruiterSettings")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function RRHHConfiguracionPage() {
  const t = await getTranslations("RecruiterPortal.settings")
  const trail = [{ label: t("breadcrumb") }]
  const items = [
    {
      href: "/portal-rrhh/configuracion/perfil",
      icon: UserRound,
      title: t("profile.title"),
      description: t("profile.description"),
    },
    {
      href: "/portal-rrhh/configuracion/calendario",
      icon: CalendarClock,
      title: t("googleCalendar.title"),
      description: t("googleCalendar.description"),
    },
  ]

  return (
    <RrhhPortalShell breadcrumbLabel={t("breadcrumb")} breadcrumbTrail={trail}>
      <SettingsPageSection
        title={t("title")}
        description={t("description")}
        contentClassName="max-w-4xl"
      >
        <SettingsHubList items={items} />
      </SettingsPageSection>
    </RrhhPortalShell>
  )
}
