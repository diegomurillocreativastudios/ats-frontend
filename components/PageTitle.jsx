"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
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
 */
export default function PageTitle() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const path = getCurrentPath(pathname ?? undefined);
    document.title = getPageTitle(path);
  }, [pathname]);

  return null;
}
