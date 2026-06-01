"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Search } from "lucide-react"
import { listAdminVacancyCatalog } from "@/lib/api/admin-vacancy-catalogs"
import { listRecruiterCompanies, type RecruiterCompanyOption } from "@/lib/api/recruiter-companies"
import {
  EMPTY_VACANCY_LIST_FILTERS,
  hasActiveVacancyListFilters,
  type VacancyListFilters,
} from "@/lib/vacancies/filter-vacancy-list"
import { getCountryIso2SelectOptions } from "@/lib/profile-form-options"
import { mapActiveCatalogItemsToOptions } from "@/lib/vacancy-catalogs"

const controlClassName =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-background font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

const labelClassName = "font-sans text-xs font-medium leading-none text-muted-foreground"

export interface VacancyListFiltersProps {
  value: VacancyListFilters
  onChange: (next: VacancyListFilters) => void
  disabled?: boolean
}

export function VacancyListFilters({
  value,
  onChange,
  disabled = false,
}: VacancyListFiltersProps) {
  const [companyOptions, setCompanyOptions] = useState<RecruiterCompanyOption[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<
    { id: string; displayName: string }[]
  >([])
  const [modalityOptions, setModalityOptions] = useState<
    { id: string; displayName: string }[]
  >([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  const countryOptions = useMemo(() => getCountryIso2SelectOptions(), [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoadingOptions(true)
      try {
        const [companies, departments, modalities] = await Promise.all([
          listRecruiterCompanies(),
          listAdminVacancyCatalog("departments"),
          listAdminVacancyCatalog("modalities"),
        ])
        if (cancelled) return
        setCompanyOptions(companies)
        setDepartmentOptions(mapActiveCatalogItemsToOptions(departments))
        setModalityOptions(mapActiveCatalogItemsToOptions(modalities))
      } catch {
        if (!cancelled) {
          setCompanyOptions([])
          setDepartmentOptions([])
          setModalityOptions([])
        }
      } finally {
        if (!cancelled) setLoadingOptions(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const patch = (partial: Partial<VacancyListFilters>) => {
    onChange({ ...value, ...partial })
  }

  const handleClearFilters = () => {
    onChange(EMPTY_VACANCY_LIST_FILTERS)
  }

  return (
    <div
      className="rounded-xl border border-border bg-card p-4 md:p-5"
      aria-label="Filtros de vacantes"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <FilterField id="vacancy-filter-search" label="Nombre">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="vacancy-filter-search"
              type="search"
              value={value.titleQuery}
              onChange={(e) => patch({ titleQuery: e.target.value })}
              placeholder="Buscar vacante..."
              disabled={disabled}
              className={`${controlClassName} pl-9 pr-3`}
            />
          </div>
        </FilterField>

        <FilterSelect
          id="vacancy-filter-company"
          label="Empresa"
          value={value.companyId}
          onChange={(companyId) => patch({ companyId })}
          disabled={disabled || loadingOptions}
          options={companyOptions.map((c) => ({ value: c.id, label: c.name }))}
        />

        <FilterSelect
          id="vacancy-filter-modality"
          label="Modalidad"
          value={value.modalityId}
          onChange={(modalityId) => patch({ modalityId })}
          disabled={disabled || loadingOptions}
          options={modalityOptions.map((m) => ({
            value: m.id,
            label: m.displayName,
          }))}
        />

        <FilterSelect
          id="vacancy-filter-country"
          label="País"
          emptyLabel="Todos"
          value={value.countryCode}
          onChange={(countryCode) => patch({ countryCode })}
          disabled={disabled}
          options={countryOptions.map((c) => ({ value: c.value, label: c.label }))}
        />

        <FilterSelect
          id="vacancy-filter-department"
          label="Departamento"
          value={value.departmentId}
          onChange={(departmentId) => patch({ departmentId })}
          disabled={disabled || loadingOptions}
          options={departmentOptions.map((d) => ({
            value: d.id,
            label: d.displayName,
          }))}
        />
      </div>

      {hasActiveVacancyListFilters(value) ? (
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <button
            type="button"
            onClick={handleClearFilters}
            disabled={disabled}
            className="font-sans text-sm font-medium text-vo-purple underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:opacity-50"
          >
            Limpiar filtros
          </button>
        </div>
      ) : null}
    </div>
  )
}

function FilterField({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      {children}
    </div>
  )
}

interface FilterSelectProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  emptyLabel?: string
  options: { value: string; label: string }[]
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  disabled,
  emptyLabel = "Todas",
  options,
}: FilterSelectProps) {
  return (
    <FilterField id={id} label={label}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${controlClassName} px-3`}
        aria-label={`Filtrar por ${label.toLowerCase()}`}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FilterField>
  )
}
