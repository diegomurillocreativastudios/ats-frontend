/**
 * Punto único de navegación para i18n.
 *
 * Etapa 1: como NO hay ruteo por prefijo de locale, se re-exportan las APIs de
 * navegación estándar de Next.js. Esto crea una "costura" (seam): cuando se
 * adopte ruteo por prefijo (`/en`, `/it`, ...) en una etapa posterior, bastará
 * con reemplazar este archivo por `createNavigation(routing)` de `next-intl`
 * sin tocar los componentes que ya importen desde aquí.
 */

export { default as Link } from "next/link"
export { usePathname, useRouter, redirect, permanentRedirect } from "next/navigation"
