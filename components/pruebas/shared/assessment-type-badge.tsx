import type { AssessmentKind } from "@/lib/pruebas/types"

export interface AssessmentTypeBadgeProps {
  kind: AssessmentKind
  label: string
}

const KIND_STYLES: Record<AssessmentKind, string> = {
  technical: "border-vo-purple/40 bg-vo-purple/10 text-emerald-900",
  psychometric: "border-border bg-muted text-foreground",
}

export function AssessmentTypeBadge({ kind, label }: AssessmentTypeBadgeProps) {
  return (
    <span
      data-status={kind}
      data-testid="assessment-type-badge"
      className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-1 font-sans text-xs font-medium ${KIND_STYLES[kind]}`}
    >
      {label}
    </span>
  )
}
