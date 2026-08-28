"use client"

import type { ChangeEvent } from "react"
import { DollarSign } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { formatVacancySalary } from "@/lib/vacancies/format-vacancy-salary"

interface VacancySalaryCardProps {
  isEditing: boolean
  salary: unknown
  editValue: string
  onEditChange: (value: string) => void
  compact?: boolean
}

/**
 * Recruiter vacancy salary card: formatted currency KPI or free-text fallback.
 */
export function VacancySalaryCard({
  isEditing,
  salary,
  editValue,
  onEditChange,
  compact = false,
}: VacancySalaryCardProps) {
  const tDetail = useTranslations("RecruiterPortal.vacancies.detail")
  const tForm = useTranslations("RecruiterPortal.vacancies.form")
  const locale = useLocale()
  const display = formatVacancySalary(salary, locale)

  const handleEditChange = (event: ChangeEvent<HTMLInputElement>) => {
    onEditChange(event.target.value)
  }

  const periodLabel =
    display.period != null ? tDetail(`salaryDisplay.${display.period}`) : null

  return (
    <div
      className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-emerald-200/70 bg-emerald-50/50 shadow-sm ${
        compact ? "max-h-80 p-4" : "max-h-96 p-5"
      }`}
    >
      <h2
        className={`flex shrink-0 items-center font-sans text-sm font-semibold text-foreground ${
          compact ? "gap-2" : "gap-2.5"
        }`}
      >
        <span
          className={`flex items-center justify-center bg-emerald-500/15 text-emerald-700 ${
            compact ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl"
          }`}
        >
          <DollarSign className={compact ? "h-4 w-4" : "h-5 w-5"} aria-hidden />
        </span>
        {tDetail("sections.salary")}
      </h2>
      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={handleEditChange}
          placeholder={tForm("fields.salary.placeholder")}
          className="mt-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={tForm("fields.salary.ariaLabel")}
        />
      ) : display.kind === "empty" ? (
        <p className="mt-3 font-sans text-sm italic text-gray-600">
          {tDetail("fallbacks.unspecified")}
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 text-center">
          <p
            className={`font-sans font-semibold tabular-nums tracking-tight text-emerald-900 ${
              display.kind === "amount"
                ? compact
                  ? "text-3xl"
                  : "text-4xl"
                : "text-left text-base leading-relaxed text-foreground"
            }`}
          >
            {display.primary}
          </p>
          {periodLabel ? (
            <p className="mt-1.5 font-sans text-sm text-emerald-800/70">{periodLabel}</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
