"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApplyStyleProgressBar } from "@/components/public/apply-style-progress-bar";
import {
  APPLY_LOADING_TICK_MS,
  getLoadingBarPercentForTypicalDuration,
  RECRUITER_ADD_CANDIDATE_TYPICAL_MS,
} from "@/lib/apply-loading-bar";
import {
  AI_INGEST_PROGRESS_STEPS,
  AI_INGEST_PROGRESS_COMPLETED_LABEL,
  getAiIngestStepIndexFromPercent,
  getAiIngestStatusLabelFromPercent,
} from "@/lib/ai-ingest-progress-status";
import {
  VACANCY_PRELIMINARY_MATCH_PROGRESS_STEPS,
  getVacancyPreliminaryMatchStepIndexFromPercent,
  getVacancyPreliminaryMatchStatusLabelFromPercent,
} from "@/lib/vacancy-preliminary-match-progress-status";

export interface AiDisclosurePillProgressProps {
  /** 0–100 misma barra que en `/portal-oportunidades/.../aplicar`; `null` = avance por tiempo (una sola petición) */
  percent: number | null
  "aria-label"?: string
  /** Con `percent === null`: referencia (ms) para alinear el ~86% con la duración típica. Por defecto: ingest de candidato. */
  timeBasedTypicalMs?: number
  className?: string
  /** Modal RRHH ingest CV: muestra etapa textual según % (incluye avance simulado cuando `percent` es null) */
  ingestStepLabels?: boolean
  /** Vacante RRHH — análisis preliminar (POST match): stepper con etapas propias */
  preliminaryMatchStepLabels?: boolean
  /** Pulso final al 100% con animación de éxito */
  isCompleted?: boolean
}

/**
 * Mismos colores que la barra en overlay oscuro de aplicar (gradiente #A45C40 → #B87333 + resplandor).
 */
export function AiDisclosurePillProgress({
  percent,
  "aria-label": ariaLabel,
  timeBasedTypicalMs = RECRUITER_ADD_CANDIDATE_TYPICAL_MS,
  className = "",
  ingestStepLabels = false,
  preliminaryMatchStepLabels = false,
  isCompleted = false,
}: AiDisclosurePillProgressProps) {
  const t = useTranslations("RecruiterPortal.aiDisclosure");
  const resolvedAriaLabel = ariaLabel ?? t("progressAria");
  const isTimeBased = percent === null && !isCompleted
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

  const displayPercent = isCompleted
    ? 100
    : typeof percent === "number"
      ? Math.min(100, Math.max(0, percent))
      : simulatedPercent

  const showVacancyMatchStepper = preliminaryMatchStepLabels
  const showIngestStepper = ingestStepLabels && !showVacancyMatchStepper
  const showStepper = showIngestStepper || showVacancyMatchStepper

  const steps = showVacancyMatchStepper
    ? VACANCY_PRELIMINARY_MATCH_PROGRESS_STEPS
    : AI_INGEST_PROGRESS_STEPS

  const stepLabel = showStepper
    ? showIngestStepper && isCompleted
      ? AI_INGEST_PROGRESS_COMPLETED_LABEL
      : showVacancyMatchStepper
        ? getVacancyPreliminaryMatchStatusLabelFromPercent(displayPercent)
        : getAiIngestStatusLabelFromPercent(displayPercent)
    : null

  const rounded = Math.round(displayPercent)
  const ariaValueText = stepLabel
    ? `${stepLabel}. ${t("percentComplete", { percent: rounded })}`
    : t("percentComplete", { percent: rounded })

  const isBusy = !isCompleted && rounded < 100

  const currentStepIndex = showVacancyMatchStepper
    ? getVacancyPreliminaryMatchStepIndexFromPercent(displayPercent)
    : getAiIngestStepIndexFromPercent(displayPercent)

  const stepperNavAriaLabel = showVacancyMatchStepper
    ? t("preliminaryStepsAria")
    : t("processingStepsAria")

  const classNames = (...classes: Array<string | boolean>) =>
    classes.filter(Boolean).join(" ")

  return (
    <div
      className={`mt-2.5 w-full ${className}`.trim()}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rounded}
      aria-valuetext={ariaValueText}
      aria-busy={isBusy}
      aria-label={resolvedAriaLabel}
    >
      {showStepper ? (
        <div className="space-y-2">
          <nav aria-label={stepperNavAriaLabel}>
            <ol
              role="list"
              className="flex min-h-[28px] items-center gap-0 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pb-0"
            >
              {steps.map((name, stepIdx) => {
                const isComplete = showIngestStepper && isCompleted
                  ? stepIdx <= currentStepIndex
                  : stepIdx < currentStepIndex
                const isCurrent =
                  !isCompleted && stepIdx === currentStepIndex && !(showIngestStepper && isCompleted)
                const isUpcoming = stepIdx > currentStepIndex

                return (
                  <li
                    key={name}
                    className={classNames(
                      stepIdx !== steps.length - 1 && "pr-2 sm:pr-4",
                      "relative shrink-0"
                    )}
                  >
                    {isComplete ? (
                      <>
                        <div aria-hidden className="absolute inset-0 flex items-center">
                          <div className="h-0.5 w-full bg-vo-purple" />
                        </div>
                        <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-vo-purple">
                          <Check className="h-3.5 w-3.5 text-white" aria-hidden />
                          <span className="sr-only">{name}</span>
                        </div>
                      </>
                    ) : isCurrent ? (
                      <>
                        <div aria-hidden className="absolute inset-0 flex items-center">
                          <div className="h-0.5 w-full bg-muted-foreground/30 overflow-hidden">
                            <span className="block h-full w-1/2 animate-apply-shimmer bg-[linear-gradient(90deg,transparent,#B87333,transparent)]" />
                          </div>
                        </div>
                        <div
                          aria-current="step"
                          className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-vo-purple bg-background"
                        >
                          <span
                            aria-hidden
                            className="absolute inset-0 rounded-full border border-vo-purple/60 animate-ping"
                          />
                          <span aria-hidden className="h-2 w-2 rounded-full bg-vo-purple" />
                          <span className="sr-only">{name}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div aria-hidden className="absolute inset-0 flex items-center">
                          <div className="h-0.5 w-full bg-muted-foreground/30" />
                        </div>
                        <div className="group relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-muted-foreground/40 bg-background">
                          <span
                            aria-hidden
                            className={classNames(
                              "h-2 w-2 rounded-full transition-colors",
                              isUpcoming ? "bg-transparent" : "bg-muted-foreground/30"
                            )}
                          />
                          <span className="sr-only">{name}</span>
                        </div>
                      </>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
          {stepLabel ? (
            <p className="font-sans text-xs font-medium text-foreground" aria-live="polite">
              {stepLabel}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          {stepLabel ? (
            <p className="mb-1.5 font-sans text-xs font-medium text-foreground" aria-live="polite">
              {stepLabel}
            </p>
          ) : null}
          <ApplyStyleProgressBar
            theme="onLight"
            mode={isCompleted ? "success" : "loading"}
            percent={displayPercent}
          />
        </>
      )}
    </div>
  );
}

export function AiDisclosureBadge({ label }: { label?: string }) {
  const t = useTranslations("RecruiterPortal.aiDisclosure");
  const resolvedLabel = label ?? t("assistedByAi");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-vo-purple/30 bg-vo-purple/10 px-2.5 py-1 font-sans text-xs font-semibold text-vo-purple">
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      {resolvedLabel}
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
