import Link from "next/link"
import { BarChart3, type LucideIcon } from "lucide-react"

export interface ReportHubLinkCardProps {
  href: string
  title: string
  description: string
  badge?: string
  icon: LucideIcon
}

export function ReportHubLinkCard({
  href,
  title,
  description,
  badge,
  icon: Icon,
}: ReportHubLinkCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-vo-purple/40 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
      aria-label={`Abrir reporte: ${title}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-vo-purple/10 transition-colors group-hover:bg-vo-purple/15"
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
          <h2 className="font-sans text-base font-semibold text-foreground">{title}</h2>
          <p className="font-sans text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-2 font-sans text-sm font-medium text-vo-purple">
        <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
        Ver reporte
      </span>
    </Link>
  )
}
