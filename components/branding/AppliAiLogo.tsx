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
        d="M 100 30 C 100 65, 85 75, 55 75 C 85 75, 100 85, 100 125 C 100 85, 115 75, 145 75 C 115 75, 100 65, 100 30 Z"
        fill={accentColor}
      />
      <polygon points="45,170 75,170 92,128 80,95" fill={legColor} />
      <polygon points="155,170 125,170 108,128 120,95" fill={legColor} />
    </svg>
  )
}

export const APPLI_AI_LOGO_SVG_MARKUP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M 100 30 C 100 65, 85 75, 55 75 C 85 75, 100 85, 100 125 C 100 85, 115 75, 145 75 C 115 75, 100 65, 100 30 Z" fill="${BRAND_COLORS.cobre}"/><polygon points="45,170 75,170 92,128 80,95" fill="${BRAND_COLORS.grafito}"/><polygon points="155,170 125,170 108,128 120,95" fill="${BRAND_COLORS.grafito}"/></svg>`
