"use client"

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"
import type { VacancyDataProtectionLaw } from "@/lib/vacancies/vacancy-data-protection-laws"
import { normalizeDataProtectionLawIds } from "@/lib/vacancies/data-protection-law-suggestion"

export interface VacancyDataProtectionLawsFieldProps {
  laws: VacancyDataProtectionLaw[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  legend: string
  helper: string
  placeholder: string
  emptyLabel: string
  inactiveLabel: string
  loadingLabel: string
  loadErrorLabel: string
  loading?: boolean
  loadError?: string | null
  error?: string
  errorId: string
  disabled?: boolean
}

function lawTitle(law: VacancyDataProtectionLaw): string {
  return law.displayName || law.code
}

function getPanelStyle(anchor: HTMLElement | null): CSSProperties {
  if (!anchor) return { display: "none" }
  const rect = anchor.getBoundingClientRect()
  const width = Math.min(rect.width, window.innerWidth - 16)
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)
  const spaceBelow = window.innerHeight - rect.bottom
  const openUp = spaceBelow < 220 && rect.top > spaceBelow

  if (openUp) {
    return {
      left,
      width,
      bottom: window.innerHeight - rect.top + 6,
    }
  }

  return {
    left,
    width,
    top: rect.bottom + 6,
  }
}

/**
 * Multi-select of data-protection laws, opened from a dropdown of checkboxes.
 * Inactive laws stay visible only while they remain selected.
 * The menu is portaled so modal overflow does not clip it.
 */
export function VacancyDataProtectionLawsField({
  laws,
  selectedIds,
  onChange,
  legend,
  helper,
  placeholder,
  emptyLabel,
  inactiveLabel,
  loadingLabel,
  loadErrorLabel,
  loading = false,
  loadError = null,
  error,
  errorId,
  disabled = false,
}: VacancyDataProtectionLawsFieldProps) {
  const legendId = useId()
  const helperId = useId()
  const listId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({ display: "none" })

  const selected = new Set(normalizeDataProtectionLawIds(selectedIds))
  const visibleLaws = laws.filter((law) => law.isActive || selected.has(law.id))
  const selectedLaws = visibleLaws.filter((law) => selected.has(law.id))
  const showTrigger = !loading && !loadError && visibleLaws.length > 0
  const canOpen = showTrigger && !disabled

  const handleToggle = (lawId: string, checked: boolean) => {
    const next = new Set(selected)
    if (checked) next.add(lawId)
    else next.delete(lawId)
    onChange(normalizeDataProtectionLawIds([...next]))
  }

  useLayoutEffect(() => {
    if (!open) return
    const updatePanelPosition = () => setPanelStyle(getPanelStyle(triggerRef.current))
    updatePanelPosition()
    window.addEventListener("resize", updatePanelPosition)
    window.addEventListener("scroll", updatePanelPosition, true)
    return () => {
      window.removeEventListener("resize", updatePanelPosition)
      window.removeEventListener("scroll", updatePanelPosition, true)
    }
  }, [open, visibleLaws.length])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector("input:not(:disabled)")
      if (first instanceof HTMLElement) first.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!canOpen) setOpen(false)
  }, [canOpen])

  const handleClose = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? errorId : undefined}>
      <legend id={legendId} className="font-sans text-sm font-medium text-foreground">
        {legend} <span className="text-vo-pink">*</span>
      </legend>
      <p id={helperId} className="font-sans text-xs leading-relaxed text-muted-foreground">
        {helper}
      </p>
      {loading ? <p className="font-sans text-sm text-muted-foreground">{loadingLabel}</p> : null}
      {loadError ? (
        <p className="font-sans text-sm text-amber-800" role="status">
          {loadError || loadErrorLabel}
        </p>
      ) : null}
      {!loading && !loadError && visibleLaws.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground">{emptyLabel}</p>
      ) : null}
      {showTrigger ? (
        <button
          ref={triggerRef}
          type="button"
          disabled={!canOpen}
          aria-labelledby={legendId}
          aria-describedby={error ? `${helperId} ${errorId}` : helperId}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={error ? true : undefined}
          onClick={() => {
            if (!canOpen) return
            setOpen((current) => !current)
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) {
              event.preventDefault()
              event.stopPropagation()
              handleClose()
              return
            }
            if (event.key === "ArrowDown" && !open) {
              event.preventDefault()
              setOpen(true)
            }
          }}
          className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-1.5 text-left font-sans text-sm text-foreground transition-colors focus:outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-50 ${
            open
              ? "border-vo-purple ring-2 ring-vo-purple/30"
              : "border-input hover:border-vo-purple/50"
          }`}
        >
          {selectedLaws.length === 0 ? (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          ) : (
            <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {selectedLaws.map((law) => (
                <span
                  key={law.id}
                  className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-vo-purple/25 bg-vo-purple/10 px-2 py-0.5 text-xs font-medium text-foreground"
                >
                  {law.jurisdictionCode ? (
                    <span className="shrink-0 rounded bg-background px-1 py-px text-[10px] font-semibold tracking-wide text-muted-foreground">
                      {law.jurisdictionCode}
                    </span>
                  ) : null}
                  <span className="truncate">{lawTitle(law)}</span>
                  {!law.isActive ? (
                    <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                      {inactiveLabel}
                    </span>
                  ) : null}
                </span>
              ))}
            </span>
          )}
          <ChevronDown
            aria-hidden
            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </button>
      ) : null}
      {open && canOpen
        ? createPortal(
            <div
              ref={panelRef}
              id={listId}
              role="group"
              aria-labelledby={legendId}
              style={panelStyle}
              className="fixed z-[250] max-h-60 overflow-y-auto overscroll-y-contain rounded-lg border border-border bg-background py-1 shadow-lg"
              onKeyDown={(event) => {
                if (event.key !== "Escape") return
                event.preventDefault()
                event.stopPropagation()
                handleClose()
              }}
            >
              {visibleLaws.map((law) => {
                const checked = selected.has(law.id)
                const inputId = `${listId}-${law.id}`
                const lockedInactive = !law.isActive && !checked
                return (
                  <label
                    key={law.id}
                    htmlFor={inputId}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 font-sans text-sm text-foreground transition-colors hover:bg-muted/80 ${
                      checked ? "bg-vo-purple/10" : ""
                    } ${lockedInactive ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      className="size-4 shrink-0 rounded border-input accent-vo-purple focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                      checked={checked}
                      disabled={lockedInactive}
                      onChange={(event) => handleToggle(law.id, event.target.checked)}
                    />
                    <span className="min-w-0 flex-1 leading-snug">
                      <span className="block">{lawTitle(law)}</span>
                      {law.jurisdictionCode || !law.isActive ? (
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          {law.jurisdictionCode ? (
                            <span className="rounded bg-muted px-1.5 py-px text-[10px] font-semibold tracking-wide">
                              {law.jurisdictionCode}
                            </span>
                          ) : null}
                          {!law.isActive ? <span>{inactiveLabel}</span> : null}
                        </span>
                      ) : null}
                    </span>
                  </label>
                )
              })}
            </div>,
            document.body,
          )
        : null}
      {error ? (
        <p id={errorId} className="font-sans text-sm text-vo-pink" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
