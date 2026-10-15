"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useEffect } from "react";
import { getPageTitle } from "@/lib/pageTitles";
import { shouldLeaveDocumentTitleToServer } from "@/lib/seo/public-metadata";

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

  useLayoutEffect(() => {
    const path = getCurrentPath(pathname ?? undefined);
    if (shouldLeaveDocumentTitleToServer(path)) return;
    document.title = getPageTitle(path);
  }, [pathname]);

  useEffect(() => {
    const path = getCurrentPath(pathname ?? undefined);
    if (shouldLeaveDocumentTitleToServer(path)) return;
    const expected = getPageTitle(path);
    const apply = () => {
      if (document.title !== expected) document.title = expected;
    };
    apply();
    // Next.js may re-apply layout metadata after paint; reassert briefly.
    const timeouts = [0, 50, 200].map((ms) => setTimeout(apply, ms));
    const titleEl = document.querySelector("title");
    const observer =
      titleEl && typeof MutationObserver !== "undefined"
        ? new MutationObserver(apply)
        : null;
    observer?.observe(titleEl, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => {
      for (const timeout of timeouts) clearTimeout(timeout);
      observer?.disconnect();
    };
  }, [pathname]);

  return null;
}
