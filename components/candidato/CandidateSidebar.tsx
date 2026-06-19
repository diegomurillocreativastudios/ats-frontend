"use client";

import Link from "next/link";
import ProductBrand from "@/components/branding/ProductBrand";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, User, FileText, Calendar } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getInitials } from "@/lib/getInitials";

const navItems = [
  { href: "/portal-candidato", labelKey: "home", icon: Home },
  { href: "/mi-perfil", labelKey: "myProfile", icon: User },
  { href: "/portal-candidato/documentos", labelKey: "documents", icon: FileText },
  { href: "/portal-candidato/entrevistas", labelKey: "interviews", icon: Calendar },
] as const;

export default function CandidateSidebar() {
  const pathname = usePathname();
  const t = useTranslations("Navigation");
  const tSidebar = useTranslations("Sidebar");
  const tCommon = useTranslations("Common");
  const { user, loading } = useCurrentUser();
  const displayName = user?.name || user?.email || "Usuario";
  const initials = getInitials(user?.name, user?.email);
  const roleLabel = user?.role || "Candidato";

  return (
    <aside
      className="flex w-[260px] shrink-0 flex-col justify-between border-r border-border bg-card py-6 pl-6 pr-0"
      aria-label={tSidebar("ariaCandidate")}
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
        <nav className="flex flex-col gap-1 px-3" aria-label={tSidebar("menuCandidate")}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/portal-candidato"
                ? pathname === "/portal-candidato"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-4 py-3 font-sans text-sm transition-colors ${
                  isActive
                    ? "bg-ats-arena/70 text-vo-purple font-medium"
                    : "text-gray-600 hover:bg-muted hover:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className="h-5 w-5 shrink-0"
                  aria-hidden
                />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-4 px-3 pb-3">
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-vo-navy font-sans text-xs font-semibold text-white"
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
  );
}
