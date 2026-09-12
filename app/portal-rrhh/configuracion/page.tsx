import { getTranslations } from "next-intl/server"
import { CalendarClock, UserRound, type LucideIcon } from "lucide-react"
import RRHHSidebar from "@/components/rrhh/RRHHSidebar"
import RRHHTopbar from "@/components/rrhh/RRHHTopbar"
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
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar
            variant="desktop"
            breadcrumbLabel={t("breadcrumb")}
            breadcrumbTrail={trail}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <SettingsPageSection
              title={t("title")}
              description={t("description")}
              contentClassName="max-w-4xl"
            >
              <SettingsHubList items={items} />
            </SettingsPageSection>
          </main>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar
          variant="tablet"
          breadcrumbLabel={t("breadcrumb")}
          breadcrumbTrail={trail}
        />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <SettingsPageSection
            title={t("title")}
            description={t("description")}
          >
            <SettingsHubList items={items} />
          </SettingsPageSection>
        </main>
      </div>
    </div>
  )
}
