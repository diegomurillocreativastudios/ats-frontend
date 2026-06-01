import ProductBrand from "@/components/branding/ProductBrand"

interface AuthBrandProps {
  size?: "large" | "medium" | "mobile-login" | "mobile-register"
  variant?:
    | "primary"
    | "secondary"
    | "light-primary"
    | "light-navy"
    | "light-secondary"
}

const variantToStackedIcon: Record<
  NonNullable<AuthBrandProps["variant"]>,
  "purple" | "navy" | "magenta"
> = {
  primary: "purple",
  secondary: "purple",
  "light-primary": "purple",
  "light-navy": "navy",
  "light-secondary": "magenta",
}

export default function AuthBrand({
  size = "large",
  variant = "primary",
}: AuthBrandProps) {
  const density =
    size === "mobile-register" ? "authMobileRegister" : "authMobileLogin"
  const stackedIconVariant = variantToStackedIcon[variant] ?? "purple"

  return (
    <ProductBrand
      layout="stacked"
      tone="onLight"
      density={density}
      stackedIconVariant={stackedIconVariant}
    />
  )
}
