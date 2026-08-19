"use client"

import type { ChangeEvent } from "react"
import { Button } from "@/components/ui/Button"
import { QUERY_PAGE_SIZE_OPTIONS } from "@/lib/api/query-paging"

interface ListPaginationBarLabels {
  perPage: string
  pageSizeAria: string
  regionAria: string
  summary: string
  prev: string
  next: string
  count: string
}

interface ListPaginationBarProps {
  page: number
  pageSize: number
  totalCount: number
  loading?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  labels: ListPaginationBarLabels
}

export function ListPaginationBar({
  page,
  pageSize,
  totalCount,
  loading = false,
  onPageChange,
  onPageSizeChange,
  labels,
}: ListPaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1)

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onPageSizeChange(Number(event.target.value))
  }

  const handlePrev = () => {
    onPageChange(Math.max(1, page - 1))
  }

  const handleNext = () => {
    onPageChange(Math.min(totalPages, page + 1))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-sm text-muted-foreground">{labels.count}</p>
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-muted-foreground">
            {labels.perPage}
          </span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="h-9 rounded-md border border-border bg-card px-2 text-sm"
            aria-label={labels.pageSizeAria}
            disabled={loading}
          >
            {QUERY_PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <nav
        className="flex flex-wrap items-center justify-between gap-3"
        aria-label={labels.regionAria}
      >
        <p className="font-sans text-sm text-muted-foreground">{labels.summary}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-3"
            disabled={page <= 1 || loading}
            onClick={handlePrev}
          >
            {labels.prev}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 px-3"
            disabled={page >= totalPages || loading}
            onClick={handleNext}
          >
            {labels.next}
          </Button>
        </div>
      </nav>
    </div>
  )
}
