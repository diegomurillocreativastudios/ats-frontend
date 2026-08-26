"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  ClipboardList,
  Cog,
  FileText,
  IdCard,
  Landmark,
  Users,
} from "lucide-react"
import {
  PortalSidebarFrame,
  SidebarNavItem,
  SidebarUserFooter,
} from "@/components/navigation/portal-sidebar"
import {
  ADMIN_PORTAL_NAV_LINKS,
  ADMIN_SETTINGS_NAV_LINK,
} from "@/lib/admin-portal-nav"

const NAV_ICONS = {
  stages: ClipboardList,
  templates: FileText,
  interviewsCatalog: Calendar,
  interviewsCalendar: CalendarDays,
  users: Users,
  companies: Landmark,
  departments: Building2,
  modalities: Briefcase,
  documentTypes: IdCard,
  settings: Cog,
} as const

const navItems = ADMIN_PORTAL_NAV_LINKS.map((item) => ({
  ...item,
  icon: NAV_ICONS[item.labelKey],
}))

const settingsNavItem = {
  ...ADMIN_SETTINGS_NAV_LINK,
  icon: NAV_ICONS[ADMIN_SETTINGS_NAV_LINK.labelKey],
}

function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "/portal-admin/entrevistas") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const t = useTranslations("Navigation")
  const tSidebar = useTranslations("Sidebar")

  return (
    <PortalSidebarFrame
      ariaLabel={tSidebar("ariaAdmin")}
      brandAriaLabel={tSidebar("goToPortalSelection")}
      footer={<SidebarUserFooter fallbackRoleKey="roleAdmin" />}
    >
      <nav
        className="flex min-h-0 flex-1 flex-col"
        aria-label={tSidebar("menuAdmin")}
      >
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={t(item.labelKey)}
              isActive={isAdminNavActive(pathname, item.href)}
            />
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-0.5 pt-4">
          <SidebarNavItem
            href={settingsNavItem.href}
            icon={settingsNavItem.icon}
            label={t(settingsNavItem.labelKey)}
            isActive={isAdminNavActive(pathname, settingsNavItem.href)}
          />
        </div>
      </nav>
    </PortalSidebarFrame>
  )
}
