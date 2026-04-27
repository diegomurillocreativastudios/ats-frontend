import Image from "next/image"

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

const STACKED_ICON_BG: Record<
  NonNullable<ProductBrandProps["stackedIconVariant"]>,
  string
> = {
  purple: "bg-vo-purple",
  navy: "bg-vo-navy",
  magenta: "bg-vo-magenta",
}

/**
 * Marca producto (icono + wordmark) para paneles de auth, nav lateral y topbar compacto.
 */
export default function ProductBrand({
  layout,
  tone,
  density,
  stackedIconVariant = "purple",
  className = "",
}: ProductBrandProps) {
  const isOnDark = tone === "onDark"
  const wordmarkClass = isOnDark
    ? "h-auto object-contain brightness-0 invert"
    : "h-auto object-contain"

  const iconShellClass =
    density === "sidebar"
      ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white shadow-sm"
      : density === "topbarMobile"
        ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white shadow-sm"
        : density === "authMarketing"
          ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-white/10 lg:h-14 lg:w-14 lg:rounded-xl"
          : density === "authMobileLogin"
            ? `flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${STACKED_ICON_BG[stackedIconVariant]}`
            : `flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${STACKED_ICON_BG[stackedIconVariant]}`

  const iconInnerClass =
    density === "sidebar"
      ? "h-auto w-[26px] object-contain"
      : density === "topbarMobile"
        ? "h-auto w-[22px] object-contain"
        : density === "authMarketing"
          ? "h-auto w-[30px] object-contain lg:w-[38px]"
          : density === "authMobileLogin"
            ? "h-auto w-[40px] object-contain"
            : "h-auto w-[32px] object-contain"

  const textWidthClass =
    density === "sidebar"
      ? "w-[88px] sm:w-[96px]"
      : density === "topbarMobile"
        ? "w-[72px] md:w-[76px]"
        : density === "authMarketing"
          ? "w-[100px] lg:w-[128px]"
          : density === "authMobileLogin"
            ? "w-[120px]"
            : "w-[100px]"

  const iconMark = (
    <span className={iconShellClass}>
      <Image
        src="/logo-icon-only.webp"
        alt=""
        width={42}
        height={31}
        className={iconInnerClass}
        priority={density.startsWith("auth")}
      />
    </span>
  )

  const wordmark = (
    <Image
      src="/logo-text.png"
      alt="Visible"
      width={735}
      height={201}
      className={`${wordmarkClass} ${textWidthClass}`}
      priority={density.startsWith("auth")}
    />
  )

  if (layout === "stacked") {
    const gapClass =
      density === "authMobileLogin"
        ? "gap-3"
        : density === "authMobileRegister"
          ? "gap-2"
          : "gap-4"
    return (
      <div
        className={`flex flex-col items-center ${gapClass} ${className}`}
      >
        {iconMark}
        {wordmark}
      </div>
    )
  }

  const inlineGap =
    density === "authMarketing"
      ? "items-center md:gap-3 lg:gap-4"
      : "items-center gap-2.5"

  return (
    <div className={`flex min-w-0 ${inlineGap} ${className}`}>
      {iconMark}
      <span className="flex min-w-0 shrink">{wordmark}</span>
    </div>
  )
}
