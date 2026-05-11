import type { ReactNode } from "react"

interface ReportesFiltersPlaceholderProps {
  children: ReactNode
  /** Cuando es false, los controles envían filtros al API (reportes). */
  disabled?: boolean
}

/**
 * Contenedor de filtros de reportes (query params al backend).
 */
export default function ReportesFiltersPlaceholder({
  children,
  disabled = false,
}: ReportesFiltersPlaceholderProps) {
  return (
    <fieldset
      disabled={disabled}
      className="rounded-xl border border-border bg-muted/15 p-4 md:p-5"
      aria-describedby="reportes-filtros-ayuda"
    >
      <legend className="px-1 font-sans text-sm font-medium text-foreground">
        Filtros
      </legend>
      <p id="reportes-filtros-ayuda" className="mt-2 font-sans text-xs text-muted-foreground">
        Los valores se envían como query params al API de reportes.
      </p>
      <div className="mt-4 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        {children}
      </div>
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
