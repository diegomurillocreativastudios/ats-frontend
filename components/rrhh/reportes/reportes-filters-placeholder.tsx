import type { ReactNode } from "react"

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
}

/**
 * Contenedor de filtros de reportes (query params al backend).
 */
export default function ReportesFiltersPlaceholder({
  children,
  disabled = false,
  legendLabel = "Filtros",
  surfaceClassName = "rounded-xl border border-border/80 bg-muted/10 p-4 shadow-sm md:p-5",
  hintText,
  controlsClassName = "mt-4 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end",
}: ReportesFiltersPlaceholderProps) {
  const helpId = "reportes-filtros-ayuda"
  const defaultHint =
    "Los valores se envían como query params al API de reportes."

  return (
    <fieldset
      disabled={disabled}
      className={surfaceClassName}
      aria-describedby={helpId}
    >
      <legend className="px-1 font-sans text-sm font-semibold text-foreground">
        {legendLabel}
      </legend>
      <p id={helpId} className="mt-1.5 font-sans text-xs leading-relaxed text-muted-foreground">
        {hintText ?? defaultHint}
      </p>
      <div className={controlsClassName}>{children}</div>
    </fieldset>
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
