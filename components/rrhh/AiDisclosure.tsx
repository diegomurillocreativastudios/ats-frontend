"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { ApplyStyleProgressBar } from "@/components/public/apply-style-progress-bar";
import {
  APPLY_LOADING_TICK_MS,
  getLoadingBarPercentForTypicalDuration,
  RECRUITER_ADD_CANDIDATE_TYPICAL_MS,
} from "@/lib/apply-loading-bar";

export interface AiDisclosurePillProgressProps {
  /** 0–100 misma barra que en `/oportunidades/.../aplicar`; `null` = avance por tiempo (una sola petición) */
  percent: number | null
  "aria-label"?: string
  /** Con `percent === null`: referencia (ms) para alinear el ~86% con la duración típica. Por defecto: ingest de candidato. */
  timeBasedTypicalMs?: number
  className?: string
}

/**
 * Mismos colores que la barra en overlay oscuro de aplicar (gradiente #f0a7ff → #8dd8ff + resplandor).
 */
export function AiDisclosurePillProgress({
  percent,
  "aria-label": ariaLabel = "Progreso del procesamiento con IA",
  timeBasedTypicalMs = RECRUITER_ADD_CANDIDATE_TYPICAL_MS,
  className = "",
}: AiDisclosurePillProgressProps) {
  const isTimeBased = percent === null
  const [simulatedPercent, setSimulatedPercent] = useState(0)

  useEffect(() => {
    if (!isTimeBased) return
    const startedAt = Date.now()
    const tick = () =>
      setSimulatedPercent(
        getLoadingBarPercentForTypicalDuration(
          Date.now() - startedAt,
          timeBasedTypicalMs
        )
      )
    tick()
    const id = window.setInterval(tick, APPLY_LOADING_TICK_MS)
    return () => window.clearInterval(id)
  }, [isTimeBased, timeBasedTypicalMs])

  const displayPercent =
    typeof percent === "number"
      ? Math.min(100, Math.max(0, percent))
      : simulatedPercent;

  return (
    <div
      className={`mt-2.5 w-full ${className}`.trim()}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(displayPercent)}
      aria-valuetext={`${Math.round(displayPercent)} por ciento`}
      aria-busy={isTimeBased}
      aria-label={ariaLabel}
    >
      <ApplyStyleProgressBar theme="onLight" mode="loading" percent={displayPercent} />
    </div>
  );
}

export function AiDisclosureBadge({ label = "Asistido por IA" }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-vo-purple/30 bg-vo-purple/10 px-2.5 py-1 font-sans text-xs font-semibold text-vo-purple">
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function AiDisclosureNotice({ title, description }) {
  return (
    <div className="rounded-lg border border-vo-purple/20 bg-vo-purple/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <AiDisclosureBadge />
        {title ? (
          <p className="font-sans text-sm font-medium text-foreground">
            {title}
          </p>
        ) : null}
      </div>
      {description ? (
        <p className="mt-1.5 font-sans text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function AiKpiCard({ label, value, helper }) {
  return (
    <article className="rounded-lg border border-border bg-card px-3 py-2.5">
      <p className="font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-sans text-base font-semibold text-foreground">
        {value}
      </p>
      {helper ? (
        <p className="mt-0.5 font-sans text-[11px] text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </article>
  );
}
