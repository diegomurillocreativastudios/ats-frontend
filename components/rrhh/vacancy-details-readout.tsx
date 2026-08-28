"use client"

import type { ChangeEvent } from "react"
import { Info } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  countVacancyDetailItems,
  parseVacancyDetails,
  type VacancyDetailPair,
  type VacancyDetailSection,
} from "@/lib/vacancies/parse-vacancy-details"

interface VacancyDetailsReadoutProps {
  value: unknown
}

interface VacancyDetailsCardProps {
  isEditing: boolean
  details: unknown
  editValue: string
  onEditChange: (value: string) => void
  compact?: boolean
}

const CHIP_MAX_CHARS = 40

function areChipItems(items: string[]): boolean {
  return (
    items.length >= 2 &&
    items.every((item) => item.length <= CHIP_MAX_CHARS && !/[.!?…]$/.test(item))
  )
}

function DetailChips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2" role="list">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="inline-flex max-w-full items-center rounded-md bg-muted px-2.5 py-1 font-sans text-sm text-foreground"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

function DetailFactList({ items }: { items: string[] }) {
  return (
    <ul className="list-outside list-disc space-y-2 pl-5 marker:text-amber-600">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="ps-1 font-sans text-sm leading-relaxed text-foreground"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

function DetailSections({ sections }: { sections: VacancyDetailSection[] }) {
  const showSectionTitles = sections.length > 1

  return (
    <div className="flex flex-col gap-5">
      {sections.map((section, sectionIndex) => (
        <section key={`${section.title ?? "facts"}-${sectionIndex}`} className="flex flex-col gap-3">
          {showSectionTitles && section.title ? (
            <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h3>
          ) : null}
          {areChipItems(section.items) ? (
            <DetailChips items={section.items} />
          ) : (
            <DetailFactList items={section.items} />
          )}
        </section>
      ))}
    </div>
  )
}

function DetailPairs({ pairs }: { pairs: VacancyDetailPair[] }) {
  return (
    <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {pairs.map(({ key, value }) => (
        <div
          key={`${key}-${value}`}
          className="grid gap-1 px-3.5 py-3 sm:grid-cols-[minmax(7rem,11rem)_minmax(0,1fr)] sm:items-baseline sm:gap-4"
        >
          <dt className="font-sans text-xs font-medium text-muted-foreground">{key}</dt>
          <dd className="font-sans text-sm leading-relaxed text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Renders vacancy details as pairs, titled lists, chips, or prose.
 */
export function VacancyDetailsReadout({ value }: VacancyDetailsReadoutProps) {
  const parsed = parseVacancyDetails(value)

  if (parsed.kind === "empty") return null

  if (parsed.kind === "pairs") {
    return <DetailPairs pairs={parsed.pairs} />
  }

  if (parsed.kind === "list") {
    return <DetailSections sections={parsed.sections} />
  }

  return (
    <p className="font-sans text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
      {parsed.text}
    </p>
  )
}

/**
 * Vacancy details card used on recruiter desktop and mobile layouts.
 */
export function VacancyDetailsCard({
  isEditing,
  details,
  editValue,
  onEditChange,
  compact = false,
}: VacancyDetailsCardProps) {
  const tDetail = useTranslations("RecruiterPortal.vacancies.detail")
  const tForm = useTranslations("RecruiterPortal.vacancies.form")
  const itemCount = countVacancyDetailItems(parseVacancyDetails(details))

  const handleEditChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onEditChange(event.target.value)
  }

  return (
    <div
      className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm ${
        compact ? "max-h-80 p-4" : "max-h-96 p-5"
      }`}
    >
      <h2
        className={`flex shrink-0 items-center font-sans text-sm font-semibold text-foreground ${
          compact ? "mb-2 gap-2" : "mb-3 gap-2.5"
        }`}
      >
        <span
          className={`flex items-center justify-center bg-amber-500/10 text-amber-600 ${
            compact ? "h-6 w-6 rounded-md" : "h-7 w-7 rounded-lg"
          }`}
        >
          <Info className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">{tDetail("sections.details")}</span>
        {!isEditing && itemCount > 1 ? (
          <span className="rounded-md bg-muted px-2 py-0.5 font-sans text-xs font-medium tabular-nums text-muted-foreground">
            {tDetail("detailsItemCount", { count: itemCount })}
          </span>
        ) : null}
      </h2>
      {isEditing ? (
        <textarea
          value={editValue}
          onChange={handleEditChange}
          rows={compact ? 6 : 8}
          placeholder={tForm("fields.details.placeholder")}
          className="min-h-0 w-full flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={tForm("fields.details.label")}
        />
      ) : details ? (
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
          tabIndex={0}
          aria-label={tDetail("sections.details")}
        >
          <VacancyDetailsReadout value={details} />
        </div>
      ) : (
        <p className="font-sans text-sm italic text-gray-600">{tDetail("fallbacks.unspecified")}</p>
      )}
    </div>
  )
}
