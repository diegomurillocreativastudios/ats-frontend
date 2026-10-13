import type { ReactNode } from "react"

export interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className={`glass-card flex flex-col items-start gap-3 rounded-2xl p-6 font-sans ${className}`}
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
