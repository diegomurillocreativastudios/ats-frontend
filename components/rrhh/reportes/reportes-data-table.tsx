import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import ReportesEmptyState from "@/components/rrhh/reportes/reportes-empty-state"

export interface ReportesDataColumn<T> {
  header: string
  render: (row: T) => ReactNode
  /** Alineación tipo numérico (derecha). */
  numeric?: boolean
}

interface ReportesDataTableProps<T> {
  columns: readonly ReportesDataColumn<T>[]
  rows: T[]
  loading: boolean
  error: string | null
  tableAriaLabel: string
  emptyDescription?: string
  getRowKey: (row: T, index: number) => string
  /** Si es false y hay error, no se renderiza el bloque de error (p. ej. el padre ya lo mostró). */
  showEmbeddedError?: boolean
  onRetry?: () => void
  /** Clases Tailwind extra para cada fila del cuerpo (p. ej. hover). */
  bodyRowClassName?: string
}

export default function ReportesDataTable<T>({
  columns,
  rows,
  loading,
  error,
  tableAriaLabel,
  emptyDescription,
  getRowKey,
  showEmbeddedError = true,
  onRetry,
  bodyRowClassName = "",
}: ReportesDataTableProps<T>) {
  if (error && showEmbeddedError) {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-8 text-center"
        role="alert"
      >
        <p className="font-sans text-sm text-destructive">{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-md bg-vo-purple px-4 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
          >
            Reintentar
          </button>
        ) : null}
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-8 w-8 animate-spin text-vo-purple" aria-hidden />
        <p className="font-sans text-sm text-muted-foreground">Cargando datos…</p>
      </div>
    )
  }

  const colCount = columns.length

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table
        className="w-full min-w-[640px] border-collapse text-left"
        aria-label={tableAriaLabel}
      >
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {columns.map((col) => (
              <th
                key={col.header}
                scope="col"
                className={`px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground ${col.numeric ? "text-right" : ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-14" colSpan={colCount}>
                <ReportesEmptyState
                  showBackLink={false}
                  description={
                    emptyDescription ??
                    "No hay filas para los filtros seleccionados. Probá ampliar fechas o relajar criterios."
                  }
                />
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={getRowKey(row, rowIndex)}
                className={[
                  "border-b border-border transition-colors last:border-b-0",
                  bodyRowClassName,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {columns.map((col) => (
                  <td
                    key={col.header}
                    className={`px-4 py-3 align-middle font-sans text-sm text-foreground ${col.numeric ? "text-right tabular-nums" : ""}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
