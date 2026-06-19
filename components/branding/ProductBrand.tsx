import { AppliAiLogo } from "@/components/branding/AppliAiLogo"
import { APP_NAME } from "@/lib/app-brand"

export interface ProductBrandProps {
  layout: "inline" | "stacked"
  tone: "onDark" | "onLight"
  density:
    | "sidebar"
    | "topbarMobile"
    | "authMarketing"
    | "authMobileLogin"
    | "authMobileRegister"
  stackedIconVariant?: "purple" | "navy" | "magenta"
  className?: string
}

function getWordmarkClassName(density: ProductBrandProps["density"]): string {
  const sizeClass =
    density === "sidebar"
      ? "text-base sm:text-lg"
      : density === "topbarMobile"
        ? "text-xs sm:text-sm"
        : density === "authMarketing"
          ? "text-2xl md:text-3xl lg:text-4xl"
          : density === "authMobileLogin"
            ? "text-2xl"
            : "text-xl"

  return `font-display font-bold tracking-tight whitespace-nowrap leading-none ${sizeClass}`
}

function AppWordmark({
  density,
  isOnDark,
}: {
  density: ProductBrandProps["density"]
  isOnDark: boolean
}) {
  const baseClass = getWordmarkClassName(density)

  if (isOnDark) {
    return (
      <span className={`${baseClass} text-white`} aria-label={APP_NAME}>
        Appli AI
      </span>
    )
  }

  return (
    <span className={baseClass} aria-label={APP_NAME}>
      <span className="text-foreground">Appli</span>
      <span className="text-ats-terracotta"> AI</span>
    </span>
  )
}

/**
 * Marca producto (icono + wordmark) para paneles de auth, nav lateral y topbar compacto.
 */
export default function ProductBrand({
  layout,
  tone,
  density,
  stackedIconVariant: _stackedIconVariant = "purple",
  className = "",
}: ProductBrandProps) {
  const isOnDark = tone === "onDark"

  const iconClassName =
    density === "authMarketing"
      ? "h-12 w-12 shrink-0 md:h-14 md:w-14 lg:h-16 lg:w-16"
      : density === "authMobileLogin"
        ? "h-16 w-16 shrink-0"
        : density === "authMobileRegister"
          ? "h-[3.25rem] w-[3.25rem] shrink-0"
          : density === "sidebar"
            ? "h-10 w-10 shrink-0 sm:h-11 sm:w-11"
            : "h-7 w-7 shrink-0"

  const iconMark = (
    <AppliAiLogo
      variant={isOnDark ? "light" : "default"}
      className={iconClassName}
    />
  )

  const wordmark = <AppWordmark density={density} isOnDark={isOnDark} />

  if (layout === "stacked") {
    const gapClass =
      density === "authMobileLogin"
        ? "gap-2.5"
        : density === "authMobileRegister"
          ? "gap-2"
          : "gap-3"

    return (
      <div className={`flex flex-col items-center ${gapClass} ${className}`}>
        {iconMark}
        {wordmark}
      </div>
    )
  }

  const inlineGap =
    density === "authMarketing"
      ? "items-center gap-3 md:gap-3.5 lg:gap-4"
      : density === "sidebar"
        ? "items-center gap-3"
        : "items-center gap-2.5"

  return (
    <div className={`flex min-w-0 ${inlineGap} ${className}`}>
      {iconMark}
      <span className="flex min-w-0 shrink items-center">{wordmark}</span>
    </div>
  )
}
