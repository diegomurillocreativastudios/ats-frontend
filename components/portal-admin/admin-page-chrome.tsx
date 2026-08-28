import type {
  ChangeEvent,
  HTMLAttributes,
  ReactNode,
} from "react"
import { Loader2, Search, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"

function joinAdminClasses(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ")
}

export const ADMIN_PAGE_FRAME_CLASS =
  "flex min-w-0 flex-col gap-6 px-4 py-6 md:px-8"

export const ADMIN_SURFACE_CLASS =
  "min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm"

export const ADMIN_TABLE_WRAP_CLASS =
  "overflow-x-auto rounded-xl border border-border bg-card shadow-sm"

export const ADMIN_TABLE_CLASS =
  "w-full border-collapse text-left font-sans text-sm"

export const ADMIN_THEAD_CLASS = "border-b border-border bg-muted/50"

export const ADMIN_TH_CLASS = "px-4 py-3 font-medium text-foreground"

export const ADMIN_TD_CLASS = "px-4 py-3 align-middle"

export const ADMIN_TR_CLASS =
  "border-b border-border last:border-0 transition-colors hover:bg-ats-terracotta-soft/40"

export const ADMIN_SEARCH_INPUT_CLASS =
  "h-10 w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-vo-purple"

interface AdminPageFrameProps {
  children: ReactNode
  labelledBy?: string
  ariaLabel?: string
  className?: string
}

export function AdminPageFrame({
  children,
  labelledBy,
  ariaLabel,
  className,
}: AdminPageFrameProps) {
  return (
    <div
      className={joinAdminClasses(ADMIN_PAGE_FRAME_CLASS, className)}
      aria-labelledby={labelledBy}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}

interface AdminSurfaceProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  className?: string
}

export function AdminSurface({
  children,
  className,
  ...rest
}: AdminSurfaceProps) {
  return (
    <section
      className={joinAdminClasses(ADMIN_SURFACE_CLASS, className)}
      {...rest}
    >
      {children}
    </section>
  )
}

interface AdminSummaryBarProps {
  children: ReactNode
  ariaLabel?: string
  className?: string
}

export function AdminSummaryBar({
  children,
  ariaLabel,
  className,
}: AdminSummaryBarProps) {
  return (
    <AdminSurface className={joinAdminClasses("p-4", className)} aria-label={ariaLabel}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {children}
      </div>
    </AdminSurface>
  )
}

export function AdminCountPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 font-sans text-sm text-foreground">
      {children}
    </span>
  )
}

interface AdminSearchFieldProps {
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  ariaLabel: string
  id?: string
  className?: string
}

export function AdminSearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  id,
  className,
}: AdminSearchFieldProps) {
  return (
    <div className={joinAdminClasses("relative w-full min-w-[12rem]", className ?? "max-w-sm")}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={ADMIN_SEARCH_INPUT_CLASS}
      />
    </div>
  )
}

interface AdminDataTableProps {
  children: ReactNode
  ariaLabel?: string
  minWidthClassName?: string
}

export function AdminDataTable({
  children,
  ariaLabel,
  minWidthClassName = "min-w-[720px]",
}: AdminDataTableProps) {
  return (
    <div className={ADMIN_TABLE_WRAP_CLASS}>
      <table
        className={joinAdminClasses(ADMIN_TABLE_CLASS, minWidthClassName)}
        aria-label={ariaLabel}
      >
        {children}
      </table>
    </div>
  )
}

interface AdminEmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: AdminEmptyStateProps) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-vo-purple/10">
        <Icon className="h-8 w-8 text-vo-purple" aria-hidden />
      </div>
      <div className="space-y-2">
        <h2 className="font-sans text-lg font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="max-w-lg font-sans text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

interface AdminErrorPanelProps {
  message: string
  onRetry?: () => void
  retryLabel?: string
  ariaLabel?: string
}

export function AdminErrorPanel({
  message,
  onRetry,
  retryLabel,
  ariaLabel,
}: AdminErrorPanelProps) {
  return (
    <section
      className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"
      aria-label={ariaLabel}
    >
      <p className="font-sans text-sm text-destructive" role="alert">
        {message}
      </p>
      {onRetry && retryLabel ? (
        <div className="mt-4">
          <Button type="button" variant="primary" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </section>
  )
}

interface AdminLoadingStateProps {
  label?: string
  className?: string
  testId?: string
}

export function AdminLoadingState({
  label,
  className,
  testId,
}: AdminLoadingStateProps) {
  return (
    <div
      className={joinAdminClasses(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className
      )}
      data-testid={testId}
    >
      <Loader2 className="h-8 w-8 animate-spin text-vo-purple" aria-hidden />
      {label ? (
        <p className="font-sans text-sm text-muted-foreground">{label}</p>
      ) : null}
    </div>
  )
}

interface AdminTableSkeletonProps {
  rows?: number
  columns?: number
}

export function AdminTableSkeleton({
  rows = 5,
  columns = 3,
}: AdminTableSkeletonProps) {
  return (
    <div className="space-y-3 p-5" aria-hidden>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid animate-pulse gap-3 rounded-lg border border-border/60 bg-muted/30 p-4"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-5 rounded bg-muted" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function AdminRowActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}

type AdminStatusTone = "active" | "inactive" | "brand" | "danger"

const STATUS_PILL_CLASS: Record<AdminStatusTone, string> = {
  active:
    "inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400",
  inactive:
    "inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
  brand:
    "inline-flex items-center rounded-full bg-vo-purple/10 px-2 py-0.5 text-xs font-medium text-vo-purple",
  danger:
    "inline-flex rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive",
}

export function AdminStatusPill({
  tone,
  children,
}: {
  tone: AdminStatusTone
  children: ReactNode
}) {
  return <span className={STATUS_PILL_CLASS[tone]}>{children}</span>
}

export function AdminCodePill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-vo-purple/10 px-2.5 py-0.5 text-xs font-medium text-vo-purple">
      {children}
    </span>
  )
}
