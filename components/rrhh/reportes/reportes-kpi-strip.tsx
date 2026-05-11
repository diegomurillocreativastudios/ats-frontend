"use client"

export interface ReportesKpiItem {
  label: string
  value: string | number
  helper?: string
}

interface ReportesKpiStripProps {
  title?: string
  headingId: string
  items: readonly ReportesKpiItem[]
  columnsClassName?: string
}

export function ReportesKpiStrip({
  title = "Indicadores",
  headingId,
  items,
  columnsClassName = "sm:grid-cols-2 lg:grid-cols-4",
}: ReportesKpiStripProps) {
  if (items.length === 0) return null

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6"
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="mb-4 font-sans text-base font-semibold text-foreground"
      >
        {title}
      </h2>
      <dl className={`grid gap-4 ${columnsClassName}`}>
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-muted/50 px-4 py-3">
            <dt className="font-sans text-xs text-muted-foreground">{item.label}</dt>
            <dd className="font-sans text-2xl font-semibold tabular-nums text-foreground">
              {item.value}
            </dd>
            {item.helper ? (
              <p className="mt-1 font-sans text-[11px] leading-snug text-muted-foreground">
                {item.helper}
              </p>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  )
}
