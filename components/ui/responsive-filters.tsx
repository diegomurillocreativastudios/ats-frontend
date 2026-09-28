"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ListFilter } from "lucide-react"
import { useTranslations } from "next-intl"
import { useIsBelowLg } from "@/hooks/use-is-below-lg"
import Modal from "@/components/ui/Modal"

const TOGGLE_CLASS =
  "flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"

const CLOSE_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"

export interface ResponsiveFiltersProps {
  children: ReactNode
  toggleLabel: string
  title: string
  regionLabel: string
  hasActiveFilters?: boolean
  disabled?: boolean
  desktopClassName?: string
  desktopAs?: "div" | "fieldset"
}

/**
 * En viewports `lg` y mayores muestra los filtros en línea.
 * Por debajo de 1024px abre los mismos campos en un modal.
 */
export function ResponsiveFilters({
  children,
  toggleLabel,
  title,
  regionLabel,
  hasActiveFilters = false,
  disabled = false,
  desktopClassName,
  desktopAs = "div",
}: ResponsiveFiltersProps) {
  const tCommon = useTranslations("Common")
  const isBelowLg = useIsBelowLg()
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  useEffect(() => {
    if (!isBelowLg) setIsFiltersOpen(false)
  }, [isBelowLg])

  const handleOpenFilters = () => {
    setIsFiltersOpen(true)
  }

  const handleCloseFilters = () => {
    setIsFiltersOpen(false)
  }

  if (!isBelowLg) {
    if (desktopAs === "fieldset") {
      return (
        <fieldset
          disabled={disabled}
          className={desktopClassName}
          aria-label={regionLabel}
        >
          {children}
        </fieldset>
      )
    }

    return (
      <div className={desktopClassName} aria-label={regionLabel}>
        {children}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col">
      <button
        type="button"
        onClick={handleOpenFilters}
        aria-haspopup="dialog"
        aria-expanded={isFiltersOpen}
        className={TOGGLE_CLASS}
      >
        <ListFilter className="h-4 w-4" aria-hidden />
        {toggleLabel}
        {hasActiveFilters ? (
          <span className="h-2 w-2 rounded-full bg-vo-purple" aria-hidden />
        ) : null}
      </button>

      <Modal
        isOpen={isFiltersOpen}
        onClose={handleCloseFilters}
        title={title}
        size="lg"
        footer={
          <button
            type="button"
            onClick={handleCloseFilters}
            className={CLOSE_BUTTON_CLASS}
          >
            {tCommon("close")}
          </button>
        }
      >
        <fieldset disabled={disabled} className="min-w-0 border-0 p-0">
          <legend className="sr-only">{title}</legend>
          {children}
        </fieldset>
      </Modal>
    </div>
  )
}
