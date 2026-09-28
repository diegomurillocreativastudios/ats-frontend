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
  className = "",
}: VacancyPublicationSwitchProps) {
  const baseId = useId()
  const labelId = `${baseId}-label`
  const descriptionId = `${baseId}-description`
  const hint = disabled && disabledReason ? disabledReason : description
  const isInert = disabled || isBusy

  const handleClick = () => {
    if (isInert) return
    onCheckedChange(!checked)
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
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-vo-purple" : "border border-input bg-muted"
        }`}
      >
        <span
          aria-hidden
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
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
