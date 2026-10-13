import type { ReactNode } from "react"

export interface ErrorStateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function ErrorState({
  title,
  description,
  action,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      data-testid="error-state"
      className={`glass-card flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 p-6 font-sans ${className}`}
    >
      <h3 className="font-display text-lg font-semibold text-foreground">
        {title}
      </h3>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action}
    </div>
  )
}
