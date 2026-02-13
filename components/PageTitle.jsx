"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getPageTitle } from "@/lib/pageTitles";

/**
 * Componente genérico que actualiza el título del documento (<title>)
 * según la ruta actual. Se usa en el layout raíz para todas las vistas.
 */
export default function PageTitle() {
  const pathname = usePathname();

  useEffect(() => {
    const title = getPageTitle(pathname ?? "/");
    document.title = title;
  }, [pathname]);

  return null;
}
