"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getAdminCalendarHttpErrorMessage,
  getAdminInterviewsCalendar,
  type AdminCalendarEvent,
  type AdminCalendarQuery,
} from "@/lib/api/admin-interviews-calendar"
import {
  filterEventsInLocalRange,
  getVisibleRangeForView,
  type CalendarViewMode,
} from "@/lib/admin/interviews-calendar-layout"

export interface AdminCalendarFilters {
  companyId: string
  vacancyId: string
  recruiterUserId: string
  interviewStatusId: string
  interviewTypeId: string
  interviewModalityId: string
  includeCancelled: boolean
  search: string
}

export const EMPTY_CALENDAR_FILTERS: AdminCalendarFilters = {
  companyId: "",
  vacancyId: "",
  recruiterUserId: "",
  interviewStatusId: "",
  interviewTypeId: "",
  interviewModalityId: "",
  includeCancelled: false,
  search: "",
}

function applyClientFilters(
  events: AdminCalendarEvent[],
  filters: AdminCalendarFilters
): AdminCalendarEvent[] {
  let list = events
  if (filters.interviewTypeId) {
    list = list.filter((ev) => ev.interviewType?.id === filters.interviewTypeId)
  }
  if (filters.interviewModalityId) {
    list = list.filter(
      (ev) => ev.interviewModality?.id === filters.interviewModalityId
    )
  }
  const q = filters.search.trim().toLowerCase()
  if (q) {
    list = list.filter((ev) => {
      const haystack = [
        ev.candidate.name,
        ev.candidate.email ?? "",
        ev.vacancy.title,
        ev.vacancy.companyName ?? "",
        ev.recruiter.userName,
        ev.recruiter.email ?? "",
        ev.interviewerName ?? "",
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }
  return list
}

export function useAdminInterviewsCalendar(
  view: CalendarViewMode,
  anchorDate: Date
) {
  const [filters, setFilters] = useState<AdminCalendarFilters>(EMPTY_CALENDAR_FILTERS)
  const [rawEvents, setRawEvents] = useState<AdminCalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const serverQuery = useMemo((): AdminCalendarQuery => {
    const q: AdminCalendarQuery = {}
    if (filters.companyId) q.companyId = filters.companyId
    if (filters.vacancyId) q.vacancyId = filters.vacancyId
    if (filters.recruiterUserId) q.recruiterUserId = filters.recruiterUserId
    if (filters.interviewStatusId) q.interviewStatusId = filters.interviewStatusId
    if (filters.includeCancelled) q.includeCancelled = true
    return q
  }, [
    filters.companyId,
    filters.vacancyId,
    filters.recruiterUserId,
    filters.interviewStatusId,
    filters.includeCancelled,
  ])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await getAdminInterviewsCalendar(serverQuery)
      setRawEvents(list)
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : 0
      setError(getAdminCalendarHttpErrorMessage(status ?? 0, err))
      setRawEvents([])
    } finally {
      setLoading(false)
    }
  }, [serverQuery])

  useEffect(() => {
    void load()
  }, [load])

  const filteredEvents = useMemo(
    () => applyClientFilters(rawEvents, filters),
    [rawEvents, filters]
  )

  const visibleRange = useMemo(
    () => getVisibleRangeForView(view, anchorDate),
    [view, anchorDate]
  )

  const visibleEvents = useMemo(
    () =>
      filterEventsInLocalRange(
        filteredEvents,
        visibleRange.start,
        visibleRange.end
      ),
    [filteredEvents, visibleRange]
  )

  const updateFilters = useCallback(
    (patch: Partial<AdminCalendarFilters>) => {
      setFilters((prev) => ({ ...prev, ...patch }))
    },
    []
  )

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_CALENDAR_FILTERS)
  }, [])

  return {
    filters,
    updateFilters,
    resetFilters,
    rawEvents,
    filteredEvents,
    visibleEvents,
    visibleRange,
    loading,
    error,
    reload: load,
  }
}
