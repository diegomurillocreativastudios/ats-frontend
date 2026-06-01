"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { fetchAdminCompaniesList } from "@/lib/api/admin-companies"
import { fetchAdminUsersAllByRole } from "@/lib/api/admin-users"
import {
  fetchRecruiterVacancyOptions,
  type RecruiterVacancyOption,
} from "@/lib/api/admin-interviews-calendar"
import {
  listInterviewModalitiesAdmin,
  listInterviewStatusesAdmin,
  listInterviewTypesAdmin,
} from "@/lib/api/interviews"
import type { AdminCalendarFilters } from "@/hooks/use-admin-interviews-calendar"

export interface CalendarFiltersProps {
  filters: AdminCalendarFilters
  onChange: (patch: Partial<AdminCalendarFilters>) => void
  onReset: () => void
  onReload: () => void
  loading?: boolean
}

export function CalendarFilters({
  filters,
  onChange,
  onReset,
  onReload,
  loading = false,
}: CalendarFiltersProps) {
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [recruitersLoading, setRecruitersLoading] = useState(true)
  const [recruiters, setRecruiters] = useState<{ id: string; label: string }[]>([])
  const [vacanciesLoading, setVacanciesLoading] = useState(true)
  const [vacancies, setVacancies] = useState<RecruiterVacancyOption[]>([])
  const [statusesLoading, setStatusesLoading] = useState(true)
  const [statuses, setStatuses] = useState<{ id: string; label: string }[]>([])
  const [typesLoading, setTypesLoading] = useState(true)
  const [types, setTypes] = useState<{ id: string; label: string }[]>([])
  const [modalitiesLoading, setModalitiesLoading] = useState(true)
  const [modalities, setModalities] = useState<{ id: string; label: string }[]>([])

  useEffect(() => {
    let cancelled = false
    fetchAdminCompaniesList({ page: 1, pageSize: 100 })
      .then((res) => {
        if (cancelled) return
        setCompanies(
          res.items.map((c) => ({ id: c.companyId, name: c.name }))
        )
      })
      .catch(() => {
        if (!cancelled) setCompanies([])
      })
      .finally(() => {
        if (!cancelled) setCompaniesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchAdminUsersAllByRole("Recruiter")
      .then((items) => {
        if (cancelled) return
        setRecruiters(
          items.map((u) => ({
            id: u.id,
            label: u.userName?.trim() ? `${u.userName} · ${u.email}` : u.email,
          }))
        )
      })
      .catch(() => {
        if (!cancelled) setRecruiters([])
      })
      .finally(() => {
        if (!cancelled) setRecruitersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchRecruiterVacancyOptions()
      .then((list) => {
        if (!cancelled) setVacancies(list)
      })
      .catch(() => {
        if (!cancelled) setVacancies([])
      })
      .finally(() => {
        if (!cancelled) setVacanciesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    listInterviewStatusesAdmin()
      .then((list) => {
        if (cancelled) return
        setStatuses(
          list
            .filter((s) => s.isActive)
            .map((s) => ({ id: s.id, label: s.displayName }))
        )
      })
      .catch(() => {
        if (!cancelled) setStatuses([])
      })
      .finally(() => {
        if (!cancelled) setStatusesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    listInterviewTypesAdmin()
      .then((list) => {
        if (cancelled) return
        setTypes(list.map((t) => ({ id: t.id, label: t.name })))
      })
      .catch(() => {
        if (!cancelled) setTypes([])
      })
      .finally(() => {
        if (!cancelled) setTypesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    listInterviewModalitiesAdmin()
      .then((list) => {
        if (cancelled) return
        setModalities(list.map((m) => ({ id: m.id, label: m.displayName })))
      })
      .catch(() => {
        if (!cancelled) setModalities([])
      })
      .finally(() => {
        if (!cancelled) setModalitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const vacancyOptions = useMemo(() => {
    if (!filters.companyId) return vacancies
    return vacancies.filter((v) => v.companyId === filters.companyId)
  }, [vacancies, filters.companyId])

  const selectClass =
    "h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple"

  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      aria-label="Filtros del calendario"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-sans text-sm font-semibold text-foreground">Filtros</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-border px-3 py-1.5 font-sans text-xs font-medium text-foreground hover:bg-muted"
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-sans text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            )}
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cal-filter-company" className="font-sans text-xs font-medium">
            Empresa
          </label>
          <select
            id="cal-filter-company"
            value={filters.companyId}
            onChange={(e) =>
              onChange({ companyId: e.target.value, vacancyId: "" })
            }
            disabled={companiesLoading}
            className={selectClass}
          >
            <option value="">Todas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cal-filter-vacancy" className="font-sans text-xs font-medium">
            Vacante
          </label>
          <select
            id="cal-filter-vacancy"
            value={filters.vacancyId}
            onChange={(e) => onChange({ vacancyId: e.target.value })}
            disabled={vacanciesLoading}
            className={selectClass}
          >
            <option value="">Todas</option>
            {vacancyOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cal-filter-recruiter" className="font-sans text-xs font-medium">
            Reclutador
          </label>
          <select
            id="cal-filter-recruiter"
            value={filters.recruiterUserId}
            onChange={(e) => onChange({ recruiterUserId: e.target.value })}
            disabled={recruitersLoading}
            className={selectClass}
          >
            <option value="">Todos</option>
            {recruiters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cal-filter-status" className="font-sans text-xs font-medium">
            Estado
          </label>
          <select
            id="cal-filter-status"
            value={filters.interviewStatusId}
            onChange={(e) => onChange({ interviewStatusId: e.target.value })}
            disabled={statusesLoading}
            className={selectClass}
          >
            <option value="">Todos</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cal-filter-type" className="font-sans text-xs font-medium">
            Tipo (local)
          </label>
          <select
            id="cal-filter-type"
            value={filters.interviewTypeId}
            onChange={(e) => onChange({ interviewTypeId: e.target.value })}
            disabled={typesLoading}
            className={selectClass}
          >
            <option value="">Todos</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cal-filter-modality" className="font-sans text-xs font-medium">
            Modalidad (local)
          </label>
          <select
            id="cal-filter-modality"
            value={filters.interviewModalityId}
            onChange={(e) => onChange({ interviewModalityId: e.target.value })}
            disabled={modalitiesLoading}
            className={selectClass}
          >
            <option value="">Todas</option>
            {modalities.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="cal-filter-search" className="font-sans text-xs font-medium">
            Buscar
          </label>
          <input
            id="cal-filter-search"
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Candidato, vacante, reclutador…"
            className={selectClass}
          />
        </div>

        <div className="flex items-end">
          <label className="inline-flex cursor-pointer items-center gap-2 font-sans text-sm text-foreground">
            <input
              type="checkbox"
              checked={filters.includeCancelled}
              onChange={(e) => onChange({ includeCancelled: e.target.checked })}
              className="h-4 w-4 rounded border-input accent-vo-purple"
            />
            Incluir canceladas
          </label>
        </div>
      </div>
    </section>
  )
}
