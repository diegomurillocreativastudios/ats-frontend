"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Calendar, FileText, Loader2, Plus, Users } from "lucide-react"
import {
  getInterviewsByVacancy,
  getInterviewHttpErrorMessage,
  type Interview,
  type InterviewStatus,
  type ListInterviewsQuery,
} from "@/lib/api/interviews"
import type { UseRecruiterVacancySummaryResult } from "@/hooks/use-recruiter-vacancy-summary"
import { getInterviewStatusLabel } from "@/lib/interviews/interview-status-labels"
import { formatInterviewLocalDateTime } from "@/lib/interview-datetime"
import { InterviewCreateModal } from "@/components/rrhh/interviews/interview-create-modal"
import { InterviewDetailModal } from "@/components/rrhh/interviews/interview-detail-modal"
import { InterviewNotesModal } from "@/components/rrhh/interviews/interview-notes-modal"
import { InterviewSingleDatetimeRow } from "@/components/rrhh/interviews/interview-schedule-controls"
import { InterviewStatusBadge } from "@/components/rrhh/interviews/interview-status-badge"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"
import { TechnicalSheetModal } from "@/components/rrhh/technical-sheet/technical-sheet-modal"
import { technicalSheetMessages } from "@/lib/messages/technical-sheet"

const STATUS_FILTER_VALUES: ("" | InterviewStatus)[] = [
  "",
  "Scheduled",
  "Completed",
  "Cancelled",
  "NoShow",
]

export interface InterviewListProps {
  vacancyId: string
  vacancySummary: UseRecruiterVacancySummaryResult
}

function formatCandidateLabel(
  profileId: string,
  labelById: Map<string, string>,
  t: (key: string, values?: Record<string, string>) => string
): string {
  if (!profileId) return "—"
  const label = labelById.get(profileId)
  if (label) return label
  return t("cards.candidateFallback", { id: profileId.slice(0, 8) })
}

function formatDurationCell(minutes: number | null): string {
  if (minutes == null || !Number.isFinite(minutes)) return "—"
  return `${minutes} min`
}

export function InterviewList({ vacancyId, vacancySummary }: InterviewListProps) {
  const t = useTranslations("RecruiterPortal.interviews")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createInitialCandidateProfileId, setCreateInitialCandidateProfileId] =
    useState<string | null>(null)
  const [detailInterviewId, setDetailInterviewId] = useState<string | null>(null)
  const [notesInterviewId, setNotesInterviewId] = useState<string | null>(null)
  const [technicalSheetProfileId, setTechnicalSheetProfileId] = useState<
    string | null
  >(null)

  const applicantLabelByProfileId = useMemo(() => {
    const m = new Map<string, string>()
    vacancySummary.applicantOptions.forEach((o) => {
      m.set(o.candidateProfileId, o.label)
    })
    return m
  }, [vacancySummary.applicantOptions])

  const vacancyTitle = vacancySummary.title
  const [items, setItems] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draftStatus, setDraftStatus] = useState<"" | InterviewStatus>("")
  const [draftFrom, setDraftFrom] = useState("")
  const [draftTo, setDraftTo] = useState("")
  const [applied, setApplied] = useState<{
    status: "" | InterviewStatus
    from: string
    to: string
  }>({ status: "", from: "", to: "" })
  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success" as "success" | "error" | "info",
    message: "",
  })

  const appliedQuery = useMemo((): ListInterviewsQuery => {
    const q: ListInterviewsQuery = {}
    if (applied.status) q.status = applied.status
    if (applied.from.trim()) {
      const d = new Date(applied.from)
      if (!Number.isNaN(d.getTime())) q.fromUtc = d.toISOString()
    }
    if (applied.to.trim()) {
      const d = new Date(applied.to)
      if (!Number.isNaN(d.getTime())) q.toUtc = d.toISOString()
    }
    return q
  }, [applied])

  const load = useCallback(async () => {
    if (!vacancyId) return
    setLoading(true)
    setError(null)
    try {
      const list = await getInterviewsByVacancy(vacancyId, appliedQuery)
      setItems(list)
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : 0
      setError(getInterviewHttpErrorMessage(status ?? 0, err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [vacancyId, appliedQuery])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (searchParams.get("nueva") !== "1") return
    const cand = searchParams.get("candidato")?.trim()
    setCreateInitialCandidateProfileId(cand && cand !== "" ? cand : null)
    setIsCreateOpen(true)
    router.replace(pathname, { scroll: false })
  }, [searchParams, router, pathname])

  const handleOpenCreate = () => {
    setCreateInitialCandidateProfileId(null)
    setIsCreateOpen(true)
  }

  const handleCloseCreate = () => {
    setIsCreateOpen(false)
    setCreateInitialCandidateProfileId(null)
  }

  const handleCloseDetail = () => {
    setDetailInterviewId(null)
  }

  const handleCreatedInterview = () => {
    setSnackbar({
      open: true,
      variant: "success",
      message: t("toasts.created"),
    })
    load().catch(() => {})
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    setDraftStatus(v === "" ? "" : (v as InterviewStatus))
  }

  const handleApplyFilters = () => {
    setApplied({
      status: draftStatus,
      from: draftFrom,
      to: draftTo,
    })
  }

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PortalPageHeader
        title={t("page.title")}
        description={
          vacancySummary.loading
            ? t("page.descriptionLoading")
            : vacancyTitle?.trim()
              ? t("page.descriptionWithVacancy", { title: vacancyTitle.trim() })
              : vacancySummary.error
                ? t("page.descriptionLoadError")
                : t("page.descriptionDefault")
        }
        actions={
          <>
            <Link
              href={`/portal-rrhh/vacantes/${encodeURIComponent(vacancyId)}/resultados`}
              className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              data-testid="interviews-prep-drawer-open"
              aria-label={t("actions.reviewCandidatesAria")}
            >
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              {t("actions.reviewCandidates")}
            </Link>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex w-fit items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              data-testid="interviews-new-button"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              {t("actions.newInterview")}
            </button>
          </>
        }
      />

      <section
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
        aria-label={t("filters.regionLabel")}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex min-w-[200px] flex-col gap-1.5">
            <label
              htmlFor="interview-filter-status"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.status")}
            </label>
            <select
              id="interview-filter-status"
              value={draftStatus}
              onChange={handleStatusChange}
              className="h-10 rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple"
            >
              {STATUS_FILTER_VALUES.map((value) => (
                <option key={value || "all"} value={value}>
                  {value === ""
                    ? t("filters.allStatuses")
                    : getInterviewStatusLabel(value, t)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-[220px] flex-col gap-1.5">
            <span
              id="interview-filter-from-label"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.from")}
            </span>
            <InterviewSingleDatetimeRow
              value={draftFrom}
              onChange={setDraftFrom}
              ariaLabelledBy="interview-filter-from-label"
            />
          </div>
          <div className="flex min-w-[220px] flex-col gap-1.5">
            <span
              id="interview-filter-to-label"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("filters.to")}
            </span>
            <InterviewSingleDatetimeRow
              value={draftTo}
              onChange={setDraftTo}
              ariaLabelledBy="interview-filter-to-label"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyFilters}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple"
          >
            {t("filters.apply")}
          </button>
        </div>
        <p className="font-sans text-xs text-muted-foreground">
          {t("filters.timezoneHelper")}
        </p>
      </section>

      <section aria-label={t("list.regionLabel")}>
        {loading ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16"
            data-testid="interviews-loading"
          >
            <Loader2
              className="h-8 w-8 animate-spin text-vo-purple"
              aria-hidden
            />
            <p className="font-sans text-sm text-muted-foreground">
              {t("loadingStates.loadingInterviews")}
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16">
            <p className="font-sans text-sm text-destructive" role="alert">
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                load().catch(() => {})
              }}
              className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white hover:bg-vo-purple-hover"
            >
              {t("actions.retry")}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-16">
            <Calendar className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="font-sans text-sm text-muted-foreground">
              {t("emptyStates.noInterviews")}
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white hover:bg-vo-purple-hover"
              data-testid="interviews-first-create-button"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t("actions.createFirst")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[880px] border-collapse text-left font-sans text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                    {t("list.table.dateTime")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                    {t("list.table.candidate")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                    {t("list.table.type")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                    {t("list.table.duration")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                    {t("list.table.interviewer")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                    {t("list.table.status")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                    {t("list.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {formatInterviewLocalDateTime(row.scheduledAtUtc)}
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-foreground" title={formatCandidateLabel(row.candidateProfileId, applicantLabelByProfileId, t)}>
                      {formatCandidateLabel(
                        row.candidateProfileId,
                        applicantLabelByProfileId,
                        t
                      )}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-muted-foreground">
                      {row.interviewTypeLabel ?? row.interviewType ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                      {formatDurationCell(row.durationMinutes)}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-muted-foreground">
                      {row.interviewerName?.trim() ? row.interviewerName : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <InterviewStatusBadge
                        status={row.status}
                        label={row.statusDisplayName}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <button
                          type="button"
                          onClick={() => setDetailInterviewId(row.id)}
                          className="font-medium text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded-sm"
                          data-testid={`interview-open-detail-${row.id}`}
                        >
                          {t("actions.manage")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotesInterviewId(row.id)}
                          className="font-medium text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded-sm"
                          data-testid={`interview-open-notes-${row.id}`}
                        >
                          {t("actions.notes")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setTechnicalSheetProfileId(row.candidateProfileId)
                          }
                          className="inline-flex items-center gap-1 font-medium text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded-sm"
                          aria-label={technicalSheetMessages.viewSheet}
                          data-testid={`interview-open-technical-sheet-${row.id}`}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {t("actions.technicalSheet")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <InterviewCreateModal
        isOpen={isCreateOpen}
        onClose={handleCloseCreate}
        vacancyId={vacancyId}
        onCreated={handleCreatedInterview}
        initialCandidateProfileId={createInitialCandidateProfileId}
      />

      <InterviewDetailModal
        isOpen={detailInterviewId != null}
        onClose={handleCloseDetail}
        interviewId={detailInterviewId}
        vacancyIdFromQuery={vacancyId}
        onSaved={() => {
          load().catch(() => {})
          setSnackbar({
            open: true,
            variant: "success",
            message: t("toasts.saved"),
          })
        }}
        onDeleted={(id) => {
          setItems((prev) => prev.filter((i) => i.id !== id))
          setDetailInterviewId(null)
          setSnackbar({
            open: true,
            variant: "success",
            message: t("toasts.deleted"),
          })
        }}
      />

      {technicalSheetProfileId ? (
        <TechnicalSheetModal
          isOpen={technicalSheetProfileId != null}
          onClose={() => setTechnicalSheetProfileId(null)}
          vacancyId={vacancyId}
          candidateProfileId={technicalSheetProfileId}
          vacancyTitle={vacancyTitle}
          candidateLabel={formatCandidateLabel(
            technicalSheetProfileId,
            applicantLabelByProfileId,
            t
          )}
        />
      ) : null}

      <InterviewNotesModal
        isOpen={notesInterviewId != null}
        onClose={() => setNotesInterviewId(null)}
        interviewId={notesInterviewId}
        initialNotes={
          notesInterviewId
            ? items.find((i) => i.id === notesInterviewId)?.notes ?? null
            : null
        }
        contextLine={
          notesInterviewId
            ? (() => {
                const r = items.find((i) => i.id === notesInterviewId)
                if (!r) return null
                return `${formatCandidateLabel(r.candidateProfileId, applicantLabelByProfileId, t)} · ${formatInterviewLocalDateTime(r.scheduledAtUtc)}`
              })()
            : null
        }
        onSaved={() => {
          load().catch(() => {})
          setSnackbar({
            open: true,
            variant: "success",
            message: t("toasts.notesSaved"),
          })
        }}
      />

      <Snackbar
        open={snackbar.open}
        onClose={handleCloseSnackbar}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </div>
  )
}
