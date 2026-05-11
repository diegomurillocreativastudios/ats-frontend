"use client"

export interface ReportesAlertItem {
  id: string
  severity: "warning" | "danger" | "info"
  message: string
}

interface ReportesAlertsPanelProps {
  headingId: string
  alerts: readonly ReportesAlertItem[]
}

const severityStyles: Record<
  ReportesAlertItem["severity"],
  { border: string; bg: string; text: string; label: string }
> = {
  danger: {
    border: "border-destructive/40",
    bg: "bg-destructive/5",
    text: "text-destructive",
    label: "Crítico",
  },
  warning: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/5",
    text: "text-amber-800 dark:text-amber-200",
    label: "Atención",
  },
  info: {
    border: "border-border",
    bg: "bg-muted/40",
    text: "text-foreground",
    label: "Info",
  },
}

export function ReportesAlertsPanel({ headingId, alerts }: ReportesAlertsPanelProps) {
  if (alerts.length === 0) return null

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 sm:p-5"
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="mb-3 font-sans text-base font-semibold text-foreground">
        Alertas
      </h2>
      <ul className="flex flex-col gap-2" role="list">
        {alerts.map((a) => {
          const s = severityStyles[a.severity]
          return (
            <li
              key={a.id}
              className={`rounded-lg border px-3 py-2 font-sans text-sm ${s.border} ${s.bg} ${s.text}`}
            >
              <span className="sr-only">{s.label}: </span>
              {a.message}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
