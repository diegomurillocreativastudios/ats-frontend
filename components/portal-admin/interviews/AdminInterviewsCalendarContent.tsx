"use client"

import { useCallback, useEffect, useState } from "react"
import { Calendar, Loader2 } from "lucide-react"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
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
    <div className="flex min-w-0 flex-col gap-6 p-4 md:p-8">
      <PortalPageHeader
        title="Calendario de entrevistas"
        description="Vista general de todas las entrevistas agendadas. Los horarios se muestran en tu zona horaria; el API opera en UTC."
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
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-20"
          data-testid="admin-calendar-loading"
        >
          <Loader2 className="h-8 w-8 animate-spin text-vo-purple" aria-hidden />
          <p className="font-sans text-sm text-muted-foreground">
            Cargando entrevistas…
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16">
          <p className="font-sans text-sm text-destructive" role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white hover:bg-vo-purple-hover"
          >
            Reintentar
          </button>
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-16">
          <Calendar className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="font-sans text-sm text-muted-foreground">
            No hay entrevistas en este rango con los filtros actuales.
          </p>
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
    </div>
  )
}
