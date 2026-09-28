"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { ReportesFilterControl } from "@/components/rrhh/reportes/reportes-filters-placeholder"
import { DatePicker, datePickerFilterButtonClass } from "@/components/ui/date-picker"
import { fetchAdminUsersAllByRole, type AdminUserListItem } from "@/lib/api/admin-users"
import {
  listRecruiterCompanies,
  listRecruiterStages,
  listRecruiterVacancies,
  type RecruiterCompanyOption,
  type RecruiterStageOption,
  type RecruiterVacancyOption,
} from "@/lib/api/recruiter-reports"
import type {
  ReportFilterField,
  ReportFilterFieldOption,
  ReportFilterSchema,
} from "@/lib/reportes/report-document-types"

export interface ReportFilterRendererProps {
  schema: ReportFilterSchema
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  disabled?: boolean
}

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground disabled:opacity-60"

function slugifyControlId(key: string): string {
  return `report-filter-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`
}

function readString(value: unknown): string {
  if (value == null) return ""
  return String(value)
}

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((x) => String(x)).filter(Boolean)
  }
  if (typeof value === "string" && value.trim() !== "") {
    return value.split(",").map((x) => x.trim()).filter(Boolean)
  }
  return []
}

function readDateRange(
  value: unknown,
  fromKey: string,
  toKey: string,
  allValues: Record<string, unknown>
): { from: string; to: string } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>
    return {
      from: readString(rec.from ?? rec.dateFrom ?? rec.start),
      to: readString(rec.to ?? rec.dateTo ?? rec.end),
    }
  }
  return {
    from: readString(allValues[fromKey]),
    to: readString(allValues[toKey]),
  }
}

function recruiterLabel(user: AdminUserListItem): string {
  const name = user.userName?.trim()
  if (name) return name
  const email = user.email?.trim()
  if (email) return email
  return user.id
}

function useFilterSourceOptions(field: ReportFilterField, _value: Record<string, unknown>) {
  const [options, setOptions] = useState<ReportFilterFieldOption[]>(field.options ?? [])
  const [loading, setLoading] = useState(false)

  const loadOptions = useCallback(async () => {
    if (field.source === "static" || (!field.source && field.options?.length)) {
      setOptions(field.options ?? [])
      return
    }

    if (!field.source) {
      setOptions(field.options ?? [])
      return
    }

    setLoading(true)
    try {
      if (field.source === "clients") {
        const companies: RecruiterCompanyOption[] = await listRecruiterCompanies()
        setOptions([
          { value: "", label: "Todos" },
          ...companies.map((c) => ({ value: c.id, label: c.name })),
        ])
        return
      }

      if (field.source === "vacancies") {
        const vacancies: RecruiterVacancyOption[] = await listRecruiterVacancies()
        setOptions(
          vacancies.map((v) => ({
            value: v.id,
            label: v.title,
          }))
        )
        return
      }

      if (field.source === "stages") {
        const stages: RecruiterStageOption[] = await listRecruiterStages()
        setOptions(stages.map((s) => ({ value: s.id, label: s.name })))
        return
      }

      if (field.source === "recruiters") {
        const recruiters = await fetchAdminUsersAllByRole("Recruiter")
        setOptions(
          recruiters.map((u) => ({
            value: u.id,
            label: recruiterLabel(u),
          }))
        )
        return
      }

      setOptions(field.options ?? [])
    } catch {
      setOptions(field.options ?? [])
    } finally {
      setLoading(false)
    }
  }, [field])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  return { options, loading }
}

function FilterFieldControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ReportFilterField
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  disabled?: boolean
}) {
  const controlId = slugifyControlId(field.key)
  const { options, loading } = useFilterSourceOptions(field, value)

  const patch = (patchValue: Record<string, unknown>) => {
    onChange({ ...value, ...patchValue })
  }

  if (field.type === "text") {
    return (
      <ReportesFilterControl label={field.label} controlId={controlId}>
        <input
          id={controlId}
          type="text"
          className={controlClass}
          value={readString(value[field.key])}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => patch({ [field.key]: e.target.value })}
        />
      </ReportesFilterControl>
    )
  }

  if (field.type === "date") {
    return (
      <ReportesFilterControl label={field.label} controlId={controlId}>
        <DatePicker
          id={controlId}
          value={readString(value[field.key])}
          disabled={disabled}
          onChange={(next) => patch({ [field.key]: next })}
          ariaLabel={field.label}
          buttonClassName={datePickerFilterButtonClass}
          wrapperClassName="relative w-full"
        />
      </ReportesFilterControl>
    )
  }

  if (field.type === "dateRange") {
    const fromKey = field.fromKey ?? `${field.key}From`
    const toKey = field.toKey ?? `${field.key}To`
    const range = readDateRange(value[field.key], fromKey, toKey, value)
    const fromId = `${controlId}-from`
    const toId = `${controlId}-to`

    return (
      <>
        <ReportesFilterControl label={`${field.label} (desde)`} controlId={fromId}>
          <DatePicker
            id={fromId}
            value={range.from}
            disabled={disabled}
            onChange={(from) =>
              patch({
                [field.key]: { from, to: range.to },
                [fromKey]: from,
                [toKey]: range.to,
              })
            }
            ariaLabel={`${field.label} desde`}
            buttonClassName={datePickerFilterButtonClass}
            wrapperClassName="relative w-full"
          />
        </ReportesFilterControl>
        <ReportesFilterControl label={`${field.label} (hasta)`} controlId={toId}>
          <DatePicker
            id={toId}
            value={range.to}
            disabled={disabled}
            onChange={(to) =>
              patch({
                [field.key]: { from: range.from, to },
                [fromKey]: range.from,
                [toKey]: to,
              })
            }
            ariaLabel={`${field.label} hasta`}
            buttonClassName={datePickerFilterButtonClass}
            wrapperClassName="relative w-full"
          />
        </ReportesFilterControl>
      </>
    )
  }

  if (field.type === "multiselect") {
    const selected = readStringArray(value[field.key])
    return (
      <ReportesFilterControl label={field.label} controlId={controlId}>
        <div className="relative">
          {loading ? (
            <Loader2
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden
            />
          ) : null}
          <select
            id={controlId}
            multiple
            className={`${controlClass} min-h-[5.5rem] py-2`}
            value={selected}
            disabled={disabled || loading}
            onChange={(e) => {
              const next = Array.from(e.target.selectedOptions).map((o) => o.value)
              patch({ [field.key]: next })
            }}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </ReportesFilterControl>
    )
  }

  return (
    <ReportesFilterControl label={field.label} controlId={controlId}>
      <div className="relative">
        {loading ? (
          <Loader2
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : null}
        <select
          id={controlId}
          className={controlClass}
          value={readString(value[field.key])}
          disabled={disabled || loading}
          onChange={(e) => patch({ [field.key]: e.target.value })}
        >
          {field.type === "select" && !field.required && field.source === "clients" ? null : (
            <option value="">{field.placeholder ?? "Seleccionar…"}</option>
          )}
          {options.map((opt) => (
            <option key={`${field.key}-${opt.value}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </ReportesFilterControl>
  )
}

export function ReportFilterRenderer({
  schema,
  value,
  onChange,
  disabled = false,
}: ReportFilterRendererProps) {
  const fields = useMemo(() => schema.fields ?? [], [schema.fields])

  if (fields.length === 0) {
    return (
      <p className="font-sans text-sm text-muted-foreground" role="status">
        Esta plantilla no define filtros configurables.
      </p>
    )
  }

  return (
    <>
      {fields.map((field) => (
        <FilterFieldControl
          key={field.key}
          field={field}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      ))}
    </>
  )
}
