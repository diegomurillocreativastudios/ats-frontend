"use client"

import { useTranslations } from "next-intl"
import { DollarSign } from "lucide-react"
import {
  blockNegativeNumberKeys,
  profileEditInputClass,
  profileEditLabelClass,
  sanitizeNonNegativeSalaryInput,
} from "@/components/candidato/candidate-profile-edit-field-groups"

const parseJsonObjectIfString = (value: unknown): Record<string, unknown> | null => {
  if (value == null) return null
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
  }
  return null
}

export const resolveCandidateMinSalary = (
  jobPrefs: unknown,
  fallbackMinSalary?: number | null,
  editJobMinSalary?: string
): number | null => {
  if (editJobMinSalary !== undefined) {
    const trimmed = editJobMinSalary.trim()
    if (trimmed !== "") {
      const n = Number(trimmed)
      if (!Number.isNaN(n)) return n
    }
  }

  const parsed = parseJsonObjectIfString(jobPrefs)
  const raw = parsed?.MinSalary ?? parsed?.minSalary ?? fallbackMinSalary ?? null
  if (raw == null) return null
  const n = Number(raw)
  return Number.isNaN(n) ? null : n
}

export const formatSalaryUsd = (amount: number): string =>
  new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)

interface CandidateSalaryExpectationCardProps {
  jobPrefs: unknown
  fallbackMinSalary?: number | null
  isEditing?: boolean
  editValue?: string
  onEditChange?: (value: string) => void
  saving?: boolean
}

export function CandidateSalaryExpectationCard({
  jobPrefs,
  fallbackMinSalary,
  isEditing = false,
  editValue,
  onEditChange,
  saving = false,
}: CandidateSalaryExpectationCardProps) {
  const t = useTranslations("CandidatePortal.profile")
  const amount = resolveCandidateMinSalary(
    jobPrefs,
    fallbackMinSalary,
    isEditing ? editValue : undefined
  )
  const hasAmount = amount != null

  return (
    <aside
      className="w-full shrink-0 rounded-2xl border border-vo-purple/25 bg-vo-purple/[0.06] p-4 shadow-sm sm:max-w-[220px] md:p-5"
      aria-labelledby="pretension-salarial-titulo"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vo-purple/15 text-vo-purple"
          aria-hidden
        >
          <DollarSign className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            id="pretension-salarial-titulo"
            className="font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
          >
            {t("salary.title")}
          </p>
          <p className="mt-0.5 font-sans text-xs text-muted-foreground">{t("salary.currency")}</p>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-4">
          <label htmlFor="pf-hero-salary" className={profileEditLabelClass}>
            {t("salary.monthlyLabel")}
          </label>
          <input
            id="pf-hero-salary"
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            value={editValue ?? ""}
            onChange={(e) => onEditChange?.(sanitizeNonNegativeSalaryInput(e.target.value))}
            onKeyDown={blockNegativeNumberKeys}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text")
              const sanitized = sanitizeNonNegativeSalaryInput(pasted)
              if (sanitized !== pasted) {
                e.preventDefault()
                onEditChange?.(sanitized)
              }
            }}
            className={`${profileEditInputClass} mt-1.5`}
            disabled={saving}
            placeholder={t("salary.placeholder")}
            aria-describedby="pretension-salarial-ayuda"
          />
          <p id="pretension-salarial-ayuda" className="mt-2 font-sans text-xs leading-relaxed text-muted-foreground">
            {t("salary.hint")}
          </p>
        </div>
      ) : (
        <p
          className={`mt-4 font-sans text-2xl font-bold tabular-nums tracking-tight md:text-[1.65rem] ${
            hasAmount ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {hasAmount ? formatSalaryUsd(amount) : t("salary.unset")}
        </p>
      )}
    </aside>
  )
}
