"use client"

import { useTranslations } from "next-intl"
import { AlertTriangle, Building2, Calendar, Globe2, Tag } from "lucide-react"
import type { VacancyResultadosVacancyMeta } from "@/lib/api/vacancy-resultados"
import { getVacancyJobCategoryLabel } from "@/lib/vacancies/vacancy-catalog-labels"
import { getVacancyStatusLabel } from "@/lib/vacancies/vacancy-status-labels"

export interface VacancyResultadosMetaPanelProps {
  vacancyTitle: string | null
  meta: VacancyResultadosVacancyMeta
  /** Oculta título principal y chips de estado cuando la página ya los muestra arriba. */
  hideVacancyHeading?: boolean
}

function formatDisplayDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("es", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function hasStructuredWeights(weights: unknown): boolean {
  const o =
    weights && typeof weights === "object" && !Array.isArray(weights)
      ? (weights as Record<string, unknown>)
      : null
  if (!o) return false
  const semantic = o.semantic
  if (typeof semantic === "number" && Number.isFinite(semantic)) return true
  const attrs = o.attributes
  if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
    return Object.values(attrs as Record<string, unknown>).some(
      (v) => typeof v === "number" && Number.isFinite(v)
    )
  }
  return false
}

function flattenRequirementEntries(
  value: unknown,
  path = ""
): { label: string; text: string }[] {
  if (value == null) return []
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = String(value).trim()
    if (!text) return []
    return [{ label: path, text }]
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      if (
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
      ) {
        const text = String(item).trim()
        if (!text) return []
        return [{ label: path || String(index + 1), text }]
      }
      return flattenRequirementEntries(
        item,
        path ? `${path} · ${index + 1}` : String(index + 1)
      )
    })
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, nested]) =>
        flattenRequirementEntries(nested, path ? `${path} · ${key}` : key)
    )
  }
  return []
}

function suggestionToLines(item: unknown): string[] {
  if (item == null) return []
  if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
    const text = String(item).trim()
    return text ? [text] : []
  }
  if (Array.isArray(item)) {
    return item.flatMap(suggestionToLines)
  }
  if (typeof item === "object") {
    const o = item as Record<string, unknown>
    const preferredKeys = [
      "text",
      "message",
      "suggestion",
      "summary",
      "title",
      "description",
      "reason",
    ]
    for (const key of preferredKeys) {
      const v = o[key]
      if (typeof v === "string" && v.trim()) return [v.trim()]
    }
    return Object.entries(o).flatMap(([key, nested]) => {
      if (nested == null) return []
      if (
        typeof nested === "string" ||
        typeof nested === "number" ||
        typeof nested === "boolean"
      ) {
        const text = String(nested).trim()
        return text ? [`${key}: ${text}`] : []
      }
      return suggestionToLines(nested).map((line) => `${key}: ${line}`)
    })
  }
  return []
}

function WeightsVisual({ weights }: { weights: unknown }) {
  const t = useTranslations("RecruiterPortal.vacancies.results.meta")
  const o =
    weights && typeof weights === "object" && !Array.isArray(weights)
      ? (weights as Record<string, unknown>)
      : null
  const semanticRaw = o?.semantic
  const semantic =
    typeof semanticRaw === "number" && Number.isFinite(semanticRaw)
      ? Math.min(1, Math.max(0, semanticRaw))
      : null
  const attrs = o?.attributes
  const attrEntries =
    attrs && typeof attrs === "object" && !Array.isArray(attrs)
      ? Object.entries(attrs as Record<string, unknown>).filter(
          ([, v]) => typeof v === "number" && Number.isFinite(v)
        )
      : []

  if (semantic == null && attrEntries.length === 0) {
    return (
      <p className="font-sans text-sm text-muted-foreground">
        {t("noStructuredWeights")}
      </p>
    )
  }

  const semanticPct = semantic != null ? Math.round(semantic * 100) : null

  return (
    <div className="space-y-4">
      {semanticPct != null ? (
        <div>
          <div className="mb-1 flex items-center justify-between font-sans text-xs text-muted-foreground">
            <span>{t("semanticWeight")}</span>
            <span className="tabular-nums font-medium text-foreground">
              {semanticPct}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-linear-to-r from-vo-purple to-emerald-500"
              style={{ width: `${semanticPct}%` }}
            />
          </div>
        </div>
      ) : null}
      {attrEntries.length > 0 ? (
        <div>
          <p className="mb-2 font-sans text-xs font-medium text-muted-foreground">
            {t("attributeWeights")}
          </p>
          <ul className="space-y-2">
            {attrEntries.map(([key, val]) => {
              const n = typeof val === "number" ? val : 0
              const pct = Math.round(Math.min(1, Math.max(0, n)) * 100)
              return (
                <li key={key}>
                  <div className="mb-0.5 flex justify-between font-sans text-xs text-muted-foreground">
                    <span className="truncate pr-2" title={key}>
                      {key}
                    </span>
                    <span className="shrink-0 tabular-nums text-foreground">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-ats-cobre"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : semanticPct != null ? (
        <p className="font-sans text-xs text-muted-foreground">
          {t("noAdditionalAttributeWeights")}
        </p>
      ) : null}
    </div>
  )
}

function RequirementsBlock({ requirements }: { requirements: unknown }) {
  const t = useTranslations("RecruiterPortal.vacancies.results.meta")
  if (requirements == null) {
    return (
      <p className="font-sans text-sm text-muted-foreground">
        {t("noRequirements")}
      </p>
    )
  }
  const entries = flattenRequirementEntries(requirements)
  if (entries.length === 0) {
    return (
      <p className="font-sans text-sm text-muted-foreground">
        {t("emptyRequirements")}
      </p>
    )
  }
  return (
    <ul className="space-y-2 font-sans text-sm text-foreground">
      {entries.map((entry, index) => (
        <li
          key={`${entry.label}-${index}`}
          className="rounded-lg border border-border/60 bg-background/60 px-3 py-2"
        >
          {entry.label ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {entry.label}
            </p>
          ) : null}
          <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{entry.text}</p>
        </li>
      ))}
    </ul>
  )
}

function AiSuggestionsBlock({ suggestions }: { suggestions: unknown[] }) {
  const t = useTranslations("RecruiterPortal.vacancies.results.meta")
  const lines = suggestions.flatMap(suggestionToLines)
  if (lines.length === 0) return null
  return (
    <div role="region" aria-label={t("aiSuggestionsAria")}>
      <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("aiSuggestionsHeading", { count: lines.length })}
      </h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 font-sans text-sm leading-relaxed text-foreground">
        {lines.map((line, index) => (
          <li key={`${index}-${line.slice(0, 24)}`}>{line}</li>
        ))}
      </ul>
    </div>
  )
}

export function VacancyResultadosMetaPanel({
  vacancyTitle,
  meta,
  hideVacancyHeading = false,
}: VacancyResultadosMetaPanelProps) {
  const tMeta = useTranslations("RecruiterPortal.vacancies.results.meta")
  const tPage = useTranslations("RecruiterPortal.vacancies.results.page")
  const tVacancies = useTranslations("RecruiterPortal.vacancies")
  const created = formatDisplayDate(meta.createdAt)
  const title = vacancyTitle?.trim() || tPage("vacancyFallback")
  const statusLabel = getVacancyStatusLabel(meta.status, tVacancies)
  const jobCategoryLabel = getVacancyJobCategoryLabel(
    meta.jobCategory,
    tVacancies
  )

  const requirementEntries = flattenRequirementEntries(meta.requirements)
  const suggestionLines = meta.aiMatchSuggestions.flatMap(suggestionToLines)
  const showWeights = hasStructuredWeights(meta.weights)
  const showRequirements = requirementEntries.length > 0
  const showSuggestions = suggestionLines.length > 0
  const showTechnicalDetails =
    showWeights || showRequirements || showSuggestions

  const contextItems = [
    meta.company
      ? {
          key: "company",
          icon: Building2,
          label: tMeta("company"),
          value: meta.company,
        }
      : null,
    meta.countryCode
      ? {
          key: "country",
          icon: Globe2,
          label: tMeta("countryCode"),
          value: meta.countryCode,
        }
      : null,
    meta.vacancyDepartmentLabel
      ? {
          key: "department",
          icon: null,
          label: tMeta("department"),
          value: meta.vacancyDepartmentLabel,
        }
      : null,
    meta.vacancyModalityLabel
      ? {
          key: "modality",
          icon: null,
          label: tMeta("modality"),
          value: meta.vacancyModalityLabel,
        }
      : null,
    created && !hideVacancyHeading
      ? {
          key: "created",
          icon: Calendar,
          label: tMeta("created"),
          value: created,
        }
      : null,
  ].filter(Boolean) as {
    key: string
    icon: typeof Building2 | null
    label: string
    value: string
  }[]

  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
      aria-labelledby="vacancy-resultados-meta-heading"
    >
      {!hideVacancyHeading ? (
        <>
          <h2
            id="vacancy-resultados-meta-heading"
            className="font-sans text-lg font-bold tracking-tight text-foreground sm:text-xl"
          >
            {title}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {statusLabel ? (
              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-sans text-xs font-semibold text-emerald-800">
                {statusLabel}
              </span>
            ) : null}
            {jobCategoryLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-3 py-1 font-sans text-xs text-foreground">
                <Tag
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                {jobCategoryLabel}
              </span>
            ) : null}
            {meta.needsRematch ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-sans text-xs font-medium text-amber-900">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {tPage("needsRematch")}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <h2 id="vacancy-resultados-meta-heading" className="sr-only">
          {tMeta("srOnlyContext", { title })}
        </h2>
      )}

      {contextItems.length > 0 ? (
        <dl
          className={`grid gap-2 font-sans text-sm sm:grid-cols-2 lg:grid-cols-4 ${
            hideVacancyHeading ? "" : "mt-4"
          }`}
        >
          {contextItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.key}
                className="flex min-w-0 gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
              >
                {Icon ? (
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                ) : null}
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{item.label}</dt>
                  <dd className="truncate font-medium text-foreground" title={item.value}>
                    {item.value}
                  </dd>
                </div>
              </div>
            )
          })}
        </dl>
      ) : null}

      {meta.description ? (
        <details className="group mt-4 rounded-lg border border-border bg-muted/10">
          <summary className="cursor-pointer list-none px-4 py-2.5 font-sans text-sm font-semibold text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              {tMeta("viewFullDescription")}
              <span className="text-xs font-normal text-muted-foreground group-open:hidden">
                {tMeta("expandHint")}
              </span>
            </span>
          </summary>
          <div className="border-t border-border px-4 py-3">
            <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
              {meta.description}
            </p>
          </div>
        </details>
      ) : null}

      {showTechnicalDetails ? (
        <details className="group mt-3 rounded-lg border border-border bg-muted/10">
          <summary className="cursor-pointer list-none px-4 py-2.5 font-sans text-sm font-semibold text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
            {tMeta("technicalDetails")}
            <span className="ml-2 text-xs font-normal text-muted-foreground group-open:hidden">
              {tMeta("technicalDetailsHint")}
            </span>
          </summary>
          <div className="space-y-5 border-t border-border px-4 py-4">
            {showWeights ? (
              <div>
                <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {tMeta("modelWeightsHeading")}
                </h3>
                <div className="mt-3 max-w-md">
                  <WeightsVisual weights={meta.weights} />
                </div>
              </div>
            ) : null}
            {showRequirements ? (
              <div>
                <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {tMeta("requirementsPayload")}
                </h3>
                <div className="mt-2">
                  <RequirementsBlock requirements={meta.requirements} />
                </div>
              </div>
            ) : null}
            {showSuggestions ? (
              <AiSuggestionsBlock suggestions={meta.aiMatchSuggestions} />
            ) : null}
          </div>
        </details>
      ) : null}
    </section>
  )
}
