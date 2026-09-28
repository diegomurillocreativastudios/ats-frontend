import { EyeOff } from "lucide-react"

/**
 * Marks a vacancy hidden from candidates. Deliberately distinct from read-only styling.
 */
export function VacancyUnpublishedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 font-sans text-xs font-medium text-amber-800">
      <EyeOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  )
}
