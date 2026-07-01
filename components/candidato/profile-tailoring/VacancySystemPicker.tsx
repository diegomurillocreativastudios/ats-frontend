"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Building2, FileText, Loader2, Search } from "lucide-react"
import {
  listPublicVacancies,
  type OpportunityVacancySummary,
} from "@/lib/api/public-vacancies"
import { getApiErrorMessage } from "@/lib/api-error"
import { VacancyLocationLabel } from "@/components/shared/VacancyLocationLabel"

interface VacancySystemPickerProps {
  selectedId: string | null
  selectedTitle: string | null
  onSelect: (vacancy: OpportunityVacancySummary) => void
  onClear: () => void
}

export function VacancySystemPicker({
  selectedId,
  selectedTitle,
  onSelect,
  onClear,
}: VacancySystemPickerProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.vacancyPicker")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<OpportunityVacancySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSearch = useCallback(async (search: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await listPublicVacancies({
        search: search.trim() || undefined,
        page: 1,
      })
      setResults(response.items ?? [])
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || t("searchError"))
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runSearch(query)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query, runSearch])

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="font-sans text-sm font-medium text-foreground">{t("searchLabel")}</span>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 font-sans text-sm text-foreground outline-none ring-vo-purple/30 focus:ring-2"
            aria-label={t("searchAria")}
          />
        </div>
      </label>

      {selectedId ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-vo-purple/30 bg-vo-purple/5 p-3">
          <div className="min-w-0">
            <p className="font-sans text-sm font-semibold text-foreground">
              {selectedTitle || t("selectedFallback")}
            </p>
            <p className="mt-0.5 font-sans text-xs text-muted-foreground">{selectedId}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 font-sans text-sm font-medium text-vo-purple hover:underline"
          >
            {t("clear")}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 font-sans text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("loading")}
        </p>
      ) : null}

      {error ? (
        <p className="font-sans text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {!selectedId && results.length > 0 ? (
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto" aria-label={t("resultsAria")}>
          {results.map((vacancy) => (
            <li key={vacancy.id}>
              <button
                type="button"
                onClick={() => onSelect(vacancy)}
                className="flex w-full items-start gap-3 rounded-lg border border-border bg-card px-3 py-3 text-left transition-colors hover:border-vo-purple/40 hover:bg-muted/40"
              >
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-sm font-medium text-foreground">
                    {vacancy.title}
                  </span>
                  <span className="mt-0.5 block font-sans text-xs text-muted-foreground">
                    {vacancy.company?.name}
                    {vacancy.locationLabel ? ` · ${vacancy.locationLabel}` : ""}
                  </span>
                  {!vacancy.locationLabel && (vacancy.countryCode || vacancy.stateCode) ? (
                    <VacancyLocationLabel
                      countryCode={vacancy.countryCode}
                      stateCode={vacancy.stateCode}
                      className="mt-1 block font-sans text-xs text-muted-foreground"
                    />
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !error && !selectedId && results.length === 0 ? (
        <p className="flex items-center gap-2 font-sans text-sm text-muted-foreground">
          <FileText className="h-4 w-4 shrink-0" aria-hidden />
          {t("empty")}
        </p>
      ) : null}
    </div>
  )
}
