import Link from "next/link"
import { Database } from "lucide-react"

interface ReportesEmptyStateProps {
  /** Texto breve bajo el título */
  description?: string
  showBackLink?: boolean
}

export default function ReportesEmptyState({
  description = "No hay resultados para mostrar con los filtros actuales.",
  showBackLink = true,
}: ReportesEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 text-center"
      role="status"
      aria-live="polite"
    >
      <Database
        className="h-10 w-10 text-muted-foreground"
        aria-hidden
      />
      <div className="max-w-md space-y-1">
        <p className="font-sans text-sm font-medium text-foreground">
          Sin datos por ahora
        </p>
        <p className="font-sans text-sm text-muted-foreground">{description}</p>
      </div>
      {showBackLink ? (
        <Link
          href="/portal-rrhh/reportes"
          className="mt-1 inline-flex items-center rounded-md border border-border bg-background px-4 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
        >
          Volver a reportes
        </Link>
      ) : null}
    </div>
  )
}
