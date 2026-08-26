"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Users, Briefcase, Calendar, BarChart3, Cog } from "lucide-react"
import {
  PortalSidebarFrame,
  SidebarNavItem,
  SidebarUserFooter,
} from "@/components/navigation/portal-sidebar"

const primaryNavItems = [
  { href: "/portal-rrhh/candidatos", labelKey: "candidates", icon: Users },
  { href: "/portal-rrhh/vacantes", labelKey: "vacancies", icon: Briefcase },
  { href: "/portal-rrhh/entrevistas", labelKey: "interviews", icon: Calendar },
  { href: "/portal-rrhh/reportes", labelKey: "reports", icon: BarChart3 },
] as const

const settingsNavItem = {
  href: "/portal-rrhh/configuracion",
  labelKey: "settings",
  icon: Cog,
} as const

function isRrhhNavActive(pathname: string, href: string): boolean {
  if (href === "/portal-rrhh/entrevistas") {
    return (
      pathname.startsWith("/portal-rrhh/entrevistas") ||
      pathname.startsWith("/portal-rrhh/interviews/")
    )
  }
  if (href === "/portal-rrhh/reportes") {
    return pathname.startsWith("/portal-rrhh/reportes")
  }
  if (href === "/portal-rrhh/configuracion") {
    return pathname.startsWith("/portal-rrhh/configuracion")
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function RRHHSidebar() {
  const pathname = usePathname()
  const t = useTranslations("Navigation")
  const tSidebar = useTranslations("Sidebar")

  return (
    <PortalSidebarFrame
      ariaLabel={tSidebar("ariaRRHH")}
      brandAriaLabel={tSidebar("goToPortalSelection")}
      footer={
        <SidebarUserFooter
          fallbackRoleKey="roleRecruiter"
          includeAdminShortcut
        />
      }
    >
      <nav
        className="flex min-h-0 flex-1 flex-col"
        aria-label={tSidebar("menuRRHH")}
      >
        <div className="flex flex-col gap-0.5">
          {primaryNavItems.map((item) => (
            <SidebarNavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={t(item.labelKey)}
              isActive={isRrhhNavActive(pathname, item.href)}
            />
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-0.5 pt-4">
          <SidebarNavItem
            href={settingsNavItem.href}
            icon={settingsNavItem.icon}
            label={t(settingsNavItem.labelKey)}
            isActive={isRrhhNavActive(pathname, settingsNavItem.href)}
          />
        </div>
      </nav>
    </PortalSidebarFrame>
  )
}
