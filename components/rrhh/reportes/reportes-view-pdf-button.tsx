"use client"

import { useCallback, useState } from "react"
import { FileDown, Loader2 } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api-error"
import { downloadReportViewAsPdf } from "@/lib/pdf/download-report-view-as-pdf"

export interface ReportesViewPdfButtonProps {
  disabled?: boolean
  /** Sin extensión; se sanitiza para el nombre del archivo descargado */
  filenameBase: string
  className?: string
}

const baseButtonClass =
  "inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

export function ReportesViewPdfButton({
  disabled = false,
  filenameBase,
  className = "",
}: ReportesViewPdfButtonProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = useCallback(async () => {
    if (disabled || busy) return
    setBusy(true)
    setError(null)
    try {
      await downloadReportViewAsPdf(filenameBase)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "No se pudo generar el PDF.")
    } finally {
      setBusy(false)
    }
  }, [busy, disabled, filenameBase])

  return (
    <div className="flex flex-col items-start gap-1" data-report-pdf-exclude>
      <button
        type="button"
        onClick={() => {
          void handleClick()
        }}
        disabled={disabled || busy}
        className={[baseButtonClass, className].filter(Boolean).join(" ")}
        aria-busy={busy || undefined}
        aria-label="Descargar PDF del reporte"
        title="Captura el reporte visible en pantalla y lo descarga como PDF en tu navegador."
      >
        {busy ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-vo-purple" aria-hidden />
        ) : (
          <FileDown className="h-4 w-4 shrink-0 text-vo-purple" aria-hidden />
        )}
        {busy ? "Generando PDF…" : "Descargar PDF"}
      </button>
      {error ? (
        <p className="max-w-xs font-sans text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
