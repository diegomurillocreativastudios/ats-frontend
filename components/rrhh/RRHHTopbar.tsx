"use client";

import { Fragment, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight, Bell, Menu, LogOut, Shield } from "lucide-react";
import ProductBrand from "@/components/branding/ProductBrand";
import LanguageSwitcher from "@/components/language-switcher";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getInitials } from "@/lib/getInitials";
import { isAdminRole } from "@/lib/roles";

const DESKTOP_PADDING = "px-8";
const TABLET_PADDING = "px-5";
const MOBILE_PADDING = "px-4";

interface BreadcrumbSegment {
  label: string
  href?: string
}

interface RRHHTopbarProps {
  variant?: "desktop" | "tablet" | "mobile"
  breadcrumbLabel?: string
  breadcrumbTrail?: BreadcrumbSegment[] | null
}

export default function RRHHTopbar({
  variant = "desktop",
  breadcrumbLabel = "Dashboard",
  breadcrumbTrail = null,
}: RRHHTopbarProps) {
  const t = useTranslations("Topbar");
  const tActions = useTranslations("Actions");
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

  const hasTrail = Array.isArray(breadcrumbTrail) && breadcrumbTrail.length > 0
  const portalLabel = t("portalRRHH")
  const breadcrumbScreenReaderText = hasTrail
    ? [portalLabel, ...breadcrumbTrail.map((s) => s.label)].join(" > ")
    : `${portalLabel} > ${breadcrumbLabel}`

  const heightClass =
    variant === "mobile" ? "h-14" : variant === "tablet" ? "h-14 md:h-16" : "h-16";

  return (
    <header
      className={`glass-navbar flex shrink-0 items-center justify-between ${heightClass} ${paddingClass}`}
      role="banner"
    >
      <div className="flex items-center gap-4">
        {(isTablet || isMobile) && (
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-muted md:h-10 md:w-10"
            aria-label={t("openMenu")}
          >
            <Menu className="h-6 w-6 text-foreground md:h-6" aria-hidden />
          </button>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isDesktop && (
            <>
              <span className="font-sans text-sm text-muted-foreground">
                {portalLabel}
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              {hasTrail ? (
                <nav
                  className="flex min-w-0 flex-wrap items-center gap-2"
                  aria-label={t("breadcrumb")}
                >
                  {breadcrumbTrail.map((segment, index) => {
                    const isLast = index === breadcrumbTrail.length - 1
                    const showLink = Boolean(segment.href) && !isLast
                    return (
                      <Fragment key={`${segment.label}-${index}`}>
                        {showLink ? (
                          <Link
                            href={segment.href}
                            className="font-sans text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded"
                          >
                            {segment.label}
                          </Link>
                        ) : (
                          <span
                            className={`min-w-0 truncate font-sans text-sm ${
                              isLast
                                ? "font-medium text-foreground"
                                : "text-muted-foreground"
                            }`}
                            aria-current={isLast ? "page" : undefined}
                          >
                            {segment.label}
                          </span>
                        )}
                        {!isLast ? (
                          <ChevronRight
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                        ) : null}
                      </Fragment>
                    )
                  })}
                </nav>
              ) : (
                <span className="font-sans text-sm font-medium text-foreground">
                  {breadcrumbLabel}
                </span>
              )}
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
          {!isDesktop ? (
            <span className="sr-only">{breadcrumbScreenReaderText}</span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
          aria-label={t("notifications")}
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
            className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-vo-purple to-vo-magenta font-sans text-[10px] font-semibold text-white shadow-sm md:h-8 md:w-8 md:text-[11px] hover:opacity-90 focus:outline-none"
            aria-label={t("userMenu")}
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            {loading ? "..." : initials}
          </button>
          {menuOpen && (
            <div
              className="glass-panel absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-xl py-1"
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
                  {t("adminShortcut")}
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans text-sm text-foreground hover:bg-muted"
                role="menuitem"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                {tActions("logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
