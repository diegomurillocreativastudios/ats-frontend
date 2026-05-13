"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { technicalSheetMessages as m } from "@/lib/messages/technical-sheet"
import { fetchTechnicalSheetJson } from "@/lib/api/technical-sheet"
import {
  buildTechnicalSheetTemplateContext,
  renderTechnicalSheetHtml,
} from "@/lib/technical-sheet/template-interpolate"
import {
  fetchTemplatesList,
  findTechnicalSheetDocumentTemplate,
} from "@/lib/templates/technical-sheet-template"

export interface TechnicalSheetPanelProps {
  enabled: boolean
  vacancyId: string
  candidateProfileId: string
  vacancyTitle?: string | null
  candidateLabel?: string | null
  variant?: "modal" | "page"
  className?: string
  headerEnd?: ReactNode
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
}: TechnicalSheetPanelProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const [templateHtml, setTemplateHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!vacancyId?.trim() || !candidateProfileId?.trim()) return
    setLoading(true)
    setError(null)
    setTemplateHtml(null)
    try {
      const [list, payload] = await Promise.all([
        fetchTemplatesList(),
        fetchTechnicalSheetJson(vacancyId.trim(), candidateProfileId.trim()),
      ])
      const picked = findTechnicalSheetDocumentTemplate(list)
      const rawTemplate = picked?.contentTemplate?.trim() ?? ""
      if (!picked || rawTemplate === "") {
        setError(m.errorNoTechnicalSheetTemplate)
        return
      }
      const origin =
        typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : ""
      const logoUrl = origin ? `${origin}/visible-icon.png` : ""
      const ctx = buildTechnicalSheetTemplateContext(payload, {
        vacancyTitleFallback: vacancyTitle ?? null,
        logoUrl,
      })
      setTemplateHtml(renderTechnicalSheetHtml(rawTemplate, ctx))
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
  }, [vacancyId, candidateProfileId, vacancyTitle])

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
  }, [enabled, variant, loading, error, templateHtml])

  const busy = loading

  const shell =
    variant === "page"
      ? `w-full max-w-4xl flex-col rounded-2xl border border-border bg-background text-foreground shadow-sm ${className}`
      : `relative flex h-[90vh] w-[90vw] max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl ring-1 ring-black/5 dark:ring-white/10 ${className}`

  const candidateLine =
    candidateLabel != null && String(candidateLabel).trim() !== ""
      ? String(candidateLabel).trim()
      : null

  return (
    <div
      ref={panelRef}
      className={`flex min-h-0 ${shell}`}
      role="region"
      aria-labelledby={titleId}
      aria-busy={busy || undefined}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border bg-linear-to-br from-card via-card to-muted/20 px-5 py-4">
        <div className="min-w-0 flex-1 pr-2">
          <h2 id={titleId} className="font-sans text-xl font-semibold tracking-tight text-foreground">
            {m.modalTitle}
          </h2>
          {candidateLine ? (
            <p className="mt-1.5 line-clamp-2 font-sans text-sm text-muted-foreground">{candidateLine}</p>
          ) : null}
        </div>
        {headerEnd ? <div className="shrink-0">{headerEnd}</div> : null}
      </div>

      <div
        ref={previewScrollRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-smooth bg-muted/15 px-5 py-5 md:px-6"
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
        ) : templateHtml ? (
          <div className="flex min-h-0 w-full flex-1 flex-col">
            <iframe
              title={m.modalTitle}
              sandbox=""
              srcDoc={templateHtml}
              className="min-h-0 w-full flex-1 rounded-lg border border-border bg-white"
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
