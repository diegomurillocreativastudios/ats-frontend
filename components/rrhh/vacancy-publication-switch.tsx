"use client"

import { useId } from "react"

export interface VacancyPublicationSwitchProps {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  label: string
  description?: string
  disabled?: boolean
  isBusy?: boolean
  disabledReason?: string
  /** `compact` fits a heading row: the whole pill is the hit area and the description is screen-reader only. */
  variant?: "default" | "compact"
  className?: string
}

/**
 * Accessible on/off control for vacancy publication on the public portal.
 */
export function VacancyPublicationSwitch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  isBusy = false,
  disabledReason,
  variant = "default",
  className = "",
}: VacancyPublicationSwitchProps) {
  const baseId = useId()
  const labelId = `${baseId}-label`
  const descriptionId = `${baseId}-description`
  const reasonId = `${baseId}-reason`
  const showReason = disabled && Boolean(disabledReason)
  const hint = showReason ? disabledReason : description
  const isInert = disabled || isBusy

  const handleClick = () => {
    if (isInert) return
    onCheckedChange(!checked)
  }

  if (variant === "compact") {
    return (
      <div className={`inline-flex min-w-0 flex-col gap-1 ${className}`}>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={labelId}
          aria-describedby={showReason ? reasonId : description ? descriptionId : undefined}
          aria-busy={isBusy || undefined}
          disabled={isInert}
          onClick={handleClick}
          className="group inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-2 transition-colors duration-200 motion-reduce:transition-none hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
        >
          <SwitchTrack checked={checked} />
          <span id={labelId} className="font-sans text-sm font-medium text-foreground">
            {label}
          </span>
        </button>
        {description && !showReason ? (
          <span id={descriptionId} className="sr-only">
            {description}
          </span>
        ) : null}
        {showReason ? (
          <span id={reasonId} className="max-w-xs px-2 font-sans text-xs text-muted-foreground">
            {disabledReason}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={hint ? descriptionId : undefined}
        aria-busy={isBusy || undefined}
        disabled={isInert}
        onClick={handleClick}
        className="relative mt-0.5 inline-flex shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SwitchTrack checked={checked} />
      </button>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={labelId} className="font-sans text-sm font-medium text-foreground">
          {label}
        </span>
        {hint ? (
          <span id={descriptionId} className="font-sans text-xs text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function SwitchTrack({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 motion-reduce:transition-none ${
        checked ? "bg-vo-purple" : "border border-input bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </span>
  )
}
