import Link from "next/link"
import { BarChart3, FileWarning, type LucideIcon } from "lucide-react"

export interface ReportHubCatalogCardProps {
  title: string
  description: string
  icon: LucideIcon
  href?: string
  badge?: string
  unlinkedHint?: string
}

const baseCardClasses =
  "flex flex-col gap-3 rounded-xl border border-border bg-card p-5"

const linkExtraClasses =
  "group transition-colors hover:border-vo-purple/40 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"

const unlinkedExtraClasses = "opacity-90"

const iconWrapperClasses =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-vo-purple/10 transition-colors"

const iconWrapperLinkedClasses = "group-hover:bg-vo-purple/15"

const unlinkedBadgeClasses =
  "inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 font-sans text-[11px] font-medium text-amber-700 dark:text-amber-300"

export function ReportHubCatalogCard({
  title,
  description,
  icon: Icon,
  href,
  badge,
  unlinkedHint,
}: ReportHubCatalogCardProps) {
  const hasLink = !!href

  const content = (
    <>
      <div className="flex items-start gap-3">
        <div
          className={
            hasLink
              ? `${iconWrapperClasses} ${iconWrapperLinkedClasses}`
              : iconWrapperClasses
          }
          aria-hidden
        >
          <Icon className="h-5 w-5 text-vo-purple" />
        </div>
        <div className="min-w-0 space-y-1">
          {badge ? (
            <p className="font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {badge}
            </p>
          ) : null}
          <h3 className="font-sans text-base font-semibold text-foreground">
            {title}
          </h3>
          <p className="font-sans text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {hasLink ? (
        <span className="inline-flex items-center gap-2 font-sans text-sm font-medium text-vo-purple">
          <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
          Abrir y descargar
        </span>
      ) : (
        <div className="flex flex-col gap-2">
          <span className={unlinkedBadgeClasses}>
            <FileWarning className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Sin plantilla vinculada
          </span>
          {unlinkedHint ? (
            <p className="font-sans text-xs text-muted-foreground">
              {unlinkedHint}
            </p>
          ) : null}
        </div>
      )}
    </>
  )

  if (hasLink) {
    return (
      <Link
        href={href!}
        aria-label={`Abrir reporte: ${title}`}
        className={`${baseCardClasses} ${linkExtraClasses}`}
      >
        {content}
      </Link>
    )
  }

  return (
    <article
      aria-label={`Reporte sin plantilla: ${title}`}
      className={`${baseCardClasses} ${unlinkedExtraClasses}`}
    >
      {content}
    </article>
  )
}
