"use client"

import { useCallback } from "react"
import { Download } from "lucide-react"
import { buildCsvFromMatrix, downloadCsvFile } from "@/lib/reportes-csv"
import { ReportesViewPdfButton } from "@/components/rrhh/reportes/reportes-view-pdf-button"

interface ReportesExportToolbarProps {
  reportSlug: string
  disabled?: boolean
  /** Primera fila = cabeceras; siguientes = valores ya como string */
  matrix: string[][]
}

export function ReportesExportToolbar({
  reportSlug,
  disabled = false,
  matrix,
}: ReportesExportToolbarProps) {
  const handleDownloadCsv = useCallback(() => {
    if (matrix.length === 0) return
    const csv = buildCsvFromMatrix(matrix)
    const safe = reportSlug.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "reporte"
    downloadCsvFile(`reporte-${safe}`, csv)
  }, [matrix, reportSlug])

  const canExport = matrix.length > 1 && !disabled
  const safeSlug = reportSlug.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "reporte"

  return (
    <div className="flex flex-wrap items-center gap-2" data-report-pdf-exclude>
      <ReportesViewPdfButton disabled={disabled} filenameBase={`reporte-${safeSlug}`} />
      <button
        type="button"
        onClick={handleDownloadCsv}
        disabled={!canExport}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:opacity-50"
        aria-label="Descargar tabla en CSV"
      >
        <Download className="h-4 w-4 shrink-0" aria-hidden />
        Exportar CSV
      </button>
      {!canExport ? (
        <span className="font-sans text-xs text-muted-foreground">
          No hay filas para exportar.
        </span>
      ) : null}
    </div>
  )
}
