"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  Activity,
  BarChart3,
  ClipboardList,
  FileBarChart,
  FileCheck2,
  HelpCircle,
  LayoutDashboard,
  Link2,
  UserPlus,
  type LucideIcon,
} from "lucide-react"
import {
  PortalSidebarFrame,
  SidebarNavGroup,
  SidebarNavItem,
  SidebarUserFooter,
} from "@/components/navigation/portal-sidebar"
import {
  PRUEBAS_NAV_GROUPS,
  isPruebasNavHrefActive,
  type PruebasNavKey,
} from "@/lib/pruebas/portal-nav"

const NAV_ICONS: Record<PruebasNavKey, LucideIcon> = {
  home: LayoutDashboard,
  evaluations: ClipboardList,
  questions: HelpCircle,
  links: Link2,
  assignments: UserPlus,
  tracking: Activity,
  review: FileCheck2,
  results: BarChart3,
  reports: FileBarChart,
}

export function PruebasSidebar() {
  const pathname = usePathname()
  const t = useTranslations("PruebasPortal")
  const tSidebar = useTranslations("Sidebar")

  return (
    <PortalSidebarFrame
      ariaLabel={tSidebar("ariaPruebas")}
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
        aria-label={tSidebar("menuPruebas")}
      >
        <div className="flex flex-col gap-3">
          {PRUEBAS_NAV_GROUPS.map((group) => {
            const soleItem = group.items.length === 1 ? group.items[0] : null
            if (soleItem && soleItem.navKey === group.groupKey) {
              return (
                <SidebarNavItem
                  key={group.id}
                  href={soleItem.href}
                  icon={NAV_ICONS[soleItem.navKey]}
                  label={t(`nav.${soleItem.navKey}`)}
                  isActive={isPruebasNavHrefActive(
                    pathname,
                    soleItem.href,
                    soleItem.exact,
                  )}
                />
              )
            }

            return (
              <SidebarNavGroup
                key={group.id}
                id={`pruebas-nav-${group.id}`}
                icon={NAV_ICONS[group.items[0].navKey]}
                label={t(`nav.groups.${group.groupKey}`)}
              >
                {group.items.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    href={item.href}
                    icon={NAV_ICONS[item.navKey]}
                    label={t(`nav.${item.navKey}`)}
                    isActive={isPruebasNavHrefActive(
                      pathname,
                      item.href,
                      item.exact,
                    )}
                    nested
                  />
                ))}
              </SidebarNavGroup>
            )
          })}
        </div>
      </nav>
    </PortalSidebarFrame>
  )
}
