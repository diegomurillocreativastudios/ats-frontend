"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getPageTitle } from "@/lib/pageTitles";

/**
 * En el cliente usa la URL real (window.location) como fallback cuando
 * usePathname() aún no está listo en la primera carga.
 */
const getCurrentPath = (pathname) => {
  if (pathname != null && pathname !== "") return pathname;
  if (typeof window !== "undefined" && window.location?.pathname) {
    return window.location.pathname;
  }
  return "/";
};

/**
 * Actualiza el título en navegaciones del cliente (backup para rutas sin layout con metadata).
 * El título inicial lo envía el servidor vía metadata en cada layout de ruta.
 * useEffect refuerza el título después de que Next.js pueda haberlo cambiado (p. ej. en navegación cliente).
 */
export default function PageTitle() {
  const pathname = usePathname();
  const tPrivacyPolicy = useTranslations("Metadata.privacyPolicy");

  const resolveTitle = (path: string) => {
    if (path === "/privacy-policy") {
      return tPrivacyPolicy("title");
    }
    return getPageTitle(path);
  };

  useLayoutEffect(() => {
    const path = getCurrentPath(pathname ?? undefined);
    document.title = resolveTitle(path);
  }, [pathname, tPrivacyPolicy]);

  useEffect(() => {
    const path = getCurrentPath(pathname ?? undefined);
    const expected = resolveTitle(path);
    const apply = () => {
      if (document.title !== expected) document.title = expected;
    };
    apply();
    const t = setTimeout(apply, 0);
    return () => clearTimeout(t);
  }, [pathname, tPrivacyPolicy]);

  return null;
}
