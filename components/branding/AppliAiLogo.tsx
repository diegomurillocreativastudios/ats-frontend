import { BRAND_COLORS } from "@/lib/brand-colors"

export interface AppliAiLogoProps {
  variant?: "default" | "light"
  className?: string
}

/**
 * Logo «A» de Appli AI (SVG vectorial).
 */
export function AppliAiLogo({
  variant = "default",
  className = "",
}: AppliAiLogoProps) {
  const accentColor =
    variant === "light" ? BRAND_COLORS.warmWhite : BRAND_COLORS.cobre
  const legColor =
    variant === "light" ? BRAND_COLORS.warmWhite : BRAND_COLORS.grafito

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M100 28c0 28-18.5 41.5-48 46 29.5 4.5 48 18 48 44 0-26 18.5-39.5 48-44-29.5-4.5-48-18-48-46z"
        fill={accentColor}
      />
      <path
        d="M77 94h10l-13.5 69q0 6-6 6H49q-6 0-4-6z"
        fill={legColor}
      />
      <path
        d="M123 94h-10l13.5 69q0 6 6 6h18.5q6 0 4-6z"
        fill={legColor}
      />
    </svg>
  )
}

export const APPLI_AI_LOGO_SVG_MARKUP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Appli AI"><title>Appli AI</title><path fill="${BRAND_COLORS.cobre}" d="M100 28c0 28-18.5 41.5-48 46 29.5 4.5 48 18 48 44 0-26 18.5-39.5 48-44-29.5-4.5-48-18-48-46z"/><path fill="${BRAND_COLORS.grafito}" d="M77 94h10l-13.5 69q0 6-6 6H49q-6 0-4-6z"/><path fill="${BRAND_COLORS.grafito}" d="M123 94h-10l13.5 69q0 6 6 6h18.5q6 0 4-6z"/></svg>`
