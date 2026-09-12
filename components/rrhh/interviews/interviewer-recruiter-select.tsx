"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  fetchAdminUsersAllByRole,
  type AdminUserListItem,
} from "@/lib/api/admin-users"
import { getApiErrorMessage } from "@/lib/api-error"

function looksLikeEmail(value: string): boolean {
  return value.includes("@")
}

function titleCaseHandlePart(part: string): string {
  if (!part) return part
  return part.charAt(0).toUpperCase() + part.slice(1)
}

/**
 * Turns a userName or email into a person-facing interviewer label.
 * Identity often stores the email as userName; the session API then uses the
 * local-part as `name` (e.g. diego@… → Diego).
 */
export function recruiterDisplayName(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""

  const handle = looksLikeEmail(trimmed)
    ? (trimmed.split("@")[0] ?? trimmed)
    : trimmed
  const parts = handle.split(/[._-]+/).filter(Boolean)
  if (parts.length === 0) return trimmed
  return parts.map(titleCaseHandlePart).join(" ")
}

export function recruiterOptionLabel(u: AdminUserListItem): string {
  const n = u.userName?.trim()
  if (n) return recruiterDisplayName(n)
  const e = u.email?.trim()
  if (e) return recruiterDisplayName(e)
  return u.id
}

function recruiterMatchesStoredValue(
  u: AdminUserListItem,
  stored: string,
): boolean {
  if (!stored) return false
  if (recruiterOptionLabel(u) === stored) return true
  const email = u.email?.trim()
  if (email && email.toLowerCase() === stored.toLowerCase()) return true
  const userName = u.userName?.trim()
  if (userName && userName.toLowerCase() === stored.toLowerCase()) return true
  return false
}

export type InterviewerRecruiterSelectProps = {
  id: string
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  emptyLabel?: string
}

export function InterviewerRecruiterSelect({
  id,
  value,
  onChange,
  disabled = false,
  emptyLabel,
}: InterviewerRecruiterSelectProps) {
  const t = useTranslations("RecruiterPortal.interviews.interviewerSelect")
  const resolvedEmptyLabel = emptyLabel ?? t("select")
  const [recruiters, setRecruiters] = useState<AdminUserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    ;(async () => {
      try {
        const list = await fetchAdminUsersAllByRole("Recruiter")
        if (!cancelled) setRecruiters(list)
      } catch (err: unknown) {
        if (!cancelled) {
          setRecruiters([])
          setLoadError(getApiErrorMessage(err))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const sorted = useMemo(
    () =>
      [...recruiters].sort((a, b) =>
        recruiterOptionLabel(a).localeCompare(
          recruiterOptionLabel(b),
          "es",
          { sensitivity: "base" },
        ),
      ),
    [recruiters],
  )

  const trimmed = value.trim()
  const matchedRecruiter = sorted.find((u) =>
    recruiterMatchesStoredValue(u, trimmed),
  )
  const selectedLabel = matchedRecruiter
    ? recruiterOptionLabel(matchedRecruiter)
    : trimmed
  const hasOrphanValue = trimmed.length > 0 && !matchedRecruiter

  useEffect(() => {
    if (loading || loadError || !matchedRecruiter) return
    if (selectedLabel === value) return
    onChange(selectedLabel)
  }, [loading, loadError, matchedRecruiter, onChange, selectedLabel, value])

  if (loading) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 font-sans text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        {t("loading")}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-sm text-muted-foreground" role="status">
          {loadError} {t("manualHint")}
        </p>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-10 rounded-md border border-input bg-background px-3 font-sans text-sm disabled:opacity-60"
        />
      </div>
    )
  }

  return (
    <select
      id={id}
      value={selectedLabel}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-10 rounded-md border border-input bg-background px-3 font-sans text-sm disabled:opacity-60"
    >
      <option value="">{resolvedEmptyLabel}</option>
      {sorted.map((u) => {
        const lab = recruiterOptionLabel(u)
        return (
          <option key={u.id} value={lab}>
            {lab}
          </option>
        )
      })}
      {hasOrphanValue ? (
        <option value={trimmed}>{trimmed}</option>
      ) : null}
    </select>
  )
}
