"use client"

import type { ReactNode } from "react"

interface ReportesChartCardProps {
  title: string
  description?: string
  headingId: string
  children: ReactNode
  /** Clases extra en el slot del gráfico (p. ej. altura mínima distinta). */
  minHeightClassName?: string
}

export function ReportesChartCard({
  title,
  description,
  headingId,
  children,
  minHeightClassName = "",
}: ReportesChartCardProps) {
  const chartSlotClass = ["w-full min-h-[260px] overflow-hidden", minHeightClassName]
    .filter(Boolean)
    .join(" ")

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6"
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="mb-1 font-sans text-base font-semibold text-foreground"
      >
        {title}
      </h2>
      {description ? (
        <p className="mb-4 font-sans text-sm text-muted-foreground">{description}</p>
      ) : (
        <div className="mb-4" />
      )}
      <div className={chartSlotClass} style={{ height: 360 }}>
        {children}
      </div>
    </section>
  )
}
