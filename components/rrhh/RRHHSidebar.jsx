"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ClipboardList,
  Calendar,
  MessageSquare,
  FileCheck,
  BarChart3,
  Settings,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getInitials } from "@/lib/getInitials";

const navItems = [
  { href: "/portal-rrhh", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal-rrhh/candidatos", label: "Candidatos", icon: Users },
  { href: "/portal-rrhh/vacantes", label: "Vacantes", icon: Briefcase },
  { href: "/portal-rrhh/etapas", label: "Etapas", icon: ClipboardList },
  { href: "/portal-rrhh/evaluaciones", label: "Evaluaciones", icon: ClipboardList },
  { href: "/portal-rrhh/entrevistas", label: "Entrevistas", icon: Calendar },
  { href: "/portal-rrhh/comunicaciones", label: "Comunicaciones", icon: MessageSquare },
  { href: "/portal-rrhh/contratacion", label: "Contratación", icon: FileCheck },
  { href: "/portal-rrhh/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/portal-rrhh/configuracion", label: "Configuración", icon: Settings },
];

export default function RRHHSidebar() {
  const pathname = usePathname();
  const { user, loading } = useCurrentUser();
  const displayName = user?.name || user?.email || "Usuario";
  const initials = getInitials(user?.name, user?.email);
  const roleLabel = user?.role || "Administrador";

  return (
    <aside
      className="flex w-[260px] shrink-0 flex-col justify-between border-r border-border bg-card py-6 pl-6 pr-0"
      aria-label="Navegación Portal RRHH"
    >
      <div className="flex flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-3 px-5 transition-opacity hover:opacity-90 focus:outline-none"
          aria-label="Ir al inicio - ATS App"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-vo-purple">
            <Briefcase className="h-5 w-5 text-white" aria-hidden />
          </div>
          <span className="font-inter text-base font-bold text-foreground">
            ATS App
          </span>
        </Link>
        <nav className="flex flex-col gap-1 px-3" aria-label="Menú RRHH">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/portal-rrhh"
                ? pathname === "/portal-rrhh"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-4 py-3 font-inter text-sm transition-colors ${
                  isActive
                    ? "bg-[#F3E8FF] text-vo-purple font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className="h-5 w-5 shrink-0"
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-4 px-3 pb-3">
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-vo-navy font-inter text-xs font-semibold text-white"
            aria-hidden
          >
            {loading ? "..." : initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-inter text-sm font-medium text-foreground">
              {loading ? "Cargando..." : displayName}
            </p>
            <p className="font-inter text-xs text-muted-foreground">
              {roleLabel}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
