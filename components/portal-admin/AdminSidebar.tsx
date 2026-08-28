"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  Briefcase,
  Building2,
  Calendar,
  CircleDot,
  ClipboardList,
  FileText,
  IdCard,
  ListChecks,
  Shield,
  Tags,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react"
import {
  PortalSidebarFrame,
  SidebarNavGroup,
  SidebarNavItem,
  SidebarUserFooter,
} from "@/components/navigation/portal-sidebar"
import {
  ADMIN_PORTAL_NAV_ITEMS,
  isAdminNavHrefActive,
  type AdminPortalNavLabelKey,
} from "@/lib/admin-portal-nav"

const NAV_ICONS: Record<
  Exclude<AdminPortalNavLabelKey, "settings">,
  LucideIcon
> = {
  administration: Shield,
  vacancies: Briefcase,
  stages: ClipboardList,
  stageStatuses: CircleDot,
  departments: Building2,
  modalities: Briefcase,
  templates: FileText,
  interviews: Calendar,
  interviewTypes: Tags,
  interviewModalities: Video,
  interviewStatuses: ListChecks,
  users: Users,
  documentTypes: IdCard,
  companies: Building2,
  interviewsCalendar: Calendar,
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
          {ADMIN_PORTAL_NAV_ITEMS.map((item) => {
            if (item.kind === "link") {
              return (
                <SidebarNavItem
                  key={item.href}
                  href={item.href}
                  icon={NAV_ICONS[item.labelKey]}
                  label={t(item.labelKey)}
                  isActive={isAdminNavHrefActive(pathname, item.href)}
                />
              )
            }

            return (
              <SidebarNavGroup
                key={item.id}
                id={`admin-nav-${item.id}`}
                icon={NAV_ICONS[item.labelKey]}
                label={t(item.labelKey)}
              >
                {item.children.map((child) => (
                  <SidebarNavItem
                    key={child.href}
                    href={child.href}
                    icon={NAV_ICONS[child.labelKey]}
                    label={t(child.labelKey)}
                    isActive={isAdminNavHrefActive(pathname, child.href)}
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
