"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useFormatter, useTranslations } from "next-intl"
import { ArrowLeft, ArrowUpRight, Hourglass } from "lucide-react"
import { RrhhPortalShell } from "@/components/rrhh/rrhh-portal-shell"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { ListPaginationBar } from "@/components/ui/list-pagination-bar"
import {
  fetchRecruiterReminderDetail,
  type ReminderDetailQuery,
} from "@/lib/api/recruiter-dashboard"
import { getApiErrorMessage } from "@/lib/api-error"
import { QUERY_PAGE_SIZE_MAX } from "@/lib/api/query-paging"
import { getInterviewStatusLabel } from "@/lib/interviews/interview-status-labels"
import { getVacancyStatusLabel } from "@/lib/vacancies/vacancy-status-labels"
import {
  RECRUITER_DASHBOARD_LINKS,
  isDashboardReminderKey,
  isInactiveVacancyStatusToken,
  isWithheldDashboardReminder,
  reminderDateColumnKey,
  reminderIncludesCandidate,
  reminderIncludesTime,
  reminderRowActionKey,
  reminderStatusKind,
  reminderWindowDays,
  resolveReminderRowHref,
  type DashboardReminderKey,
  type ReminderDetailModel,
  type ReminderRowActionKey,
} from "@/lib/rrhh/recruiter-dashboard"

const DATE_COLUMN_LABEL = {
  dateTime: "columns.dateTime",
  since: "columns.since",
  presentationDue: "columns.presentationDue",
  lastActivity: "columns.lastActivity",
  date: "columns.dueAt",
} as const

const ROW_ACTION_LABEL: Record<ReminderRowActionKey, "rowActions.interview" | "rowActions.vacancy" | "rowActions.sheet"> = {
  interview: "rowActions.interview",
  vacancy: "rowActions.vacancy",
  sheet: "rowActions.sheet",
}

const ROW_ACTION_ARIA: Record<
  ReminderRowActionKey,
  "rowActions.interviewAria" | "rowActions.vacancyAria" | "rowActions.sheetAria"
> = {
  interview: "rowActions.interviewAria",
  vacancy: "rowActions.vacancyAria",
  sheet: "rowActions.sheetAria",
}

interface ReminderDetailViewProps {
  rawKey: string
}

const DEFAULT_PAGE_SIZE = 50

export function ReminderDetailView({ rawKey }: ReminderDetailViewProps) {
  const t = useTranslations("RecruiterPortal.dashboard")
  const tDetail = useTranslations("RecruiterPortal.dashboard.reminderDetail")

  if (!isDashboardReminderKey(rawKey)) {
    return <InvalidKeyShell />
  }

  if (isWithheldDashboardReminder(rawKey)) {
    return <WithheldReminderShell reminderKey={rawKey} />
  }

  return <KnownReminderDetail reminderKey={rawKey} t={t} tDetail={tDetail} />
}

function WithheldReminderShell({ reminderKey }: { reminderKey: DashboardReminderKey }) {
  const t = useTranslations("RecruiterPortal.dashboard")
  const tDetail = useTranslations("RecruiterPortal.dashboard.reminderDetail")
  const label = t(`reminders.${reminderKey}.title`)

  return (
    <RrhhPortalShell
      breadcrumbLabel={label}
      breadcrumbTrail={[
        { label: t("breadcrumb"), href: RECRUITER_DASHBOARD_LINKS.home },
        { label },
      ]}
    >
      <div className="flex min-w-0 flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          title={tDetail("title", { label })}
          description={tDetail("description")}
          layout="split"
          actions={
            <Link
              href={RECRUITER_DASHBOARD_LINKS.home}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {tDetail("backToDashboard")}
            </Link>
          }
        />
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-4 py-16 text-center">
          <Hourglass className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="font-sans text-sm text-muted-foreground">{tDetail("unavailable")}</p>
        </div>
      </div>
    </RrhhPortalShell>
  )
}

function InvalidKeyShell() {
  const tDetail = useTranslations("RecruiterPortal.dashboard.reminderDetail")
  return (
    <RrhhPortalShell breadcrumbLabel={tDetail("invalidKey.breadcrumb")}>
      <div className="flex min-w-0 flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          title={tDetail("invalidKey.title")}
          description={tDetail("invalidKey.description")}
        />
        <Link
          href={RECRUITER_DASHBOARD_LINKS.home}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-vo-purple px-4 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {tDetail("backToDashboard")}
        </Link>
      </div>
    </RrhhPortalShell>
  )
}

interface KnownReminderDetailProps {
  reminderKey: DashboardReminderKey
  t: ReturnType<typeof useTranslations<"RecruiterPortal.dashboard">>
  tDetail: ReturnType<typeof useTranslations<"RecruiterPortal.dashboard.reminderDetail">>
}

function KnownReminderDetail({ reminderKey, t, tDetail }: KnownReminderDetailProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [data, setData] = useState<ReminderDetailModel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (nextPage: number, nextPageSize: number) => {
      setIsLoading(true)
      setError(null)
      const query: ReminderDetailQuery = {
        page: nextPage,
        pageSize: Math.min(nextPageSize, QUERY_PAGE_SIZE_MAX),
      }
      try {
        const result = await fetchRecruiterReminderDetail(reminderKey, query)
        setData(result)
      } catch (err: unknown) {
        setError(getApiErrorMessage(err))
        setData(null)
      } finally {
        setIsLoading(false)
      }
    },
    [reminderKey]
  )

  useEffect(() => {
    void load(page, pageSize)
  }, [load, page, pageSize])

  const label = t(`reminders.${reminderKey}.title`)
  const title = tDetail("title", { label })
  const windowDays = reminderWindowDays(reminderKey, data?.context ?? null)

  const handlePageChange = (next: number) => setPage(next)
  const handlePageSizeChange = (next: number) => {
    setPageSize(next)
    setPage(1)
  }

  const totalCount = data?.totalCount ?? 0

  const paginationLabels = {
    perPage: tDetail("pagination.perPage"),
    pageSizeAria: tDetail("pagination.pageSizeAria"),
    regionAria: tDetail("pagination.regionAria"),
    summary: tDetail("pagination.summary", {
      page,
      total: Math.max(1, Math.ceil(totalCount / pageSize) || 1),
    }),
    prev: tDetail("pagination.prev"),
    next: tDetail("pagination.next"),
    count: tDetail("pagination.count", { count: totalCount }),
  }

  const showPagination = Boolean(
    data &&
      (data.sourceState === "ready" || data.sourceState === "partial") &&
      !error
  )

  const partialNote = partialNoteText(data, t, tDetail)

  return (
    <RrhhPortalShell
      breadcrumbLabel={label}
      breadcrumbTrail={[
        { label: t("breadcrumb"), href: RECRUITER_DASHBOARD_LINKS.home },
        { label },
      ]}
      lockMainScroll
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <section className="shrink-0 px-4 pt-4 md:px-6 md:pt-6 lg:px-8">
          <PortalPageHeader
            title={title}
            description={tDetail("description")}
            layout="split"
            actions={
              <Link
                href={RECRUITER_DASHBOARD_LINKS.home}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-4 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {tDetail("backToDashboard")}
              </Link>
            }
          />
          {windowDays != null ? (
            <p className="mt-3 font-sans text-sm text-muted-foreground">
              {reminderWindowText(reminderKey, windowDays, tDetail)}
            </p>
          ) : null}
        </section>
        <section className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2 md:px-6 lg:px-8">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            {partialNote ? (
              <p className="font-sans text-sm text-muted-foreground">{partialNote}</p>
            ) : null}
            <DetailBody
              reminderKey={reminderKey}
              data={data}
              isLoading={isLoading}
              error={error}
              tDetail={tDetail}
            />
            {showPagination ? (
              <div className="shrink-0">
                <ListPaginationBar
                  page={page}
                  pageSize={pageSize}
                  totalCount={totalCount}
                  loading={isLoading}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  labels={paginationLabels}
                />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </RrhhPortalShell>
  )
}

function reminderWindowText(
  key: DashboardReminderKey,
  days: number,
  tDetail: ReturnType<typeof useTranslations<"RecruiterPortal.dashboard.reminderDetail">>
): string | null {
  if (
    key !== "upcomingInterviews" &&
    key !== "staleCandidates" &&
    key !== "inactiveVacancies"
  ) {
    return null
  }
  return tDetail(`window.${key}`, { days })
}

interface DetailBodyProps {
  reminderKey: DashboardReminderKey
  data: ReminderDetailModel | null
  isLoading: boolean
  error: string | null
  tDetail: ReturnType<typeof useTranslations<"RecruiterPortal.dashboard.reminderDetail">>
}

function DetailBody({ reminderKey, data, isLoading, error, tDetail }: DetailBodyProps) {
  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-16 text-center">
        <p
          role="alert"
          className="font-sans text-sm text-destructive"
        >
          {tDetail("error")}
        </p>
      </div>
    )
  }

  if (isLoading && !data) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent"
          aria-hidden
        />
        <p className="font-sans text-sm text-muted-foreground" role="status">
          {tDetail("loading")}
        </p>
      </div>
    )
  }

  if (!data) return null

  if (data.sourceState === "unavailable") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-4 py-16 text-center">
        <Hourglass className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="font-sans text-sm text-muted-foreground">
          {tDetail("unavailable")}
        </p>
      </div>
    )
  }

  if (data.items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
        <p className="font-sans text-sm text-muted-foreground">{tDetail("empty")}</p>
      </div>
    )
  }

  return <ReminderDetailTable reminderKey={reminderKey} data={data} tDetail={tDetail} />
}

interface ReminderDetailTableProps {
  reminderKey: DashboardReminderKey
  data: ReminderDetailModel
  tDetail: ReturnType<typeof useTranslations<"RecruiterPortal.dashboard.reminderDetail">>
}

function ReminderDetailTable({ reminderKey, data, tDetail }: ReminderDetailTableProps) {
  const format = useFormatter()
  const tInterviews = useTranslations("RecruiterPortal.interviews")
  const tVacancies = useTranslations("RecruiterPortal.vacancies")
  const dateColumn = reminderDateColumnKey(reminderKey)
  const dateHeader =
    dateColumn === "date" ? tDetail("columns.dueAt") : tDetail(DATE_COLUMN_LABEL[dateColumn])
  const actionKey = reminderRowActionKey(reminderKey)
  const actionLabel = actionKey ? tDetail(ROW_ACTION_LABEL[actionKey]) : null

  const rows = useMemo(
    () =>
      data.items.map((item) => ({
        item,
        href: resolveReminderRowHref(reminderKey, item),
        dueText: item.dueAt
          ? format.dateTime(new Date(item.dueAt), {
              dateStyle: "medium",
              timeStyle: reminderIncludesTime(reminderKey) ? "short" : undefined,
            })
          : null,
        statusText: formatReminderStatus(
          reminderKey,
          item.statusLabel,
          tDetail,
          tInterviews,
          tVacancies
        ),
        rowLabel: item.candidateName ?? item.vacancyTitle ?? item.id,
      })),
    [data.items, reminderKey, format, tDetail, tInterviews, tVacancies]
  )

  const dash = "—"
  const showCandidate = reminderIncludesCandidate(reminderKey)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <div className="hidden md:block">
          <table className="w-full border-separate border-spacing-0 font-sans">
          <thead>
            <tr>
              {showCandidate ? (
                <TableHead>{tDetail("columns.candidate")}</TableHead>
              ) : null}
              <TableHead>{tDetail("columns.vacancy")}</TableHead>
              <TableHead>{tDetail("columns.company")}</TableHead>
              <TableHead>{dateHeader}</TableHead>
              <TableHead>{tDetail("columns.status")}</TableHead>
              <TableHead className="text-right">
                {tDetail("columns.actions")}
              </TableHead>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, href, dueText, statusText, rowLabel }) => (
              <tr key={item.id}>
                {showCandidate ? (
                  <TableCell>{item.candidateName ?? dash}</TableCell>
                ) : null}
                <TableCell>{item.vacancyTitle ?? dash}</TableCell>
                <TableCell>{item.companyName ?? dash}</TableCell>
                <TableCell>{dueText ?? dash}</TableCell>
                <TableCell>{statusText ?? dash}</TableCell>
                <TableCell className="text-right">
                  {href && actionKey && actionLabel ? (
                    <RowLink
                      href={href}
                      label={actionLabel}
                      ariaLabel={tDetail(ROW_ACTION_ARIA[actionKey], { label: rowLabel })}
                    />
                  ) : (
                    <span className="font-sans text-xs text-muted-foreground">
                      {dash}
                    </span>
                  )}
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col divide-y divide-border md:hidden">
        {rows.map(({ item, href, dueText, statusText, rowLabel }) => (
          <li key={item.id} className="flex flex-col gap-2 p-4">
            <p className="font-sans text-sm font-semibold text-foreground">
              {item.candidateName ?? item.vacancyTitle ?? dash}
            </p>
            {item.vacancyTitle && item.candidateName ? (
              <p className="font-sans text-xs text-muted-foreground">
                {item.vacancyTitle}
              </p>
            ) : null}
            {item.companyName ? (
              <p className="font-sans text-xs text-muted-foreground">
                {item.companyName}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 font-sans text-xs text-muted-foreground">
              {dueText ? (
                <span>
                  {dateHeader}: {dueText}
                </span>
              ) : null}
              {statusText ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-foreground">
                  {statusText}
                </span>
              ) : null}
            </div>
            {href && actionKey && actionLabel ? (
              <Link
                href={href}
                aria-label={tDetail(ROW_ACTION_ARIA[actionKey], { label: rowLabel })}
                className="mt-1 inline-flex min-h-11 w-fit items-center gap-1 rounded-md bg-muted px-3 font-sans text-sm font-medium text-foreground hover:bg-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
              >
                {actionLabel}
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      </div>
    </div>
  )
}

function RowLink({
  href,
  label,
  ariaLabel,
}: {
  href: string
  label: string
  ariaLabel: string
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-md px-3 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
    >
      {label}
      <ArrowUpRight className="h-4 w-4" aria-hidden />
    </Link>
  )
}

function partialNoteText(
  data: ReminderDetailModel | null,
  t: ReturnType<typeof useTranslations<"RecruiterPortal.dashboard">>,
  tDetail: ReturnType<typeof useTranslations<"RecruiterPortal.dashboard.reminderDetail">>
): string | null {
  if (!data || data.sourceState !== "partial") return null
  const analyzed = data.context?.analyzed
  const total = data.context?.total
  if (analyzed != null && total != null) {
    return t("partialNote", { analyzed, total })
  }
  return tDetail("partialGeneric")
}

function formatReminderStatus(
  key: DashboardReminderKey,
  raw: string | null,
  tDetail: ReturnType<typeof useTranslations<"RecruiterPortal.dashboard.reminderDetail">>,
  tInterviews: ReturnType<typeof useTranslations<"RecruiterPortal.interviews">>,
  tVacancies: ReturnType<typeof useTranslations<"RecruiterPortal.vacancies">>
): string | null {
  if (!raw) return null
  if (key === "inactiveVacancies" && isInactiveVacancyStatusToken(raw)) {
    return tDetail("inactiveStatus")
  }
  const kind = reminderStatusKind(key)
  if (kind === "interview") return getInterviewStatusLabel(raw, tInterviews)
  if (kind === "vacancy") return getVacancyStatusLabel(raw, tVacancies)
  return raw
}

function TableHead({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      scope="col"
      className={`sticky top-0 z-10 border-b border-border bg-muted px-4 py-3 text-left font-sans text-[13px] font-semibold text-foreground ${className ?? ""}`}
    >
      {children}
    </th>
  )
}

function TableCell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td
      className={`border-b border-border px-4 py-3 align-middle font-sans text-sm text-foreground ${className ?? ""}`}
    >
      {children}
    </td>
  )
}
