"use client"

import { useTranslations } from "next-intl"
import {
  formatRequirementKey,
  toRequirementImportance,
} from "@/lib/vacancies/format-requirement-key"

interface RequirementsDisplayProps {
  value: unknown
  attributeWeights?: unknown
}

interface RequirementRow {
  key: string
  label: string
  levelText: string
  importance: number | null
}

function toLevelText(value: unknown, unspecified: string): string {
  if (value == null) return unspecified
  if (typeof value === "object" && !Array.isArray(value)) {
    const nested = Object.entries(value as Record<string, unknown>)
      .map(([nestedKey, nestedValue]) => `${formatRequirementKey(nestedKey)}: ${nestedValue}`)
      .join(", ")
    return nested === "" ? unspecified : nested
  }
  const text = String(value).trim()
  return text === "" ? unspecified : text
}

function toDisplayText(value: unknown): string {
  if (value == null) return "—"
  if (typeof value === "string") return value.trim() || "—"
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([entryKey, entryValue]) => `${entryKey}: ${entryValue}`)
      .join(", ")
  }
  return "—"
}

function buildRequirementRows(
  entries: [string, unknown][],
  attributeWeights: unknown,
  unspecified: string
): RequirementRow[] {
  const weights =
    attributeWeights && typeof attributeWeights === "object" && !Array.isArray(attributeWeights)
      ? (attributeWeights as Record<string, unknown>)
      : {}

  return entries.map(([key, val]) => ({
    key,
    label: formatRequirementKey(key),
    levelText: toLevelText(val, unspecified),
    importance: toRequirementImportance(weights[key]),
  }))
}

function sortRequirementRows(rows: RequirementRow[]): RequirementRow[] {
  const hasImportance = rows.some((row) => row.importance != null)
  if (!hasImportance) return rows

  return [...rows].sort((left, right) => {
    if (left.importance == null && right.importance == null) {
      return left.label.localeCompare(right.label)
    }
    if (left.importance == null) return 1
    if (right.importance == null) return -1
    if (right.importance !== left.importance) return right.importance - left.importance
    return left.label.localeCompare(right.label)
  })
}

/**
 * Renders vacancy requirements as string, array, or structured rows
 * (skill, expected level, importance 1–10).
 */
export function RequirementsDisplay({ value, attributeWeights }: RequirementsDisplayProps) {
  const t = useTranslations("RecruiterPortal.vacancies.detail.requirementsList")

  if (value == null) return null

  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key]) => key != null && !String(key).startsWith("additionalProp")
    )
    if (entries.length === 0) return null

    const rows = sortRequirementRows(
      buildRequirementRows(entries, attributeWeights, t("unspecified"))
    )
    const hasImportance = rows.some((row) => row.importance != null)
    const uniqueLevels = new Set(rows.map((row) => row.levelText))
    const sharedLevel = uniqueLevels.size === 1 ? rows[0]?.levelText ?? null : null
    const gridClass = sharedLevel
      ? hasImportance
        ? "sm:grid-cols-[minmax(0,1fr)_9rem]"
        : "sm:grid-cols-[minmax(0,1fr)]"
      : hasImportance
        ? "sm:grid-cols-[minmax(0,1fr)_auto_9rem]"
        : "sm:grid-cols-[minmax(0,1fr)_auto]"

    return (
      <div>
        {sharedLevel ? (
          <p className="mb-3 flex flex-wrap items-center gap-2 font-sans text-sm text-muted-foreground">
            <span>{t("expectedLevel")}</span>
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              {sharedLevel}
            </span>
          </p>
        ) : (
          <div
            className={`mb-1 hidden gap-3 px-1 font-sans text-xs font-medium text-muted-foreground sm:grid ${gridClass}`}
          >
            <span>{t("skill")}</span>
            <span>{t("expectedLevel")}</span>
            {hasImportance ? <span className="text-right">{t("importance")}</span> : null}
          </div>
        )}
        {sharedLevel && hasImportance ? (
          <div
            className={`mb-1 hidden gap-3 px-1 font-sans text-xs font-medium text-muted-foreground sm:grid ${gridClass}`}
          >
            <span>{t("skill")}</span>
            <span className="text-right">{t("importance")}</span>
          </div>
        ) : null}
        <ul className="divide-y divide-border" role="list">
          {rows.map((row) => (
            <li
              key={row.key}
              className={`grid grid-cols-1 gap-2 py-2.5 sm:items-center sm:gap-3 ${gridClass}`}
            >
              <span className="font-sans text-sm font-medium text-foreground">{row.label}</span>
              {sharedLevel ? null : (
                <div className="flex items-center justify-between gap-2 sm:justify-start">
                  <span className="font-sans text-xs text-muted-foreground sm:hidden">
                    {t("expectedLevel")}
                  </span>
                  <span className="inline-flex max-w-full items-center rounded-md bg-muted px-2 py-0.5 font-sans text-xs font-medium text-foreground">
                    {row.levelText}
                  </span>
                </div>
              )}
              {row.importance != null ? (
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <span className="font-sans text-xs text-muted-foreground sm:hidden">
                    {t("importance")}
                  </span>
                  <div
                    className="flex items-center gap-2"
                    aria-label={t("importanceAria", { value: row.importance })}
                  >
                    <div
                      className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"
                      aria-hidden
                    >
                      <div
                        className="h-full rounded-full bg-vo-purple"
                        style={{ width: `${row.importance * 10}%` }}
                      />
                    </div>
                    <span className="font-sans text-sm font-medium tabular-nums text-foreground">
                      {t("importanceValue", { value: row.importance })}
                    </span>
                  </div>
                </div>
              ) : hasImportance ? (
                <span className="font-sans text-sm text-muted-foreground sm:text-right">
                  {t("unspecified")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (Array.isArray(value)) {
    const items = value.filter((item) => item != null && String(item).trim() !== "")
    if (items.length === 0) return null
    return (
      <ul className="list-inside list-disc space-y-1.5 font-sans text-sm text-muted-foreground" role="list">
        {items.map((item, index) => (
          <li key={index}>{typeof item === "object" ? toDisplayText(item) : String(item)}</li>
        ))}
      </ul>
    )
  }

  const text = typeof value === "string" ? value.trim() : String(value)
  if (text === "") return null

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const looksLikeList =
    lines.length > 1 &&
    lines.some((line) => /^[-*•]\s/.test(line) || /^\d+[.)]\s/.test(line))

  if (looksLikeList) {
    return (
      <ul className="list-inside space-y-1.5 font-sans text-sm text-muted-foreground" role="list">
        {lines.map((line, index) => (
          <li key={index} className="pl-0">
            {line.replace(/^[-*•]\s/, "").replace(/^\d+[.)]\s/, "")}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-2 font-sans text-sm text-muted-foreground">
      {lines.map((line, index) => (
        <p key={index} className="whitespace-pre-wrap">
          {line}
        </p>
      ))}
    </div>
  )
}
