"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { technicalSheetMessages as m } from "@/lib/messages/technical-sheet"
import {
  downloadTechnicalSheetPdfFromNextRoute,
  fetchTechnicalSheetJson,
  slugifyVacancyForFilename,
  type TechnicalSheetPayload,
} from "@/lib/api/technical-sheet"
import {
  TechnicalSheetPreview,
} from "@/components/rrhh/technical-sheet/technical-sheet-preview"
import { getTechnicalSheetCandidateHeaderFacts } from "@/lib/technical-sheet/candidate-from-payload"

export interface TechnicalSheetPanelProps {
  enabled: boolean
  vacancyId: string
  candidateProfileId: string
  vacancyTitle?: string | null
  candidateLabel?: string | null
  /** When set, panel is styled for in-app page (no max-height constraint from modal). */
  variant?: "modal" | "page"
  className?: string
  headerEnd?: ReactNode
  footerEnd?: ReactNode
}

export function TechnicalSheetPanel({
  enabled,
  vacancyId,
  candidateProfileId,
  vacancyTitle,
  candidateLabel,
  variant = "modal",
  className = "",
  headerEnd = null,
  footerEnd = null,
}: TechnicalSheetPanelProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const [payload, setPayload] = useState<TechnicalSheetPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [pdfHint, setPdfHint] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!vacancyId || !candidateProfileId) return
    setLoading(true)
    setError(null)
    setPdfHint(null)
    setPayload(null)
    try {
      const data = await fetchTechnicalSheetJson(vacancyId, candidateProfileId)
      setPayload(data)
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? Number((err as { status?: number }).status)
          : 0
      if (status === 404) {
        setError(m.errorNotPosted)
      } else if (status === 403) {
        setError(m.errorForbidden)
      } else {
        const msg =
          typeof err === "object" && err !== null && "message" in err
            ? String((err as { message?: unknown }).message)
            : ""
        setError(msg.trim() || m.errorGeneric)
      }
    } finally {
      setLoading(false)
    }
  }, [vacancyId, candidateProfileId])

  useEffect(() => {
    if (!enabled) return
    load().catch(() => {})
  }, [enabled, load])

  useEffect(() => {
    if (!enabled || variant !== "modal" || !panelRef.current) return
    const el = panelRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    el?.focus()
  }, [enabled, variant, loading, error, payload])

  const baseFilename = `ficha-${slugifyVacancyForFilename(vacancyTitle ?? "vacante")}-${candidateProfileId}`

  const handleDownloadPdf = async () => {
    if (!vacancyId || !candidateProfileId || downloadingPdf) return
    setDownloadingPdf(true)
    setPdfHint(null)
    try {
      await downloadTechnicalSheetPdfFromNextRoute(
        vacancyId,
        candidateProfileId,
        `${baseFilename}.pdf`
      )
    } catch (err: unknown) {
      console.error("[technical-sheet-pdf]", err)
      const detail =
        err instanceof Error && err.message.trim() !== "" ? err.message.trim() : null
      setPdfHint(detail ?? m.pdfExportFailed)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const busy = loading || downloadingPdf

  const headerFacts = payload ? getTechnicalSheetCandidateHeaderFacts(payload) : null
  const showStructuredHeader = Boolean(payload && headerFacts)
  const showLegacyCandidateLine = Boolean(!showStructuredHeader && candidateLabel)

  const shell =
    variant === "page"
      ? `w-full max-w-4xl flex-col rounded-2xl border border-border bg-background text-foreground shadow-sm ${className}`
      : `relative flex max-h-[min(90vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl ring-1 ring-black/5 dark:ring-white/10 ${className}`

  return (
    <div
      ref={panelRef}
      className={`flex min-h-0 ${shell}`}
      role="region"
      aria-labelledby={titleId}
      aria-busy={busy || undefined}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border bg-gradient-to-br from-card via-card to-muted/20 px-5 py-4">
        <div className="min-w-0 flex-1 pr-2">
          <h2 id={titleId} className="font-sans text-xl font-semibold tracking-tight text-foreground">
            {m.modalTitle}
          </h2>
          {showStructuredHeader && headerFacts ? (
            <dl className="mt-2 space-y-1 font-sans text-sm leading-snug text-foreground">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-x-2">
                <dt className="shrink-0 font-medium text-muted-foreground">{m.headerName}:</dt>
                <dd className="min-w-0 wrap-break-word">{headerFacts.fullName || "—"}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-x-2">
                <dt className="shrink-0 font-medium text-muted-foreground">{m.headerAddress}:</dt>
                <dd className="min-w-0 wrap-break-word">{headerFacts.address || "—"}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-x-2">
                <dt className="shrink-0 font-medium text-muted-foreground">{m.headerEnglishLevel}:</dt>
                <dd className="min-w-0 wrap-break-word">{headerFacts.englishLevel || "—"}</dd>
              </div>
            </dl>
          ) : null}
          {showLegacyCandidateLine ? (
            <p className="mt-1.5 line-clamp-2 font-sans text-sm text-muted-foreground">{candidateLabel}</p>
          ) : null}
        </div>
        {headerEnd ? <div className="shrink-0">{headerEnd}</div> : null}
      </div>

      <div
        ref={previewScrollRef}
        className="min-h-0 flex-1 overflow-y-auto scroll-smooth bg-muted/15 px-5 py-5 md:px-6"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16" role="status">
            <Loader2 className="h-8 w-8 animate-spin text-vo-purple" aria-hidden />
            <p className="font-sans text-sm text-muted-foreground">{m.loading}</p>
          </div>
        ) : error ? (
          <p className="font-sans text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : payload ? (
          <div className="flex justify-center">
            <TechnicalSheetPreview payload={payload} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-card/80 px-5 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        {pdfHint ? (
          <p className="font-sans text-xs leading-snug text-muted-foreground" role="status">
            {pdfHint}
          </p>
        ) : (
          <span className="min-h-0" />
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={busy || !vacancyId || !candidateProfileId || !payload}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 font-sans text-sm font-medium shadow-sm transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={m.downloadPdf}
          >
            {downloadingPdf ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {downloadingPdf ? m.downloadingPdf : m.downloadPdf}
          </button>
          {footerEnd}
        </div>
      </div>
    </div>
  )
}
