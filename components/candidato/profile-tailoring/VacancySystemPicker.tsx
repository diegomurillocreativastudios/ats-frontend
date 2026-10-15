"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Building2, ChevronDown, FileText, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { VacancyLocationLabel } from "@/components/shared/VacancyLocationLabel"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  getPublicVacancyDetail,
  listPublicVacancies,
  type OpportunityVacancyDetail,
  type OpportunityVacancySummary,
} from "@/lib/api/public-vacancies"

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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailsById, setDetailsById] = useState<Record<string, OpportunityVacancyDetail>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<{ id: string; message: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const timer = window.setTimeout(() => {
      void listPublicVacancies({
        search: query.trim() || undefined,
        page: 1,
        filter: "openVacancies",
      })
        .then((response) => {
          if (!cancelled) setResults(response.items ?? [])
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setError(getApiErrorMessage(err) || t("searchError"))
          setResults([])
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, t])

  useEffect(() => {
    if (!expandedId || detailsById[expandedId]) return

    let cancelled = false
    setDetailLoadingId(expandedId)
    setDetailError(null)

    void getPublicVacancyDetail(expandedId)
      .then((detail) => {
        if (cancelled) return
        if (!detail) {
          setDetailError({ id: expandedId, message: t("detailError") })
          return
        }
        setDetailsById((current) => ({ ...current, [expandedId]: detail }))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setDetailError({
          id: expandedId,
          message: getApiErrorMessage(err) || t("detailError"),
        })
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoadingId((current) => (current === expandedId ? null : current))
        }
      })

    return () => {
      cancelled = true
    }
  }, [detailsById, expandedId, t])

  const selectedInResults = selectedId
    ? results.some((vacancy) => vacancy.id === selectedId)
    : false

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
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 font-sans text-sm text-foreground outline-none ring-vo-purple/30 focus:ring-2"
            aria-label={t("searchAria")}
          />
        </div>
      </label>

      {selectedId && !selectedInResults ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-vo-purple/30 bg-vo-purple/5 p-3">
          <div className="min-w-0">
            <p className="font-sans text-sm font-semibold text-foreground">
              {selectedTitle || t("selectedFallback")}
            </p>
            <p className="mt-0.5 font-sans text-xs text-muted-foreground">{t("selectedBadge")}</p>
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

      {results.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-label={t("resultsAria")}>
          {results.map((vacancy) => (
            <VacancyAccordionItem
              key={vacancy.id}
              vacancy={vacancy}
              isSelected={selectedId === vacancy.id}
              isOpen={expandedId === vacancy.id}
              detail={detailsById[vacancy.id] ?? null}
              isDetailLoading={detailLoadingId === vacancy.id}
              detailError={detailError?.id === vacancy.id ? detailError.message : null}
              onToggle={() =>
                setExpandedId((current) => (current === vacancy.id ? null : vacancy.id))
              }
              onSelect={() => onSelect(vacancy)}
              onClear={onClear}
            />
          ))}
        </ul>
      ) : null}

      {!loading && !error && results.length === 0 ? (
        <p className="flex items-center gap-2 font-sans text-sm text-muted-foreground">
          <FileText className="h-4 w-4 shrink-0" aria-hidden />
          {t("empty")}
        </p>
      ) : null}
    </div>
  )
}

function VacancyAccordionItem({
  vacancy,
  isSelected,
  isOpen,
  detail,
  isDetailLoading,
  detailError,
  onToggle,
  onSelect,
  onClear,
}: {
  vacancy: OpportunityVacancySummary
  isSelected: boolean
  isOpen: boolean
  detail: OpportunityVacancyDetail | null
  isDetailLoading: boolean
  detailError: string | null
  onToggle: () => void
  onSelect: () => void
  onClear: () => void
}) {
  const t = useTranslations("CandidatePortal.profileTailoring.vacancyPicker")
  const meta = [vacancy.company?.name, vacancy.locationLabel, vacancy.modality?.displayName]
    .filter((part) => part && part.trim() !== "")
    .join(" · ")

  return (
    <li>
      <details
        open={isOpen}
        className={`overflow-hidden rounded-lg border bg-card ${
          isSelected ? "border-vo-purple/40 bg-vo-purple/5" : "border-border"
        }`}
      >
        <summary
          className="flex cursor-pointer list-none items-start gap-3 px-3 py-3 marker:content-none focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
          onClick={(event) => {
            event.preventDefault()
            onToggle()
          }}
        >
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-sans text-sm font-medium text-foreground">{vacancy.title}</span>
              {isSelected ? (
                <span className="rounded-full bg-vo-purple/15 px-2 py-0.5 font-sans text-xs font-medium text-vo-purple">
                  {t("selectedBadge")}
                </span>
              ) : null}
            </span>
            {meta ? (
              <span className="mt-0.5 block font-sans text-xs text-muted-foreground">{meta}</span>
            ) : null}
            {!vacancy.locationLabel && (vacancy.countryCode || vacancy.stateCode) ? (
              <VacancyLocationLabel
                countryCode={vacancy.countryCode}
                stateCode={vacancy.stateCode}
                className="mt-1 block font-sans text-xs text-muted-foreground"
              />
            ) : null}
          </span>
          <ChevronDown
            className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground motion-safe:transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </summary>

        {isOpen ? (
          <div className="flex flex-col gap-4 border-t border-border px-3 py-4 sm:px-4">
            {isDetailLoading ? (
              <p className="flex items-center gap-2 font-sans text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("detailLoading")}
              </p>
            ) : null}

            {detailError ? (
              <p className="font-sans text-sm text-destructive" role="alert">
                {detailError}
              </p>
            ) : null}

            {detail ? <VacancyDetailBody detail={detail} /> : null}

            <div>
              {isSelected ? (
                <Button type="button" variant="outline" className="px-3 py-2" onClick={onClear}>
                  {t("clear")}
                </Button>
              ) : (
                <Button type="button" className="px-3 py-2" onClick={onSelect}>
                  {t("useThisVacancy")}
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </details>
    </li>
  )
}

function VacancyDetailBody({ detail }: { detail: OpportunityVacancyDetail }) {
  const t = useTranslations("CandidatePortal.profileTailoring.vacancyPicker")
  const sections = [
    { key: "description", text: detail.description },
    { key: "details", text: detail.details },
    { key: "advantages", text: detail.advantages },
    { key: "salary", text: detail.salary },
  ].filter((section) => section.text)
  const lists = [
    { key: "responsibilities", items: detail.responsibilities ?? [] },
    { key: "requirements", items: detail.requirements ?? [] },
    { key: "benefits", items: detail.benefits ?? [] },
  ].filter((section) => section.items.length > 0)

  if (sections.length === 0 && lists.length === 0) {
    return <p className="font-sans text-sm text-muted-foreground">{t("detailEmpty")}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => (
        <section key={section.key} className="flex flex-col gap-1.5">
          <h3 className="font-sans text-sm font-semibold text-foreground">
            {t(`sections.${section.key}`)}
          </h3>
          <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
            {section.text}
          </p>
        </section>
      ))}
      {lists.map((section) => (
        <section key={section.key} className="flex flex-col gap-1.5">
          <h3 className="font-sans text-sm font-semibold text-foreground">
            {t(`sections.${section.key}`)}
          </h3>
          <ul className="list-disc space-y-1 pl-5">
            {section.items.map((item, index) => (
              <li
                key={`${section.key}-${index}`}
                className="font-sans text-sm leading-relaxed text-muted-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
