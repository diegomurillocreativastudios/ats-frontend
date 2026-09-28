import Link from "next/link"
import { ChevronRight, type LucideIcon } from "lucide-react"

interface SettingsHubLinkProps {
  href: string
  icon: LucideIcon
  title: string
  description?: string
}

/**
 * Destino del hub de Configuración: bloque abierto, sin tarjeta.
 */
export function SettingsHubLink({
  href,
  icon: Icon,
  title,
  description,
}: SettingsHubLinkProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-40 flex-col rounded-2xl py-2 pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full bg-vo-purple/10"
        aria-hidden
      >
        <Icon className="h-6 w-6 text-vo-purple" />
      </div>
      <div className="mt-5 min-w-0">
        <span className="inline-flex items-center gap-1.5 font-sans text-lg font-semibold tracking-tight text-foreground">
          {title}
          <ChevronRight
            className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden
          />
        </span>
        {description ? (
          <span className="mt-2 block max-w-sm font-sans text-sm leading-6 text-muted-foreground">
            {description}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
