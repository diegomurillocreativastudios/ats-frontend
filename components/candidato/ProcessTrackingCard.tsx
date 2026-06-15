"use client"

import { Check, Circle, Clock } from "lucide-react"
import { useTranslations } from "next-intl"
import type { CandidatePortalApplicationRow } from "@/lib/candidate-dashboard"
import {
  translateApplicationStatus,
  translateStageName,
  getApplicationStatusStyle,
} from "@/lib/candidate-portal-translations"

function StageStatusIcon({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
        <Check className="h-5 w-5 text-emerald-600" aria-hidden />
      </div>
    )
  }
  
  if (status === "current") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
        <Circle className="h-5 w-5 fill-blue-600 text-blue-600" aria-hidden />
      </div>
    )
  }
  
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
      <Clock className="h-5 w-5 text-gray-400" aria-hidden />
    </div>
  )
}

function StageCard({
  stage,
  order,
}: {
  stage: { id: string; name: string; order: number; status: string }
  order: number
}) {
  const t = useTranslations("CandidatePortal.process")
  const isCurrent = stage.status === "current"
  const isCompleted = stage.status === "completed"
  
  return (
    <div
      className={`flex min-w-[140px] flex-col gap-3 rounded-lg border p-4 transition-all md:min-w-[160px] ${
        isCurrent
          ? "border-blue-300 bg-blue-50 shadow-sm"
          : isCompleted
            ? "border-emerald-200 bg-emerald-50/50"
            : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`font-sans text-xs font-semibold ${
            isCurrent
              ? "text-blue-600"
              : isCompleted
                ? "text-emerald-600"
                : "text-gray-500"
          }`}
        >
          {t("stageLabel", { order })}
        </span>
        <StageStatusIcon status={stage.status} />
      </div>
      
      <div className="flex flex-col gap-1">
        <p
          className={`font-sans text-sm font-semibold leading-tight ${
            isCurrent
              ? "text-blue-900"
              : isCompleted
                ? "text-emerald-900"
                : "text-gray-700"
          }`}
        >
          {translateStageName(stage.name)}
        </p>
        <p
          className={`font-sans text-xs ${
            isCurrent
              ? "text-blue-600"
              : isCompleted
                ? "text-emerald-600"
                : "text-gray-500"
          }`}
        >
          {stage.status === "completed"
            ? t("stageCompleted")
            : stage.status === "current"
              ? t("stageCurrent")
              : t("stagePending")}
        </p>
      </div>
    </div>
  )
}

export default function ProcessTrackingCard({
  application,
}: {
  application: CandidatePortalApplicationRow | null
}) {
  const t = useTranslations("CandidatePortal.process")
  if (!application) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Circle className="h-8 w-8 text-muted-foreground" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="font-sans text-base font-semibold text-foreground">
              {t("emptyTitle")}
            </p>
            <p className="font-sans text-sm text-muted-foreground">
              {t("emptyDescription")}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const stages = application.stages ?? []
  const hasStages = stages.length > 0
  const progressPercentage = application.totalStages > 0
    ? Math.round((application.progressCurrent / application.totalStages) * 100)
    : 0

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-6 font-sans text-lg font-semibold text-foreground">
        {t("title")}
      </h2>

      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <h3 className="font-sans text-base font-semibold text-foreground">
              {application.jobTitle}
            </h3>
            {application.companyLine && (
              <p className="font-sans text-sm text-muted-foreground">
                {application.companyLine}
              </p>
            )}
          </div>
          <span
            className={`inline-flex self-start rounded-full px-3 py-1 font-sans text-xs font-medium ${getApplicationStatusStyle(translateApplicationStatus(application.statusLabel))}`}
          >
            {translateApplicationStatus(application.statusLabel)}
          </span>
        </div>

        {application.currentStageName && (
          <div className="rounded-lg bg-muted p-4">
            <p className="font-sans text-sm text-muted-foreground">
              {t("currentStagePrefix")}{" "}
              <span className="font-semibold text-foreground">
                {translateStageName(application.currentStageName)}
              </span>
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-sans text-sm font-medium text-foreground">
              {t("overallProgress")}
            </span>
            <span className="font-sans text-sm font-semibold text-foreground">
              {t("stageProgress", {
                current: application.progressCurrent,
                total: application.totalStages,
              })}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-linear-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("progressAria", { percentage: progressPercentage })}
            />
          </div>
        </div>
      </div>

      {hasStages ? (
        <div className="space-y-3">
          <h3 className="font-sans text-sm font-semibold text-foreground">
            {t("processStages")}
          </h3>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
            {stages
              .sort((a, b) => a.order - b.order)
              .map((stage) => (
                <StageCard key={stage.id} stage={stage} order={stage.order} />
              ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="font-sans text-sm text-muted-foreground">
            {t("stagesComingSoon")}
          </p>
        </div>
      )}
    </div>
  )
}
