import { Archive, Eye } from "lucide-react"

export interface VacancyPublicationBadgeProps {
  isPublished: boolean
  label: string
}

/**
 * Public-portal visibility (Publicado / Archivado). Independent from the pipeline status pill.
 */
export function VacancyPublicationBadge({ isPublished, label }: VacancyPublicationBadgeProps) {
  const Icon = isPublished ? Eye : Archive
  return (
    <span
      data-published={isPublished ? "true" : "false"}
      className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-sans text-xs font-medium ${
        isPublished
          ? "border-vo-purple/40 bg-vo-purple/10 text-emerald-900"
          : "border-amber-300 bg-amber-50 text-amber-800"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  )
}
