import type { ReactNode } from "react"

export interface AssessmentCardProps {
  title: string
  description?: string
  badges?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  className?: string
}

export function AssessmentCard({
  title,
  description,
  badges,
  footer,
  children,
  className = "",
}: AssessmentCardProps) {
  return (
    <article
      data-testid="assessment-card"
      className={`glass-card flex flex-col gap-3 rounded-2xl p-5 font-sans ${className}`}
    >
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-foreground">
            {title}
          </h3>
          {badges ? (
            <div className="flex flex-wrap items-center gap-2">{badges}</div>
          ) : null}
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      {children}
      {footer ? (
        <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {footer}
        </footer>
      ) : null}
    </article>
  )
}
