"use client"

import { useId, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { ResponsiveFilters } from "@/components/ui/responsive-filters"

interface ReportesFiltersPlaceholderProps {
  children: ReactNode
  /** Cuando es false, los controles envían filtros al API (reportes). */
  disabled?: boolean
  /** Texto de la leyenda del fieldset (visible arriba del bloque). */
  legendLabel?: string
  /** Clases del fieldset (fondo, borde, radio). */
  surfaceClassName?: string
  /** Si se define, sustituye el texto de ayuda bajo la leyenda. */
  hintText?: string
  /** Clases Tailwind del contenedor de los controles (layout). */
  controlsClassName?: string
  /** Muestra el indicador del botón cuando hay filtros aplicados. */
  hasActiveFilters?: boolean
}

/**
 * Contenedor de filtros de reportes (query params al backend).
 * En desktop van en línea; bajo 1024px se abren en un modal.
 */
export default function ReportesFiltersPlaceholder({
  children,
  disabled = false,
  legendLabel,
  surfaceClassName = "rounded-xl border border-border/80 bg-muted/10 p-3 shadow-sm md:p-4",
  hintText,
  controlsClassName = "mt-3 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end",
  hasActiveFilters = false,
}: ReportesFiltersPlaceholderProps) {
  const t = useTranslations("RecruiterPortal.reports")
  const helpId = useId()
  const resolvedLegend = legendLabel ?? t("filters.legend")
  const defaultHint = t("filters.hint")

  return (
    <div className="w-full" data-report-pdf-exclude>
      <ResponsiveFilters
        toggleLabel={t("filters.toggle")}
        title={resolvedLegend}
        regionLabel={t("filters.regionLabel")}
        hasActiveFilters={hasActiveFilters}
        disabled={disabled}
        desktopAs="fieldset"
        desktopClassName={surfaceClassName}
      >
        <p
          id={helpId}
          className="font-sans text-xs leading-relaxed text-muted-foreground"
        >
          {hintText ?? defaultHint}
        </p>
        <div className={controlsClassName}>{children}</div>
      </ResponsiveFilters>
    </div>
  )
}

export function ReportesFilterControl({
  label,
  controlId,
  children,
}: {
  label: string
  controlId: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
      <label
        htmlFor={controlId}
        className="font-sans text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

export function hasActiveReportFilterValues(
  filters: Record<string, unknown>
): boolean {
  return Object.values(filters).some((value) => String(value ?? "").trim() !== "")
}
