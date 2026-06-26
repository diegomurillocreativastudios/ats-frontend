"use client"

import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  fullHeight?: boolean
  className?: string
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
} as const

export function LoadingSpinner({
  size = "md",
  fullHeight = false,
  className = "",
}: LoadingSpinnerProps) {
  const t = useTranslations("Common")

  return (
    <div
      className={
        fullHeight
          ? `flex h-screen items-center justify-center ${className}`.trim()
          : `inline-flex items-center justify-center ${className}`.trim()
      }
      role="status"
      aria-label={t("loading")}
    >
      <Loader2
        className={`${sizeClasses[size]} animate-spin text-vo-purple`}
        aria-hidden
      />
    </div>
  )
}
