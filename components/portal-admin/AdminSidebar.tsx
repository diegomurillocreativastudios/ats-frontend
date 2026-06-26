"use client"

import Link from "next/link"
import ProductBrand from "@/components/branding/ProductBrand"
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
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getInitials } from "@/lib/getInitials"
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

export default function AdminSidebar() {
  const pathname = usePathname()
  const t = useTranslations("Navigation")
  const tSidebar = useTranslations("Sidebar")
  const tCommon = useTranslations("Common")
  const tShell = useTranslations("AdminPortal.shell")
  const { user, loading } = useCurrentUser()
  const displayName = user?.name || user?.email || tShell("userFallback")
  const initials = getInitials(user?.name, user?.email)
  const roleLabel = user?.role || tShell("roleFallback")

  return (
    <aside
      className="glass-sidebar flex w-[260px] shrink-0 flex-col justify-between py-6 pl-6 pr-0"
      aria-label={tSidebar("ariaAdmin")}
    >
      <div className="flex flex-col gap-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 px-5 transition-opacity hover:opacity-90 focus:outline-none"
          aria-label={tSidebar("goHome")}
        >
          <ProductBrand
            layout="inline"
            tone="onLight"
            density="sidebar"
            className="min-w-0"
          />
        </Link>
        <nav className="flex flex-col gap-1 px-3" aria-label={tSidebar("menuAdmin")}>
          {[...navItems, settingsNavItem].map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === "/portal-admin/entrevistas"
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)
            const baseClasses =
              "flex items-center gap-3 rounded-md px-4 py-3 font-sans text-sm transition-colors"
            const enabledClasses = isActive
              ? "bg-ats-arena/70 text-vo-purple font-medium"
              : "text-gray-600 hover:bg-muted hover:text-foreground"

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${baseClasses} ${enabledClasses}`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                {t(item.labelKey)}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="mt-4 px-3 pb-3">
        <div className="glass-panel flex items-center gap-3 rounded-xl p-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-vo-purple to-vo-magenta font-sans text-xs font-semibold text-white shadow-sm"
            aria-hidden
          >
            {loading ? "..." : initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-sans text-sm font-medium text-foreground">
              {loading ? tCommon("loading") : displayName}
            </p>
            <p className="font-sans text-xs text-muted-foreground">
              {roleLabel}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
