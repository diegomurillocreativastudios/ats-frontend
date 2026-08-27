"use client"

import { useCallback, useEffect, useState } from "react"
import { Calendar } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  ADMIN_SURFACE_CLASS,
  AdminEmptyState,
  AdminErrorPanel,
  AdminLoadingState,
  AdminPageFrame,
} from "@/components/portal-admin/admin-page-chrome"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { Button } from "@/components/ui/Button"
import { CalendarFilters } from "@/components/portal-admin/interviews/calendar-filters"
import { CalendarKpis } from "@/components/portal-admin/interviews/calendar-kpis"
import { CalendarToolbar } from "@/components/portal-admin/interviews/calendar-toolbar"
import { EventDetailModal } from "@/components/portal-admin/interviews/event-detail-modal"
import { ViewAgenda } from "@/components/portal-admin/interviews/views/view-agenda"
import { ViewDay } from "@/components/portal-admin/interviews/views/view-day"
import { ViewMonth } from "@/components/portal-admin/interviews/views/view-month"
import { ViewWeek } from "@/components/portal-admin/interviews/views/view-week"
import { ViewYear } from "@/components/portal-admin/interviews/views/view-year"
import type { AdminCalendarEvent } from "@/lib/api/admin-interviews-calendar"
import type { CalendarViewMode } from "@/lib/admin/interviews-calendar-layout"
import { useAdminInterviewsCalendar } from "@/hooks/use-admin-interviews-calendar"

function useIsMobileAgendaDefault(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return isMobile
}

export function AdminInterviewsCalendarContent() {
  const t = useTranslations("AdminPortal.interviews.calendar")
  const isMobile = useIsMobileAgendaDefault()
  const [view, setView] = useState<CalendarViewMode>("month")
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [selectedEvent, setSelectedEvent] = useState<AdminCalendarEvent | null>(
    null
  )
  const [detailOpen, setDetailOpen] = useState(false)

  const activeView: CalendarViewMode = isMobile ? "agenda" : view

  const {
    filters,
    updateFilters,
    resetFilters,
    visibleEvents,
    loading,
    error,
    reload,
  } = useAdminInterviewsCalendar(activeView, anchorDate)

  const handleSelectEvent = useCallback((event: AdminCalendarEvent) => {
    setSelectedEvent(event)
    setDetailOpen(true)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false)
    setSelectedEvent(null)
  }, [])

  const handleToday = useCallback(() => {
    setAnchorDate(new Date())
  }, [])

  const handleDayFromMonth = useCallback((day: Date) => {
    setAnchorDate(day)
    if (!isMobile) setView("day")
  }, [isMobile])

  const handleDayFromYear = useCallback((day: Date) => {
    setAnchorDate(day)
    if (!isMobile) setView("day")
  }, [isMobile])

  return (
    <AdminPageFrame>
      <PortalPageHeader
        title={t("page.title")}
        description={t("page.description")}
        layout="split"
        contentClassName="max-w-4xl"
      />

      <CalendarFilters
        filters={filters}
        onChange={updateFilters}
        onReset={resetFilters}
        onReload={() => void reload()}
        loading={loading}
      />

      <CalendarToolbar
        view={activeView}
        anchorDate={anchorDate}
        onViewChange={setView}
        onAnchorChange={setAnchorDate}
        onToday={handleToday}
        hideViewSwitcher={isMobile}
      />

      <CalendarKpis events={visibleEvents} />

      {loading ? (
        <div className={ADMIN_SURFACE_CLASS}>
          <AdminLoadingState
            label={t("loadingStates.loading")}
            className="py-20"
            testId="admin-calendar-loading"
          />
        </div>
      ) : error ? (
        <AdminErrorPanel
          message={error}
          onRetry={() => void reload()}
          retryLabel={t("actions.retry")}
        />
      ) : visibleEvents.length === 0 ? (
        <div className={`${ADMIN_SURFACE_CLASS} border-dashed bg-muted/30 shadow-none`}>
          <AdminEmptyState
            icon={Calendar}
            title={t("emptyStates.noEvents")}
          />
        </div>
      ) : (
        <>
          {activeView === "month" ? (
            <ViewMonth
              anchorDate={anchorDate}
              events={visibleEvents}
              onSelectEvent={handleSelectEvent}
              onDayClick={handleDayFromMonth}
            />
          ) : null}
          {activeView === "week" ? (
            <ViewWeek
              anchorDate={anchorDate}
              events={visibleEvents}
              onSelectEvent={handleSelectEvent}
            />
          ) : null}
          {activeView === "day" ? (
            <ViewDay
              anchorDate={anchorDate}
              events={visibleEvents}
              onSelectEvent={handleSelectEvent}
            />
          ) : null}
          {activeView === "year" ? (
            <ViewYear
              anchorDate={anchorDate}
              events={visibleEvents}
              onSelectDay={handleDayFromYear}
            />
          ) : null}
          {activeView === "agenda" ? (
            <ViewAgenda events={visibleEvents} onSelectEvent={handleSelectEvent} />
          ) : null}
        </>
      )}

      <EventDetailModal
        event={selectedEvent}
        isOpen={detailOpen}
        onClose={handleCloseDetail}
      />
    </AdminPageFrame>
  )
}
