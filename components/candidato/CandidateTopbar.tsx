"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Bell, Menu, LogOut, Shield } from "lucide-react";
import ProductBrand from "@/components/branding/ProductBrand";
import LanguageSwitcher from "@/components/language-switcher";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getInitials } from "@/lib/getInitials";
import { isAdminRole } from "@/lib/roles";

const DESKTOP_PADDING = "px-8";
const TABLET_PADDING = "px-5";
const MOBILE_PADDING = "px-4";

export default function CandidateTopbar({
  variant = "desktop",
  /** Etiqueta del breadcrumb (ej. "Inicio", "Documentos"). Desktop only. */
  breadcrumbLabel = "Inicio",
}) {
  const isDesktop = variant === "desktop";
  const isTablet = variant === "tablet";
  const isMobile = variant === "mobile";
  const { user, loading } = useCurrentUser();
  const showAdminShortcut = isAdminRole(user?.role);
  const initials = getInitials(user?.name, user?.email);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push(
        `/auth/iniciar-sesion?logout=${response.ok ? "success" : "error"}`
      );
    } catch {
      router.push("/auth/iniciar-sesion?logout=error");
    }
  };

  const handleGoToAdmin = () => {
    setMenuOpen(false);
    router.push("/portal-admin");
  };

  const paddingClass =
    variant === "desktop"
      ? DESKTOP_PADDING
      : variant === "tablet"
        ? "px-4 md:px-5"
        : MOBILE_PADDING;

  const heightClass =
    variant === "mobile" ? "h-14" : variant === "tablet" ? "h-14 md:h-16" : "h-16";

  return (
    <header
      className={`flex shrink-0 items-center justify-between border-b border-border bg-card ${heightClass} ${paddingClass}`}
      role="banner"
    >
      <div className="flex items-center gap-4">
        {(isTablet || isMobile) && (
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-muted md:h-10 md:w-10"
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6 text-foreground md:h-6" aria-hidden />
          </button>
        )}
        <div className="flex items-center gap-2">
          {isDesktop && (
            <>
              <span className="font-sans text-sm text-muted-foreground">
                Portal Candidato
              </span>
              <ChevronRight
                className="h-4 w-4 text-muted-foreground"
                aria-hidden
              />
            </>
          )}
          {(isTablet || isMobile) && (
            <ProductBrand
              layout="inline"
              tone="onLight"
              density="topbarMobile"
              className="min-w-0 shrink"
            />
          )}
          <span
            className={`font-sans text-sm font-medium text-foreground ${
              isDesktop ? "" : "sr-only"
            }`}
          >
            {breadcrumbLabel}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Notificaciones"
        >
          <Bell
            className="h-5 w-5 text-muted-foreground"
            aria-hidden
          />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center rounded-2xl bg-vo-navy font-sans text-[10px] font-semibold text-white md:h-8 md:w-8 md:text-[11px] hover:opacity-90 focus:outline-none"
            aria-label="Menú de usuario"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            {loading ? "..." : initials}
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-lg border border-border bg-card py-1 shadow-lg"
              role="menu"
            >
              {showAdminShortcut && (
                <button
                  type="button"
                  onClick={handleGoToAdmin}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans text-sm text-foreground hover:bg-muted"
                  role="menuitem"
                >
                  <Shield className="h-4 w-4 shrink-0" aria-hidden />
                  Administración
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans text-sm text-foreground hover:bg-muted"
                role="menuitem"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
