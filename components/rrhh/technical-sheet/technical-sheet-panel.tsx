"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { FileDown, Loader2 } from "lucide-react"
import { technicalSheetMessages as m } from "@/lib/messages/technical-sheet"
import { fetchTechnicalSheetJson, slugifyVacancyForFilename } from "@/lib/api/technical-sheet"
import { downloadElementAsPdf } from "@/lib/pdf/download-element-as-pdf"
import { resolveTechnicalSheetPdfElement } from "@/lib/pdf/resolve-technical-sheet-pdf-element"
import { paginateTechnicalSheetArticleToPageBodies } from "@/lib/technical-sheet/paginate-technical-sheet-article-dom"
import {
  buildTechnicalSheetPageHtml,
  TECHNICAL_SHEET_MULTI_PAGE_STYLES,
} from "@/lib/technical-sheet/technical-sheet-page-shell"
import { TECHNICAL_SHEET_CONTENT_AVAILABLE_HEIGHT_PX } from "@/lib/technical-sheet/technical-sheet-page-constants"
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

interface SheetPreviewMeta {
  header: {
    fullName: string
    address: string
    englishLevel: string
  }
  logoUrl: string
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
  const [previewMeta, setPreviewMeta] = useState<SheetPreviewMeta | null>(null)
  const [paginatedSrcDoc, setPaginatedSrcDoc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfActionError, setPdfActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!vacancyId?.trim() || !candidateProfileId?.trim()) return
    setLoading(true)
    setError(null)
    setTemplateHtml(null)
    setPreviewMeta(null)
    setPaginatedSrcDoc(null)
    try {
      const [list, payload] = await Promise.all([
        fetchTemplatesList({ documentOnly: true }),
        fetchTechnicalSheetJson(vacancyId.trim(), candidateProfileId.trim()),
      ])
      const picked = findTechnicalSheetDocumentTemplate(list)
      const rawTemplate = picked?.contentTemplate?.trim() ?? ""
      if (!picked || rawTemplate === "") {
        setError(m.errorNoTechnicalSheetTemplate)
        return
      }
      const publicBase = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
      const windowOrigin =
        typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : ""
      const origin = publicBase || windowOrigin
      const logoUrl = origin ? `${origin}/visible-icon.png` : ""
      const ctx = buildTechnicalSheetTemplateContext(payload, {
        vacancyTitleFallback: vacancyTitle ?? null,
        logoUrl,
      })
      const headerRecord = ctx.header as Record<string, unknown> | undefined
      setPreviewMeta({
        header: {
          fullName: String(headerRecord?.fullName ?? ""),
          address: String(headerRecord?.address ?? ""),
          englishLevel: String(headerRecord?.englishLevel ?? ""),
        },
        logoUrl: String(ctx.logoUrl ?? ""),
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
    if (!templateHtml || !previewMeta) {
      setPaginatedSrcDoc(null)
      return
    }

    const iframe = document.createElement("iframe")
    iframe.sandbox = "allow-same-origin"
    iframe.setAttribute(
      "aria-hidden",
      "true"
    )
    iframe.style.cssText =
      "position:fixed;left:-9999px;top:0;width:816px;height:1200px;visibility:hidden;pointer-events:none;border:0;opacity:0"

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument
        const article = doc?.querySelector("article.ts-article") || doc?.querySelector("article")
        const bodies = paginateTechnicalSheetArticleToPageBodies(
          article ?? null,
          TECHNICAL_SHEET_CONTENT_AVAILABLE_HEIGHT_PX
        )
        const safeLogo = previewMeta.logoUrl.replace(/"/g, "")
        const pages = bodies.map((body) =>
          buildTechnicalSheetPageHtml({
            bodyHtml: body,
            header: previewMeta.header,
            logoUrl: safeLogo,
          })
        )
        const out = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>${TECHNICAL_SHEET_MULTI_PAGE_STYLES}</head><body><main class="technical-sheet-doc">${pages.join("")}</main></body></html>`
        setPaginatedSrcDoc(out)
      } finally {
        iframe.remove()
      }
    }

    iframe.addEventListener("load", handleLoad, { once: true })
    iframe.srcdoc = templateHtml
    document.body.appendChild(iframe)

    return () => {
      iframe.removeEventListener("load", handleLoad)
      iframe.remove()
    }
  }, [templateHtml, previewMeta])

  useEffect(() => {
    if (!enabled || variant !== "modal" || !panelRef.current) return
    const el = panelRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    el?.focus()
  }, [enabled, variant, loading, error, paginatedSrcDoc])

  const handleDownloadPdf = useCallback(async () => {
    if (!templateHtml || !panelRef.current) return
    const captureTarget = resolveTechnicalSheetPdfElement(panelRef.current)
    if (!captureTarget) {
      setPdfActionError(m.pdfExportFailed)
      return
    }
    setPdfActionError(null)
    setPdfBusy(true)
    try {
      const slug = slugifyVacancyForFilename(vacancyTitle ?? "vacante")
      const cid = candidateProfileId?.trim() ?? ""
      const name = `ficha-tecnica-${slug}-${cid.slice(0, 8)}.pdf`
      await downloadElementAsPdf({
        element: captureTarget,
        fileName: name,
        orientation: "portrait",
        format: "a4",
        scale: 2,
        marginMm: 0,
      })
    } catch {
      setPdfActionError(m.pdfExportFailed)
    } finally {
      setPdfBusy(false)
    }
  }, [templateHtml, vacancyTitle, candidateProfileId])

  const busy = loading
  const iframeDoc = paginatedSrcDoc ?? templateHtml

  const shell =
    variant === "page"
      ? `w-full max-w-4xl flex-col rounded-2xl border border-border bg-background text-foreground shadow-sm ${className}`
      : `relative flex h-[90vh] w-[90vw] max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl ring-1 ring-black/5 ${className}`

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
      <div className="flex flex-col border-b border-border bg-linear-to-br from-card via-card to-muted/20">
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0 flex-1 pr-2">
            <h2 id={titleId} className="font-sans text-xl font-semibold tracking-tight text-foreground">
              {m.modalTitle}
            </h2>
            {candidateLine ? (
              <p className="mt-1.5 line-clamp-2 font-sans text-sm text-muted-foreground">{candidateLine}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {templateHtml && !loading ? (
              <button
                type="button"
                onClick={() => {
                  void handleDownloadPdf()
                }}
                disabled={pdfBusy}
                data-html2canvas-ignore="true"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-sans text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                aria-busy={pdfBusy || undefined}
              >
                {pdfBusy ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-vo-purple" aria-hidden />
                ) : (
                  <FileDown className="h-4 w-4 shrink-0 text-vo-purple" aria-hidden />
                )}
                {pdfBusy ? m.downloadingPdf : m.downloadPdf}
              </button>
            ) : null}
            {headerEnd ? <div className="shrink-0">{headerEnd}</div> : null}
          </div>
        </div>
        {pdfActionError ? (
          <p className="px-5 pb-3 font-sans text-sm text-destructive" role="alert">
            {pdfActionError}
          </p>
        ) : null}
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
        ) : iframeDoc ? (
          <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-6">
            <div className="flex min-h-0 w-full max-w-[816px] flex-1 flex-col overflow-hidden rounded-lg border border-border bg-transparent">
              <iframe
                title={m.modalTitle}
                sandbox="allow-same-origin"
                srcDoc={iframeDoc}
                className="min-h-0 w-full flex-1 border-0 bg-transparent"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
