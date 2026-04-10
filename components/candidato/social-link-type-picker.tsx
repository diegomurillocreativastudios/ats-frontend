"use client"

import { useEffect, useId, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import {
  SOCIAL_LINK_PRESET_OTHER_ID,
  SOCIAL_LINK_PRESETS,
  getPlatformLabelForPresetId,
  getPresetById,
  inferPresetIdFromStoredPlatform,
} from "@/lib/social-link-presets"

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

const labelClass = "font-inter text-xs font-medium text-muted-foreground md:text-sm"

export interface SocialLinkTypePickerProps {
  id: string
  platformValue: string
  onPlatformChange: (nextPlatform: string) => void
  disabled: boolean
  label?: string
  required?: boolean
  emptyTriggerLabel?: string
}

export function SocialLinkTypePicker({
  id,
  platformValue,
  onPlatformChange,
  disabled,
  label = "Tipo de enlace",
  required,
  emptyTriggerLabel = "Seleccionar tipo de enlace",
}: SocialLinkTypePickerProps) {
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const inferredId = inferPresetIdFromStoredPlatform(platformValue)
  const [otherExplicit, setOtherExplicit] = useState(
    () => inferredId === SOCIAL_LINK_PRESET_OTHER_ID
  )

  useEffect(() => {
    setOtherExplicit(inferPresetIdFromStoredPlatform(platformValue) === SOCIAL_LINK_PRESET_OTHER_ID)
  }, [platformValue])

  const effectivePresetId = (() => {
    if (otherExplicit && platformValue.trim() === "") return SOCIAL_LINK_PRESET_OTHER_ID
    return inferredId
  })()

  const showOtherNameField =
    effectivePresetId === SOCIAL_LINK_PRESET_OTHER_ID ||
    (otherExplicit && platformValue.trim() === "")

  const handleClose = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const el = containerRef.current
      if (!el) return
      const target = e.target
      if (target instanceof Node && !el.contains(target)) handleClose()
    }
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
    }
  }, [open])

  const handleToggleOpen = () => {
    if (disabled) return
    setOpen((o) => !o)
  }

  const handleSelectPreset = (nextId: string) => {
    if (nextId === SOCIAL_LINK_PRESET_OTHER_ID) {
      setOtherExplicit(true)
      onPlatformChange("")
      setOpen(false)
      return
    }
    setOtherExplicit(false)
    onPlatformChange(getPlatformLabelForPresetId(nextId))
    setOpen(false)
  }

  const selectedPreset = effectivePresetId ? getPresetById(effectivePresetId) : undefined

  const triggerLabel = (() => {
    if (!effectivePresetId) return emptyTriggerLabel
    if (effectivePresetId === SOCIAL_LINK_PRESET_OTHER_ID) {
      const t = platformValue.trim()
      if (!t) return "Otro — indicá el nombre"
      return t.length > 40 ? `${t.slice(0, 38)}…` : t
    }
    return selectedPreset?.label ?? platformValue
  })()

  const SelectedIcon = selectedPreset?.Icon

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <span className={labelClass} id={`${id}-label`}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-labelledby={`${id}-label`}
        onClick={handleToggleOpen}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault()
            handleClose()
            return
          }
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleToggleOpen()
          }
        }}
        className={`${inputClass} flex items-center justify-between gap-2 text-left`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {SelectedIcon ? (
            <SelectedIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : null}
          <span
            className={
              !effectivePresetId ||
              (effectivePresetId === SOCIAL_LINK_PRESET_OTHER_ID && !platformValue.trim())
                ? "text-muted-foreground"
                : "text-foreground"
            }
          >
            {triggerLabel}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-auto rounded-xl border border-border bg-background py-1 shadow-lg"
        >
          {SOCIAL_LINK_PRESETS.map((p) => {
            const Icon = p.Icon
            const isSelected = effectivePresetId === p.id
            return (
              <li key={p.id} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left font-inter text-sm transition-colors hover:bg-muted focus:outline-none focus-visible:bg-muted ${
                    isSelected ? "bg-vo-purple/10 text-vo-purple" : "text-foreground"
                  }`}
                  onClick={() => handleSelectPreset(p.id)}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isSelected ? "text-vo-purple" : "text-muted-foreground"}`}
                    aria-hidden
                  />
                  {p.label}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {showOtherNameField ? (
        <div className="mt-1 flex flex-col gap-1.5">
          <label htmlFor={`${id}-other`} className={labelClass}>
            Nombre de la plataforma
            {required ? <span className="text-destructive"> *</span> : null}
          </label>
          <input
            id={`${id}-other`}
            type="text"
            value={
              effectivePresetId === SOCIAL_LINK_PRESET_OTHER_ID ? platformValue : ""
            }
            onChange={(e) => onPlatformChange(e.target.value)}
            disabled={disabled}
            placeholder="Ej. Portfolio, Behance…"
            className={inputClass}
          />
        </div>
      ) : null}
    </div>
  )
}
