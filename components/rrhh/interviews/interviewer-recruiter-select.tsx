"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  fetchAdminUsersAllByRole,
  type AdminUserListItem,
} from "@/lib/api/admin-users"
import { getApiErrorMessage } from "@/lib/api-error"

export function recruiterOptionLabel(u: AdminUserListItem): string {
  const n = u.userName?.trim()
  if (n) return n
  const e = u.email?.trim()
  if (e) return e
  return u.id
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
  const hasOrphanValue =
    trimmed.length > 0 &&
    !sorted.some((u) => recruiterOptionLabel(u) === trimmed)

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
      value={trimmed}
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
