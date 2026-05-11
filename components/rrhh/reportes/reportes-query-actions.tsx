"use client"

import type { ReactNode } from "react"

interface ReportesQueryActionsProps {
  statusText: string
  loading: boolean
  onApply: () => void
  applyLabel?: string
  extra?: ReactNode
}

export function ReportesQueryActions({
  statusText,
  loading,
  onApply,
  applyLabel = "Aplicar filtros",
  extra = null,
}: ReportesQueryActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="font-sans text-xs text-muted-foreground" aria-live="polite">
        {statusText}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        <button
          type="button"
          onClick={onApply}
          className="inline-flex items-center justify-center rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:opacity-60"
          disabled={loading}
        >
          {applyLabel}
        </button>
      </div>
    </div>
  )
}
