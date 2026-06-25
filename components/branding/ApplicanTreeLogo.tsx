import { APP_LOGO_SVG_SRC, APP_NAME } from "@/lib/app-brand"

export interface ApplicanTreeLogoProps {
  variant?: "default" | "light" | "full"
  className?: string
}

/**
 * Logo Applican Tree (SVG con árbol y wordmark integrados).
 */
export function ApplicanTreeLogo({
  variant = "default",
  className = "",
}: ApplicanTreeLogoProps) {
  const toneClass =
    variant === "light" ? "brightness-0 invert" : ""

  return (
    <img
      src={APP_LOGO_SVG_SRC}
      alt={APP_NAME}
      className={[toneClass, className].filter(Boolean).join(" ")}
    />
  )
}

/** @deprecated Usar ApplicanTreeLogo */
export const AppliAiLogo = ApplicanTreeLogo

export type AppliAiLogoProps = ApplicanTreeLogoProps
