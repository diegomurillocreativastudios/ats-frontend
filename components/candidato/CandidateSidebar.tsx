"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Sparkles, Home, User, FileText, Calendar } from "lucide-react"
import {
  PortalSidebarFrame,
  SidebarNavItem,
  SidebarUserFooter,
} from "@/components/navigation/portal-sidebar"

const navItems = [
  { href: "/portal-candidato", labelKey: "home", icon: Home },
  { href: "/portal-candidato/mi-perfil", labelKey: "myProfile", icon: User },
  {
    href: "/portal-candidato/adecuar-perfil",
    labelKey: "tailorProfile",
    icon: Sparkles,
  },
  { href: "/portal-candidato/documentos", labelKey: "documents", icon: FileText },
  { href: "/portal-candidato/entrevistas", labelKey: "interviews", icon: Calendar },
] as const

function isCandidateNavActive(pathname: string, href: string): boolean {
  if (href === "/portal-candidato") return pathname === "/portal-candidato"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function CandidateSidebar() {
  const pathname = usePathname()
  const t = useTranslations("Navigation")
  const tSidebar = useTranslations("Sidebar")

  return (
    <PortalSidebarFrame
      ariaLabel={tSidebar("ariaCandidate")}
      brandAriaLabel={tSidebar("goToPortalSelection")}
      footer={
        <SidebarUserFooter
          fallbackRoleKey="roleCandidate"
          includeAdminShortcut
        />
      }
    >
      <nav
        className="flex min-h-0 flex-1 flex-col gap-0.5"
        aria-label={tSidebar("menuCandidate")}
      >
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={t(item.labelKey)}
            isActive={isCandidateNavActive(pathname, item.href)}
          />
        ))}
      </nav>
    </PortalSidebarFrame>
  )
}
