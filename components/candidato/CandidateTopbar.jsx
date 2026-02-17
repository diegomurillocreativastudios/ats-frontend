"use client";

import { ChevronRight, Bell, Menu } from "lucide-react";

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
              <span className="font-inter text-sm text-muted-foreground">
                Portal Candidato
              </span>
              <ChevronRight
                className="h-4 w-4 text-muted-foreground"
                aria-hidden
              />
            </>
          )}
          {(isTablet || isMobile) && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-vo-purple font-inter text-base font-bold text-white md:h-8 md:w-8">
                C
              </div>
              <span className="font-inter text-base font-bold text-foreground">
                ATS App
              </span>
            </div>
          )}
          <span
            className={`font-inter text-sm font-medium text-foreground ${
              isDesktop ? "" : "sr-only"
            }`}
          >
            {breadcrumbLabel}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
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
        <div
          className="flex h-8 w-8 items-center justify-center rounded-2xl bg-vo-navy font-inter text-[10px] font-semibold text-white md:h-8 md:w-8 md:text-[11px]"
          aria-hidden
        >
          MC
        </div>
      </div>
    </header>
  );
}
