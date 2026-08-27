"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  Code2,
  Headset,
  Megaphone,
  Palette,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Settings2,
  ShieldCheck,
  Stethoscope,
  Search,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import {
  buildOpportunityCompanyLogoDataUri,
  listPublicVacancies,
  type OpportunityFilterOption,
  type OpportunityListFilters,
  type OpportunityListResponse,
  type OpportunityVacancySummary,
} from "@/lib/api/public-vacancies"
import { VacancyLocationLabel } from "@/components/shared/VacancyLocationLabel"
import {
  getOpportunityResultsRange,
  mergeCountryFilterOptions,
  vacancyMatchesSearch,
  type OpportunityCountryOption,
} from "@/lib/public-opportunities-list"
import {
  getPublicOpportunitiesQueryState,
  type PublicOpportunitiesQueryState,
} from "@/lib/public-opportunities-query"
import { publicOpportunitiesTheme } from "@/lib/public-opportunities-theme"

interface PublicVacanciesExplorerProps {
  initialQueryString?: string
}

const SEARCH_DEBOUNCE_MS = 300
const opportunityRowGridClassName =
  "lg:grid-cols-[minmax(0,1.7fr)_minmax(8.5rem,0.7fr)_minmax(0,1.2fr)_auto] lg:items-center lg:gap-5"
const unspecifiedMark = "—"

function toRequestFilters(queryState: PublicOpportunitiesQueryState): OpportunityListFilters {
  return {
    departmentId: queryState.departmentId || undefined,
    departmentCode: queryState.departmentCode || undefined,
    modalityId: queryState.modalityId || undefined,
    modalityCode: queryState.modalityCode || undefined,
    vacanteName: queryState.vacanteName || undefined,
    countryCode: queryState.countryCode || undefined,
    page: queryState.page > 1 ? queryState.page : undefined,
  }
}

function getFilterOptionValue(option: OpportunityFilterOption): string {
  return option.id || option.code
}

function matchesSelectedFilter(
  option: OpportunityFilterOption,
  selectedId: string,
  selectedCode: string
): boolean {
  if (selectedId && option.id === selectedId) return true
  if (selectedCode && option.code === selectedCode) return true
  return false
}

function normalizeDepartmentKey(value?: string): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function getDepartmentIcon(department?: OpportunityVacancySummary["department"]): LucideIcon {
  const normalizedKey = normalizeDepartmentKey(
    department?.code ? `${department.code} ${department.displayName}` : department?.displayName
  )

  if (!normalizedKey) return Briefcase
  if (
    normalizedKey.includes("development") ||
    normalizedKey.includes("developer") ||
    normalizedKey.includes("software") ||
    normalizedKey.includes("engineering") ||
    normalizedKey.includes("ingenieria") ||
    normalizedKey.includes("tech")
  ) {
    return Code2
  }

  if (
    normalizedKey.includes("design") ||
    normalizedKey.includes("ux") ||
    normalizedKey.includes("ui") ||
    normalizedKey.includes("creative")
  ) {
    return Palette
  }

  if (
    normalizedKey.includes("marketing") ||
    normalizedKey.includes("growth") ||
    normalizedKey.includes("content") ||
    normalizedKey.includes("brand") ||
    normalizedKey.includes("ventas")
  ) {
    return Megaphone
  }

  if (
    normalizedKey.includes("operations") ||
    normalizedKey.includes("operaciones") ||
    normalizedKey.includes("logistics") ||
    normalizedKey.includes("supply")
  ) {
    return Settings2
  }

  if (
    normalizedKey.includes("customer") ||
    normalizedKey.includes("support") ||
    normalizedKey.includes("success") ||
    normalizedKey.includes("soporte")
  ) {
    return Headset
  }

  if (
    normalizedKey.includes("people") ||
    normalizedKey.includes("talent") ||
    normalizedKey.includes("human") ||
    normalizedKey.includes("rrhh") ||
    normalizedKey.includes("recruit")
  ) {
    return Users
  }

  if (
    normalizedKey.includes("finance") ||
    normalizedKey.includes("account") ||
    normalizedKey.includes("admin") ||
    normalizedKey.includes("contab")
  ) {
    return BarChart3
  }

  if (
    normalizedKey.includes("security") ||
    normalizedKey.includes("compliance") ||
    normalizedKey.includes("legal")
  ) {
    return ShieldCheck
  }

  if (normalizedKey.includes("health") || normalizedKey.includes("salud")) {
    return Stethoscope
  }

  return Briefcase
}

function formatPublishedLabel(publishedAt?: string): string | null {
  if (!publishedAt) return null

  const date = new Date(publishedAt)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("es-SV", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

function getCountryFilterLabel(queryState: PublicOpportunitiesQueryState): string | null {
  return queryState.country || queryState.countryCode || null
}

function buildResultsSummary({
  totalCount,
  currentPage,
  from,
  to,
  search,
  department,
  modality,
  country,
  isLoading,
  useCompactCount,
  t,
}: {
  totalCount: number
  currentPage: number
  from: number
  to: number
  search: string
  department: string | null
  modality: string | null
  country: string | null
  isLoading: boolean
  useCompactCount: boolean
  t: ReturnType<typeof useTranslations<"PublicOpportunities.page">>
}): string {
  if (isLoading) return t("preparingList")

  const suffixParts = [
    search ? t("resultsFilterQuote", { query: search }) : null,
    department ? t("resultsFilterDepartment", { department }) : null,
    modality ? t("resultsFilterModality", { modality }) : null,
    country ? t("resultsFilterCountry", { country }) : null,
  ].filter(Boolean)

  const suffix = suffixParts.length ? ` ${suffixParts.join(", ")}` : ""
  const pageLabel =
    !useCompactCount && currentPage > 1 ? ` ${t("resultsPage", { page: currentPage })}` : ""
  const countLabel = useCompactCount
    ? t("opportunityCount", { count: totalCount })
    : t("resultsShowing", { from, to, total: totalCount })

  return `${countLabel}${suffix}${pageLabel}.`
}

function OpportunityCard({
  vacancy,
  queryString,
  t,
}: {
  vacancy: OpportunityVacancySummary
  queryString: string
  t: ReturnType<typeof useTranslations<"PublicOpportunities.page">>
}) {
  const publishedLabel = formatPublishedLabel(vacancy.publishedAt)
  const href = `/portal-oportunidades/${vacancy.id}${queryString ? `?${queryString}` : ""}`
  const departmentLabel = vacancy.department?.displayName
  const modalityLabel = vacancy.modality?.displayName
  const companyName = vacancy.company.name?.trim() ?? ""
  const DepartmentIcon = getDepartmentIcon(vacancy.department)
  const companyLogoSrc = buildOpportunityCompanyLogoDataUri(vacancy.company.logo)

  return (
    <article className="group border-b border-border last:border-b-0">
      <Link
        href={href}
        aria-label={t("rowAriaLabel", { title: vacancy.title })}
        className={`grid gap-4 py-4 transition-colors duration-200 hover:bg-muted/30 focus:outline-none focus-visible:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ats-cobre focus-visible:ring-inset ${opportunityRowGridClassName}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/35 text-xs font-semibold text-foreground/80"
            aria-hidden
          >
            {companyLogoSrc ? (
              <img
                src={companyLogoSrc}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <DepartmentIcon className="h-5 w-5 text-ats-terracotta" aria-hidden />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight text-foreground group-hover:text-ats-terracotta">
              {vacancy.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {companyName ? (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-ats-terracotta" aria-hidden />
                  {companyName}
                </span>
              ) : null}
              {modalityLabel ? (
                <span className="inline-flex items-center rounded-full border border-ats-terracotta/15 bg-ats-terracotta/8 px-2 py-0.5 text-xs font-medium text-foreground">
                  {modalityLabel}
                </span>
              ) : null}
              {publishedLabel ? (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-ats-cobre" aria-hidden />
                  {publishedLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-1 lg:space-y-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground lg:hidden">
            {t("tableDepartment")}
          </p>
          <p
            className="text-sm text-muted-foreground"
            aria-label={departmentLabel ?? t("fallbackDepartment")}
          >
            {departmentLabel ?? unspecifiedMark}
          </p>
        </div>

        <div className="space-y-1 lg:space-y-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground lg:hidden">
            {t("locationMobileLabel")}
          </p>
          <p className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-ats-terracotta" aria-hidden />
            <VacancyLocationLabel
              countryCode={vacancy.countryCode}
              stateCode={vacancy.stateCode}
              emptyLabel={t("fallbackLocation")}
            />
          </p>
        </div>

        <div className="flex items-center justify-start lg:justify-end">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors group-hover:text-ats-terracotta">
            {t("viewDetail")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </Link>
    </article>
  )
}

function OpportunityCardSkeleton() {
  return (
    <div className={`grid animate-pulse gap-4 py-4 ${opportunityRowGridClassName}`}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted/50" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-44 rounded-md bg-muted/50" />
          <div className="h-4 w-40 rounded-md bg-muted/50" />
        </div>
      </div>
      <div className="h-4 w-24 rounded-md bg-muted/50" />
      <div className="h-4 w-40 rounded-md bg-muted/50" />
      <div className="h-4 w-24 rounded-md bg-muted/50" />
    </div>
  )
}

function OpportunityTableHeader({
  t,
}: {
  t: ReturnType<typeof useTranslations<"PublicOpportunities.page">>
}) {
  return (
    <div className={`hidden gap-5 border-b border-border py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid ${opportunityRowGridClassName}`}>
      <span>{t("vacancy")}</span>
      <span>{t("tableDepartment")}</span>
      <span>{t("tableLocation")}</span>
      <span className="text-right">{t("tableAction")}</span>
    </div>
  )
}

export function PublicVacanciesExplorerSkeleton() {
  const t = useTranslations("PublicOpportunities.page")

  return (
    <section
      id="public-opportunities-explorer"
      className="mt-10 scroll-mt-6"
      aria-labelledby="public-opportunities-explorer-title"
      aria-busy="true"
    >
      <div className={publicOpportunitiesTheme.directoryGrid}>
        <div className={publicOpportunitiesTheme.directoryRail} aria-hidden>
          <div className={`h-5 w-20 rounded-md ${publicOpportunitiesTheme.skeleton}`} />
          <div className={`h-10 w-full rounded-lg ${publicOpportunitiesTheme.skeleton}`} />
          <div className={`h-10 w-full rounded-lg ${publicOpportunitiesTheme.skeleton}`} />
          <div className={`h-10 w-full rounded-lg ${publicOpportunitiesTheme.skeleton}`} />
          <div className={`h-10 w-full rounded-lg ${publicOpportunitiesTheme.skeleton}`} />
        </div>

        <div>
          <div className="space-y-2">
            <h2
              id="public-opportunities-explorer-title"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.85rem]"
            >
              {t("listTitle")}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">{t("preparingList")}</p>
          </div>

          <div className="mt-6 border-t border-border">
            <OpportunityTableHeader t={t} />
            <div>
              {Array.from({ length: 4 }).map((_, index) => (
                <OpportunityCardSkeleton key={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FilterSelect({
  id,
  label,
  value,
  disabled,
  emptyLabel,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  disabled?: boolean
  emptyLabel: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={publicOpportunitiesTheme.filterLabel}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={publicOpportunitiesTheme.filterSelect}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function PublicVacanciesExplorerContent({
  initialQueryString = "",
}: PublicVacanciesExplorerProps) {
  const t = useTranslations("PublicOpportunities.page")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentQueryString = useMemo(() => {
    const clientQueryString = searchParams.toString()
    return clientQueryString || initialQueryString
  }, [initialQueryString, searchParams])

  const queryState = useMemo(
    () => getPublicOpportunitiesQueryState(new URLSearchParams(currentQueryString)),
    [currentQueryString]
  )
  const requestFilters = useMemo(() => toRequestFilters(queryState), [queryState])

  const [searchInput, setSearchInput] = useState(queryState.vacanteName)
  const [response, setResponse] = useState<OpportunityListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const [countryOptions, setCountryOptions] = useState<OpportunityCountryOption[]>(
    () =>
      mergeCountryFilterOptions([], [], {
        code: queryState.countryCode,
        label: queryState.country,
      })
  )

  useEffect(() => {
    let isCancelled = false

    const loadVacancies = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const nextResponse = await listPublicVacancies(requestFilters)
        if (isCancelled) return
        setResponse(nextResponse)
      } catch (error) {
        if (isCancelled) return
        const message =
          error instanceof Error && error.message.trim() !== ""
            ? error.message
            : t("loadFailed")
        setErrorMessage(message)
        setResponse(null)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadVacancies()

    return () => {
      isCancelled = true
    }
  }, [requestFilters, retryToken])

  const updateQuery = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(currentQueryString)

      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "" || value === 1) {
          params.delete(key)
          continue
        }

        params.set(key, String(value))
      }

      const nextQuery = params.toString()
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      })
    },
    [currentQueryString, pathname, router]
  )

  useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === queryState.vacanteName) return

    const timeoutId = window.setTimeout(() => {
      updateQuery({ vacanteName: trimmed || null, page: null })
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput, queryState.vacanteName, updateQuery])

  useEffect(() => {
    const countriesFromApi = (response?.availableFilters.countries ?? []).map(
      (option) => ({
        code: option.code || option.id,
        label: option.displayName,
      })
    )

    setCountryOptions((current) =>
      mergeCountryFilterOptions(
        [...current, ...countriesFromApi],
        response?.items ?? [],
        {
          code: queryState.countryCode,
          label: queryState.country,
        }
      )
    )
  }, [
    queryState.country,
    queryState.countryCode,
    response?.availableFilters.countries,
    response?.items,
  ])

  const handleClearAll = useCallback(() => {
    setSearchInput("")
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  const departmentOptions = response?.availableFilters.departments ?? []
  const modalityOptions = response?.availableFilters.modalities ?? []
  const selectedDepartmentOption = departmentOptions.find((option) =>
    matchesSelectedFilter(option, queryState.departmentId, queryState.departmentCode)
  )
  const selectedModalityOption = modalityOptions.find((option) =>
    matchesSelectedFilter(option, queryState.modalityId, queryState.modalityCode)
  )
  const selectedDepartmentLabel = selectedDepartmentOption?.displayName ?? null
  const selectedModalityLabel = selectedModalityOption?.displayName ?? null
  const selectedCountryOption = countryOptions.find(
    (option) => option.code === queryState.countryCode
  )
  const selectedCountryLabel =
    selectedCountryOption?.label ?? getCountryFilterLabel(queryState)
  const selectedDepartmentValue = selectedDepartmentOption
    ? getFilterOptionValue(selectedDepartmentOption)
    : ""
  const selectedModalityValue = selectedModalityOption
    ? getFilterOptionValue(selectedModalityOption)
    : ""
  const selectedCountryValue = countryOptions.some(
    (option) => option.code === queryState.countryCode
  )
    ? queryState.countryCode
    : ""
  const filteredItems = useMemo(() => {
    const items = response?.items ?? []
    return items.filter((vacancy) => vacancyMatchesSearch(vacancy, searchInput))
  }, [response?.items, searchInput])
  const hasActiveFilters = Boolean(
    searchInput.trim() ||
      queryState.departmentId ||
      queryState.departmentCode ||
      queryState.modalityId ||
      queryState.modalityCode ||
      queryState.country ||
      queryState.countryCode
  )

  const currentPage = response?.pagination.page ?? queryState.page
  const pageSize = response?.pagination.pageSize ?? filteredItems.length
  const apiTotalCount = response?.pagination.totalCount ?? 0
  const isClientReduced = filteredItems.length !== (response?.items.length ?? 0)
  const totalCount = isClientReduced ? filteredItems.length : apiTotalCount
  const totalPages = isClientReduced ? 1 : (response?.pagination.totalPages ?? 1)
  const resultsRange = getOpportunityResultsRange(
    isClientReduced ? 1 : currentPage,
    isClientReduced ? Math.max(filteredItems.length, 1) : pageSize,
    totalCount
  )
  const resultsSummary = buildResultsSummary({
    totalCount,
    currentPage: isClientReduced ? 1 : currentPage,
    from: resultsRange.from,
    to: resultsRange.to,
    search: searchInput.trim(),
    department: selectedDepartmentLabel,
    modality: selectedModalityLabel,
    country: selectedCountryLabel,
    isLoading,
    useCompactCount: isClientReduced || totalPages <= 1,
    t,
  })

  const handleSelectDepartment = (value: string) => {
    const option = departmentOptions.find((item) => getFilterOptionValue(item) === value)
    updateQuery({
      departmentId: option?.id ?? null,
      departmentCode: option?.code ?? null,
      page: null,
    })
  }

  const handleSelectModality = (value: string) => {
    const option = modalityOptions.find((item) => getFilterOptionValue(item) === value)
    updateQuery({
      modalityId: option?.id ?? null,
      modalityCode: option?.code ?? null,
      page: null,
    })
  }

  const handleSelectCountry = (value: string) => {
    const option = countryOptions.find((item) => item.code === value)
    updateQuery({
      countryCode: option?.code ?? null,
      country: null,
      page: null,
    })
  }

  return (
    <section
      id="public-opportunities-explorer"
      className="mt-10 scroll-mt-6"
      aria-labelledby="public-opportunities-explorer-title"
    >
      <div className={publicOpportunitiesTheme.directoryGrid}>
        <aside
          className={publicOpportunitiesTheme.directoryRail}
          aria-labelledby="public-opportunities-filters-heading"
        >
          <div className="flex items-center justify-between gap-3">
            <h2
              id="public-opportunities-filters-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              {t("filtersHeading")}
            </h2>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-sm font-medium text-ats-terracotta hover:text-ats-terracotta-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ats-cobre focus-visible:ring-offset-2"
              >
                {t("clearFilters")}
              </button>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="public-vacancies-search"
              className={publicOpportunitiesTheme.filterLabel}
            >
              {t("searchLabel")}
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                id="public-vacancies-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className={publicOpportunitiesTheme.filterInput}
              />
            </div>
          </div>

          <FilterSelect
            id="public-vacancies-department"
            label={t("filterDepartment")}
            value={selectedDepartmentValue}
            disabled={isLoading}
            emptyLabel={t("filterAllDepartments")}
            options={departmentOptions.map((option) => ({
              value: getFilterOptionValue(option),
              label: option.displayName,
            }))}
            onChange={handleSelectDepartment}
          />
          <FilterSelect
            id="public-vacancies-modality"
            label={t("filterModality")}
            value={selectedModalityValue}
            disabled={isLoading}
            emptyLabel={t("filterAllModalities")}
            options={modalityOptions.map((option) => ({
              value: getFilterOptionValue(option),
              label: option.displayName,
            }))}
            onChange={handleSelectModality}
          />
          <FilterSelect
            id="public-vacancies-country"
            label={t("filterCountry")}
            value={selectedCountryValue}
            disabled={isLoading}
            emptyLabel={t("filterAllCountries")}
            options={countryOptions.map((option) => ({
              value: option.code,
              label: option.label,
            }))}
            onChange={handleSelectCountry}
          />
        </aside>

        <div>
          <div className="space-y-1">
            <h2
              id="public-opportunities-explorer-title"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.85rem]"
            >
              {t("listTitle")}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">{resultsSummary}</p>
          </div>

          <div className="mt-6">
            {errorMessage ? (
              <div
                className="border border-destructive/25 bg-destructive/10 px-4 py-4 text-sm text-destructive"
                role="alert"
              >
                <p>{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => setRetryToken((current) => current + 1)}
                  className="mt-3 font-medium text-foreground hover:text-ats-terracotta-soft"
                >
                  {t("retry")}
                </button>
              </div>
            ) : isLoading ? (
              <div className="border-t border-border">
                <OpportunityTableHeader t={t} />
                <div>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <OpportunityCardSkeleton key={index} />
                  ))}
                </div>
              </div>
            ) : filteredItems.length ? (
              <div className="border-t border-border">
                <OpportunityTableHeader t={t} />
                <div>
                  {filteredItems.map((vacancy) => (
                    <OpportunityCard
                      key={vacancy.id}
                      vacancy={vacancy}
                      queryString={currentQueryString}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-t border-border py-16 text-center">
                <Briefcase className="mx-auto h-7 w-7 text-ats-cobre" aria-hidden />
                <h3 className="mt-4 text-xl font-semibold text-foreground">
                  {t("emptyTitle")}
                </h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                  {t("emptyBody")}
                </p>
                {hasActiveFilters ? (
                  <div className="mt-6">
                    <Button
                      type="button"
                      className="rounded-full bg-ats-terracotta px-6 py-3 text-ats-warm-white"
                      onClick={handleClearAll}
                    >
                      {t("viewAll")}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {!isLoading && !errorMessage && totalPages > 1 ? (
            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {t("pageSummary", { page: currentPage, total: totalPages })}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={`rounded-full ${publicOpportunitiesTheme.ctaOutline}`}
                  onClick={() => updateQuery({ page: currentPage - 1 })}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  {t("prev")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`rounded-full ${publicOpportunitiesTheme.ctaOutline}`}
                  onClick={() => updateQuery({ page: currentPage + 1 })}
                  disabled={currentPage >= totalPages}
                >
                  {t("next")}
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export function PublicVacanciesExplorer({
  initialQueryString = "",
}: PublicVacanciesExplorerProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <PublicVacanciesExplorerSkeleton />
  }

  return (
    <Suspense fallback={<PublicVacanciesExplorerSkeleton />}>
      <PublicVacanciesExplorerContent initialQueryString={initialQueryString} />
    </Suspense>
  )
}
