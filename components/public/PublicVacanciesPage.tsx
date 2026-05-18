"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
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
  Layers3,
  MapPin,
  Settings2,
  ShieldCheck,
  Stethoscope,
  Search,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import { PublicOpportunitiesNavbar } from "@/components/public/PublicOpportunitiesNavbar"
import { Button } from "@/components/ui/Button"
import {
  listPublicVacancies,
  type OpportunityFilterOption,
  type OpportunityListFilters,
  type OpportunityListResponse,
  type OpportunityVacancySummary,
} from "@/lib/api/public-vacancies"
import { VacancyLocationLabel } from "@/components/shared/VacancyLocationLabel"

interface QueryState {
  departmentId: string
  departmentCode: string
  modalityId: string
  modalityCode: string
  vacanteName: string
  countryCode: string
  country: string
  page: number
}

interface ActiveFilterChipProps {
  label: string
  value: string
  onRemove: () => void
}

const darkPanelClassName =
  "border border-white/10 bg-[linear-gradient(180deg,rgba(35,45,76,0.94)_0%,rgba(19,27,50,0.97)_100%)] shadow-[0_24px_80px_rgba(7,12,27,0.42)] backdrop-blur"

const softPanelClassName =
  "border border-white/10 bg-[linear-gradient(180deg,rgba(19,27,50,0.88)_0%,rgba(11,18,36,0.96)_100%)] shadow-[0_20px_60px_rgba(7,12,27,0.36)] backdrop-blur"

const cardGlowClassName =
  "border border-white/10 bg-[linear-gradient(180deg,rgba(46,27,78,0.72)_0%,rgba(18,27,49,0.94)_100%)] shadow-[0_24px_70px_rgba(4,9,21,0.42)]"

function getQueryState(searchParams: URLSearchParams): QueryState {
  const pageValue = Number(searchParams.get("page") ?? "1")

  return {
    departmentId: searchParams.get("departmentId")?.trim() ?? "",
    departmentCode: searchParams.get("departmentCode")?.trim() ?? "",
    modalityId: searchParams.get("modalityId")?.trim() ?? "",
    modalityCode: searchParams.get("modalityCode")?.trim() ?? "",
    vacanteName:
      searchParams.get("vacanteName")?.trim() ?? searchParams.get("search")?.trim() ?? "",
    countryCode: searchParams.get("countryCode")?.trim() ?? "",
    country: searchParams.get("country")?.trim() ?? "",
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  }
}

function toRequestFilters(queryState: QueryState): OpportunityListFilters {
  return {
    departmentId: queryState.departmentId || undefined,
    departmentCode: queryState.departmentCode || undefined,
    modalityId: queryState.modalityId || undefined,
    modalityCode: queryState.modalityCode || undefined,
    countryCode: queryState.countryCode || undefined,
    country: queryState.country || undefined,
    page: queryState.page > 1 ? queryState.page : undefined,
  }
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

function resolveSelectedFilterLabel(
  options: OpportunityFilterOption[],
  selectedId: string,
  selectedCode: string
): string | null {
  if (!selectedId && !selectedCode) return null

  const match = options.find((option) =>
    matchesSelectedFilter(option, selectedId, selectedCode)
  )

  if (match) return match.displayName
  return selectedCode || selectedId || null
}

function getCompanyInitials(companyName: string): string {
  return companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("")
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

function formatCountLabel(totalCount: number): string {
  return `${totalCount} oportunidad${totalCount === 1 ? "" : "es"}`
}

function getCountryFilterLabel(queryState: QueryState): string | null {
  return queryState.country || queryState.countryCode || null
}

function buildResultsSummary({
  totalCount,
  currentPage,
  search,
  department,
  modality,
  country,
  isLoading,
}: {
  totalCount: number
  currentPage: number
  search: string
  department: string | null
  modality: string | null
  country: string | null
  isLoading: boolean
}): string {
  if (isLoading) return "Preparando el listado con la búsqueda y filtros activos."

  const descriptors = [
    search ? `para "${search}"` : null,
    department ? `en el departamento ${department}` : null,
    modality ? `con modalidad ${modality}` : null,
    country ? `en ${country}` : null,
  ].filter(Boolean)

  const suffix = descriptors.length ? ` ${descriptors.join(", ")}` : ""
  const pageLabel = currentPage > 1 ? ` en la página ${currentPage}` : ""

  return `Mostrando ${formatCountLabel(totalCount)}${suffix}${pageLabel}.`
}

function OpportunityCard({
  vacancy,
  queryString,
}: {
  vacancy: OpportunityVacancySummary
  queryString: string
}) {
  const publishedLabel = formatPublishedLabel(vacancy.publishedAt)
  const href = `/oportunidades/${vacancy.id}${queryString ? `?${queryString}` : ""}`
  const departmentLabel = vacancy.department?.displayName ?? "Departamento no especificado"
  const modalityLabel = vacancy.modality?.displayName ?? "Modalidad no especificada"
  const companyName = vacancy.company.name?.trim() ?? ""
  const DepartmentIcon = getDepartmentIcon(vacancy.department)

  return (
    <article className="group border-b border-white/10 last:border-b-0">
      <div className="grid gap-4 px-4 py-5 transition-colors duration-200 hover:bg-white/3 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(180px,1fr)_minmax(220px,1fr)_auto] lg:items-center lg:gap-6 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-xs font-semibold text-white/80">
            <DepartmentIcon className="h-5 w-5 text-[#8dd8ff]" aria-hidden />
          </div>

          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight text-white">
              <Link
                href={href}
                className="transition-colors hover:text-[#8dd8ff] focus:outline-none focus:ring-2 focus:ring-[#f0a7ff] focus:ring-offset-2 focus:ring-offset-[#161d34]"
              >
                {vacancy.title}
              </Link>
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/56">
              {companyName ? (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-[#8dd8ff]" aria-hidden />
                  {companyName}
                </span>
              ) : null}
              {publishedLabel ? (
                <span className="inline-flex items-center gap-1.5 text-white/44">
                  <Sparkles className="h-3.5 w-3.5 text-[#f0a7ff]" aria-hidden />
                  {publishedLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-1 lg:space-y-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/38 lg:hidden">
            Departamento
          </p>
          <p className="text-sm text-white/74">{departmentLabel}</p>
        </div>

        <div className="space-y-1 lg:space-y-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/38 lg:hidden">Ubicación</p>
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 text-sm text-white/74">
              <MapPin className="h-3.5 w-3.5 text-[#f6c482]" aria-hidden />
              <VacancyLocationLabel
                countryCode={vacancy.countryCode}
                stateCode={vacancy.stateCode}
                emptyLabel="Ubicación no especificada"
              />
            </p>
            <p className="text-xs text-white/46">{modalityLabel}</p>
          </div>
        </div>

        <div className="flex items-center justify-start lg:justify-end">
          <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-medium text-white/82 transition-colors hover:border-[#8dd8ff]/40 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#f0a7ff] focus:ring-offset-2 focus:ring-offset-[#161d34]"
          >
            Ver detalle
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  )
}

function OpportunityCardSkeleton() {
  return (
    <div className="grid animate-pulse gap-4 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(180px,1fr)_minmax(220px,1fr)_auto] lg:items-center lg:gap-6 lg:px-6">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-white/10" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-44 rounded-xl bg-white/10" />
          <div className="h-4 w-40 rounded-lg bg-white/10" />
        </div>
      </div>
      <div className="h-4 w-32 rounded-lg bg-white/10" />
      <div className="space-y-2">
        <div className="h-4 w-36 rounded-lg bg-white/10" />
        <div className="h-3 w-24 rounded-lg bg-white/10" />
      </div>
      <div className="h-10 w-28 rounded-full bg-white/10" />
    </div>
  )
}

function OpportunityTableHeader() {
  return (
    <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(180px,1fr)_minmax(220px,1fr)_auto] gap-6 border-b border-white/10 px-6 py-4 text-[11px] uppercase tracking-[0.22em] text-white/40 lg:grid">
      <span>Vacante</span>
      <span>Departamento</span>
      <span>Ubicación</span>
      <span className="text-right">Acción</span>
    </div>
  )
}

function OpportunityTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/10">
      <OpportunityTableHeader />
      <div className="divide-y divide-white/10">
        {Array.from({ length: 4 }).map((_, index) => (
          <OpportunityCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}

function ActiveFilterChip({ label, value, onRemove }: ActiveFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-xs font-medium text-white/82 transition-colors hover:bg-white/12 focus:outline-none focus:ring-2 focus:ring-[#f0a7ff] focus:ring-offset-2 focus:ring-offset-[#161d34]"
    >
      <span className="text-white/52">{label}:</span>
      <span>{value}</span>
      <X className="h-3.5 w-3.5 text-white/56" aria-hidden />
    </button>
  )
}

export function PublicVacanciesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentQueryString = searchParams.toString()

  const queryState = useMemo(
    () => getQueryState(new URLSearchParams(currentQueryString)),
    [currentQueryString]
  )
  const requestFilters = useMemo(() => toRequestFilters(queryState), [queryState])

  const [searchInput, setSearchInput] = useState(queryState.vacanteName)
  const [response, setResponse] = useState<OpportunityListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)

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
            : "No se pudieron cargar las oportunidades."
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

  const handleClearAll = useCallback(() => {
    setSearchInput("")
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  const selectedDepartmentLabel = resolveSelectedFilterLabel(
    response?.availableFilters.departments ?? [],
    queryState.departmentId,
    queryState.departmentCode
  )
  const selectedModalityLabel = resolveSelectedFilterLabel(
    response?.availableFilters.modalities ?? [],
    queryState.modalityId,
    queryState.modalityCode
  )
  const selectedCountryLabel = getCountryFilterLabel(queryState)
  const normalizedVacanteName = searchInput.trim().toLowerCase()
  const filteredItems = useMemo(() => {
    const items = response?.items ?? []
    if (!normalizedVacanteName) return items

    return items.filter((vacancy) =>
      vacancy.title.trim().toLowerCase().includes(normalizedVacanteName)
    )
  }, [normalizedVacanteName, response?.items])
  const hasVisibleFilterChips = Boolean(
    selectedDepartmentLabel || selectedModalityLabel || selectedCountryLabel
  )

  const hasActiveFilters = Boolean(
    normalizedVacanteName ||
      queryState.departmentId ||
      queryState.departmentCode ||
      queryState.modalityId ||
      queryState.modalityCode ||
      queryState.country ||
      queryState.countryCode
  )

  const totalCount = normalizedVacanteName
    ? filteredItems.length
    : response?.pagination.totalCount ?? 0
  const currentPage = response?.pagination.page ?? queryState.page
  const totalPages = response?.pagination.totalPages ?? 1
  const resultsSummary = buildResultsSummary({
    totalCount,
    currentPage,
    search: searchInput.trim(),
    department: selectedDepartmentLabel,
    modality: selectedModalityLabel,
    country: selectedCountryLabel,
    isLoading,
  })

  return (
    <div
      id="public-opportunities-top"
      className="relative min-h-screen overflow-hidden bg-[#0b1224] text-white"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[580px] bg-[linear-gradient(180deg,#5b2b86_0%,#25365d_34%,#0b1224_100%)]" />
        <div className="absolute left-[-10%] top-8 h-72 w-72 rounded-full bg-[#c73277]/28 blur-3xl" />
        <div className="absolute right-[2%] top-16 h-80 w-80 rounded-full bg-[#71bced]/18 blur-3xl" />
        <div className="absolute inset-x-0 top-[360px] h-px bg-linear-to-r from-transparent via-white/12 to-transparent" />
        <div className="absolute bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#6e3385]/12 blur-3xl" />
      </div>

      <PublicOpportunitiesNavbar className="mb-6" />

      <div className="relative flex w-full flex-col px-4 pb-6 pt-5 sm:px-6 sm:pt-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">

        <header className={`relative overflow-hidden rounded-[36px] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12 ${darkPanelClassName}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_26%),radial-gradient(circle_at_top_right,rgba(199,50,119,0.34),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(113,188,237,0.18),transparent_28%)]" />
          <div className="absolute -right-14 top-0 hidden h-48 w-48 rounded-full border border-white/10 bg-white/5 blur-2xl lg:block" />

          <div className="relative max-w-3xl space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/7 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-white/76">
                <Sparkles className="h-3.5 w-3.5 text-[#f5b0ff]" aria-hidden />
                Portal de oportunidades
              </p>

              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-[3.45rem]">
                  Encontrá oportunidades con una lectura clara desde el primer vistazo
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                  Explorá vacantes activas por departamento, modalidad y contexto de trabajo
                  en una experiencia pública pensada para descubrir rápido y decidir mejor.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="#public-opportunities-explorer"
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-[#18213d] transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#161d34]"
                >
                  Explorar oportunidades
                </Link>
              </div>
          </div>
        </header>

        <section
          id="public-opportunities-explorer"
          className={`relative mt-6 overflow-hidden rounded-[36px] p-5 scroll-mt-6 sm:p-6 lg:p-7 ${darkPanelClassName}`}
          aria-labelledby="public-opportunities-explorer-title"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(199,50,119,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(113,188,237,0.14),transparent_24%)]" />

          <div className="relative">
            <div className={`rounded-[30px] p-5 sm:p-6 ${softPanelClassName}`}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/60">
                    <Layers3 className="h-3.5 w-3.5 text-[#8dd8ff]" aria-hidden />
                    Exploración pública
                  </div>
                  <div className="space-y-2">
                    <h2
                      id="public-opportunities-explorer-title"
                      className="text-2xl font-semibold tracking-tight text-white sm:text-[2rem]"
                    >
                      Oportunidades disponibles
                    </h2>
                    <p className="text-sm leading-7 text-white/64">{resultsSummary}</p>
                  </div>
                </div>

                <div className="w-full lg:max-w-xl">
                  <label htmlFor="public-vacancies-search" className="sr-only">
                    Buscar vacantes
                  </label>
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                      aria-hidden
                    />
                    <input
                      id="public-vacancies-search"
                      type="search"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Buscar vacantes por nombre"
                      className="h-12 w-full rounded-full border border-white/10 bg-white/6 pl-11 pr-4 text-sm text-white placeholder:text-white/38 focus:outline-none focus:ring-2 focus:ring-[#f0a7ff]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <main className="min-w-0">
                <section className={`relative overflow-hidden rounded-[30px] p-5 sm:p-6 ${softPanelClassName}`}>
                  <div className={hasVisibleFilterChips ? "flex flex-col gap-5 border-b border-white/10 pb-5" : ""}>
                    {hasVisibleFilterChips ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedDepartmentLabel ? (
                          <ActiveFilterChip
                            label="Departamento"
                            value={selectedDepartmentLabel}
                            onRemove={() =>
                              updateQuery({
                                departmentId: null,
                                departmentCode: null,
                                page: null,
                              })
                            }
                          />
                        ) : null}
                        {selectedModalityLabel ? (
                          <ActiveFilterChip
                            label="Modalidad"
                            value={selectedModalityLabel}
                            onRemove={() =>
                              updateQuery({
                                modalityId: null,
                                modalityCode: null,
                                page: null,
                              })
                            }
                          />
                        ) : null}
                        {selectedCountryLabel ? (
                          <ActiveFilterChip
                            label="País"
                            value={selectedCountryLabel}
                            onRemove={() =>
                              updateQuery({
                                country: null,
                                countryCode: null,
                                page: null,
                              })
                            }
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className={hasVisibleFilterChips ? "mt-6" : ""}>
                    {errorMessage ? (
                      <div
                        className="rounded-[28px] border border-[#ff93ca]/30 bg-[rgba(199,50,119,0.12)] px-5 py-6 text-sm text-[#ffd0e7]"
                        role="alert"
                      >
                        <p>{errorMessage}</p>
                        <button
                          type="button"
                          onClick={() => setRetryToken((current) => current + 1)}
                          className="mt-3 font-medium text-white hover:text-[#ffd0e7]"
                        >
                          Intentar de nuevo
                        </button>
                      </div>
                    ) : isLoading ? (
                      <OpportunityTableSkeleton />
                    ) : filteredItems.length ? (
                      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/10">
                        <OpportunityTableHeader />
                        <div>
                          {filteredItems.map((vacancy) => (
                            <OpportunityCard
                              key={vacancy.id}
                              vacancy={vacancy}
                              queryString={currentQueryString}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[30px] border border-dashed border-white/12 bg-white/5 px-6 py-12 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/10 bg-white/8 text-[#f2adff] shadow-[0_24px_60px_rgba(110,51,133,0.18)]">
                          <Briefcase className="h-7 w-7" aria-hidden />
                        </div>
                        <h3 className="mt-5 text-2xl font-semibold text-white">
                          No encontramos vacantes con esos filtros.
                        </h3>
                        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/62">
                          Conservamos tu contexto actual para que puedas ajustar la búsqueda,
                          remover chips o volver a explorar todas las oportunidades disponibles.
                        </p>
                        {hasActiveFilters ? (
                          <div className="mt-6">
                            <Button
                              type="button"
                              className="rounded-full bg-vo-pink px-6 py-3 text-[#18213d]"
                              onClick={handleClearAll}
                            >
                              Ver todas las vacantes
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {!isLoading && !errorMessage && totalPages > 1 ? (
                    <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-white/58">
                        Página {currentPage} de {totalPages}
                      </p>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full border-white/12 bg-white/6 px-4 py-2 text-white hover:bg-white/10"
                          onClick={() => updateQuery({ page: currentPage - 1 })}
                          disabled={currentPage <= 1}
                        >
                          <ChevronLeft className="h-4 w-4" aria-hidden />
                          Anterior
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full border-white/12 bg-white/6 px-4 py-2 text-white hover:bg-white/10"
                          onClick={() => updateQuery({ page: currentPage + 1 })}
                          disabled={currentPage >= totalPages}
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </section>
              </main>
            </div>
          </div>
        </section>

        </div>

      </div>
    </div>
  )
}
