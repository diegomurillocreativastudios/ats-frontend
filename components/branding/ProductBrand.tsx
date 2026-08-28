import { ApplicanTreeLogo } from "@/components/branding/ApplicanTreeLogo"

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

function getLogoClassName(density: ProductBrandProps["density"]): string {
  if (density === "authMarketing") {
    return "h-auto w-56 max-w-full shrink-0 sm:w-64 md:w-72 lg:w-80"
  }
  if (density === "authMobileLogin") {
    return "h-auto w-56 max-w-full shrink-0"
  }
  if (density === "authMobileRegister") {
    return "h-auto w-52 max-w-full shrink-0"
  }
  if (density === "sidebar") {
    return "h-auto w-full max-h-[5.5rem] max-w-full object-left"
  }
  return "h-8 w-auto shrink-0"
}

/**
 * Marca producto (logo SVG con wordmark integrado) para auth, nav lateral y topbar.
 */
export default function ProductBrand({
  layout,
  tone,
  density,
  stackedIconVariant: _stackedIconVariant = "purple",
  className = "",
}: ProductBrandProps) {
  const isOnDark = tone === "onDark"
  const logoClassName = getLogoClassName(density)

  const logo = (
    <ApplicanTreeLogo
      variant={isOnDark ? "light" : "default"}
      className={`${logoClassName} object-contain`}
    />
  )

  if (layout === "stacked") {
    return (
      <div className={`flex shrink-0 flex-col items-center ${className}`}>
        {logo}
      </div>
    )
  }

  return (
    <div className={`flex shrink-0 items-center ${className}`}>
      {logo}
    </div>
  )
}
