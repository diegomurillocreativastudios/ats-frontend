"use client";

import Link from "next/link";
import {
  Home,
  User,
  FileText,
  Activity,
  ClipboardList,
  Calendar,
  Mail,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Inicio", icon: Home, active: true },
  { href: "/candidato/perfil", label: "Mi Perfil", icon: User },
  { href: "/candidato/documentos", label: "Documentos", icon: FileText },
  { href: "/candidato/estado", label: "Mi Estado", icon: Activity },
  { href: "/candidato/evaluaciones", label: "Evaluaciones", icon: ClipboardList },
  { href: "/candidato/entrevistas", label: "Entrevistas", icon: Calendar },
  { href: "/candidato/mensajes", label: "Mensajes", icon: Mail },
];

export default function CandidateSidebar() {
  return (
    <aside
      className="flex w-[260px] shrink-0 flex-col justify-between border-r border-border bg-card py-6 pl-6 pr-0"
      aria-label="Navegación principal"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-vo-purple">
            <span className="font-inter text-lg font-bold leading-none text-vo-purple-foreground">
              C
            </span>
          </div>
          <span className="font-inter text-base font-bold text-foreground">
            ATS App
          </span>
        </div>
        <nav className="flex flex-col gap-1 px-3" aria-label="Menú candidato">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.active;
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-vo-navy font-inter text-xs font-semibold text-white">
            MC
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-inter text-sm font-medium text-foreground">
              María Castro
            </p>
            <p className="font-inter text-xs text-muted-foreground">
              Candidato
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
