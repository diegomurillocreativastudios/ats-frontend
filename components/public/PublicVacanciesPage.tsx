"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import {
  ArrowRight,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers3,
  MapPin,
  Search,
  Sparkles,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import {
  listPublicVacancies,
  type OpportunityFilterOption,
  type OpportunityListFilters,
  type OpportunityListResponse,
  type OpportunityVacancySummary,
} from "@/lib/api/public-vacancies"
import { PublicOpportunitiesNavbar } from "@/components/public/PublicOpportunitiesNavbar"

interface QueryState {
  departmentId: string
  departmentCode: string
  modalityId: string
  modalityCode: string
  search: string
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
  "border border-white/10 bg-[linear-gradient(180deg,rgba(35,45,76,0.94)_0%,rgba(19,27,50,0.96)_100%)] shadow-[0_24px_80px_rgba(7,12,27,0.42)] backdrop-blur"

const cardGlowClassName =
  "border border-white/10 bg-[linear-gradient(180deg,rgba(46,27,78,0.78)_0%,rgba(18,27,49,0.94)_100%)] shadow-[0_24px_70px_rgba(4,9,21,0.42)]"

function getQueryState(searchParams: URLSearchParams): QueryState {
  const pageValue = Number(searchParams.get("page") ?? "1")

  return {
    departmentId: searchParams.get("departmentId")?.trim() ?? "",
    departmentCode: searchParams.get("departmentCode")?.trim() ?? "",
    modalityId: searchParams.get("modalityId")?.trim() ?? "",
    modalityCode: searchParams.get("modalityCode")?.trim() ?? "",
    search: searchParams.get("search")?.trim() ?? "",
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
    search: queryState.search || undefined,
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

function OpportunityCard({
  vacancy,
  queryString,
}: {
  vacancy: OpportunityVacancySummary
  queryString: string
}) {
  const metadata = [
    vacancy.department?.displayName ?? "No especificado",
    vacancy.modality?.displayName ?? "No especificado",
    vacancy.countryLabel ?? vacancy.locationLabel ?? "No especificado",
  ]

  const publishedLabel = formatPublishedLabel(vacancy.publishedAt)
  const href = `/oportunidades/${vacancy.id}${queryString ? `?${queryString}` : ""}`

  return (
    <article className={`group relative overflow-hidden rounded-[30px] p-px ${cardGlowClassName}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(199,50,119,0.35),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(113,188,237,0.2),transparent_30%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative rounded-[29px] bg-[linear-gradient(180deg,rgba(24,32,57,0.92)_0%,rgba(15,20,40,0.96)_100%)] p-5 text-white sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/78">
                <Sparkles className="h-3.5 w-3.5 text-[#f0a7ff]" aria-hidden />
                Oportunidad abierta
              </p>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
                  <Link
                    href={href}
                    className="transition-colors hover:text-[#ffc2fb] focus:outline-none focus:ring-2 focus:ring-[#f0a7ff] focus:ring-offset-2 focus:ring-offset-[#161d34]"
                  >
                    {vacancy.title}
                  </Link>
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/72">
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#8dd8ff]" aria-hidden />
                    {vacancy.company.name}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#f6c482]" aria-hidden />
                    {vacancy.locationLabel ??
                      vacancy.countryLabel ??
                      "Ubicación no especificada"}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-white/12 bg-white/8 text-sm font-semibold text-white/88 sm:flex">
              {getCompanyInitials(vacancy.company.name) || "AT"}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {metadata.map((item, index) => (
                  <span
                    key={`${vacancy.id}-metadata-${index}-${item}`}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/7 px-3 py-1 text-xs font-medium text-white/82"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <p className="line-clamp-3 text-sm leading-7 text-white/72">
                {vacancy.summary ??
                  "Explorá el detalle para conocer responsabilidades, requisitos y el contexto completo de esta vacante."}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/10 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">
                Vista rápida
              </p>
              <div className="mt-3 space-y-3 text-sm text-white/78">
                <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Departamento
                  </p>
                  <p className="mt-1 font-medium text-white">
                    {vacancy.department?.displayName ?? "No especificado"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Modalidad
                  </p>
                  <p className="mt-1 font-medium text-white">
                    {vacancy.modality?.displayName ?? "No especificado"}
                  </p>
                </div>
                {publishedLabel ? (
                  <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                      Publicada
                    </p>
                    <p className="mt-1 font-medium text-white">{publishedLabel}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-xs uppercase tracking-[0.22em] text-white/42">
              Perfil público ATS
            </p>
            <Link
              href={href}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#ffc2fb] transition-transform duration-200 hover:translate-x-1 focus:outline-none focus:ring-2 focus:ring-[#f0a7ff] focus:ring-offset-2 focus:ring-offset-[#161d34]"
            >
              Ver detalle
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

function OpportunityCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(31,42,71,0.9)_0%,rgba(18,25,44,0.94)_100%)] p-6">
      <div className="space-y-4">
        <div className="h-6 w-36 rounded-full bg-white/10" />
        <div className="h-9 w-2/3 rounded-2xl bg-white/10" />
        <div className="h-5 w-1/2 rounded-xl bg-white/10" />
        <div className="flex flex-wrap gap-2">
          <div className="h-8 w-28 rounded-full bg-white/10" />
          <div className="h-8 w-24 rounded-full bg-white/10" />
          <div className="h-8 w-20 rounded-full bg-white/10" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-white/10" />
          <div className="h-4 w-[92%] rounded bg-white/10" />
          <div className="h-4 w-[68%] rounded bg-white/10" />
        </div>
      </div>
    </div>
  )
}

function FilterOptionButton({
  option,
  isActive,
  onClick,
}: {
  option: OpportunityFilterOption
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-[20px] border px-4 py-3 text-left text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#f0a7ff] focus:ring-offset-2 focus:ring-offset-[#18213d] ${
        isActive
          ? "border-[#f0a7ff]/40 bg-[linear-gradient(180deg,rgba(199,50,119,0.2)_0%,rgba(110,51,133,0.18)_100%)] text-white shadow-[0_18px_40px_rgba(110,51,133,0.22)]"
          : "border-white/10 bg-white/5 text-white/78 hover:border-white/20 hover:bg-white/8"
      }`}
      aria-pressed={isActive}
    >
      <span className="min-w-0 truncate font-medium">{option.displayName}</span>
      {option.count != null ? (
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            isActive ? "bg-white/12 text-white" : "bg-white/8 text-white/56"
          }`}
        >
          {option.count}
        </span>
      ) : null}
    </button>
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

  const [searchInput, setSearchInput] = useState(queryState.search)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [response, setResponse] = useState<OpportunityListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    setSearchInput(queryState.search)
  }, [queryState.search])

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

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      updateQuery({
        search: searchInput.trim() || null,
        page: null,
      })
    },
    [searchInput, updateQuery]
  )

  const handleToggleDepartment = useCallback(
    (option: OpportunityFilterOption) => {
      const isSameOption = matchesSelectedFilter(
        option,
        queryState.departmentId,
        queryState.departmentCode
      )

      updateQuery({
        departmentId: isSameOption ? null : option.id,
        departmentCode: null,
        page: null,
      })
    },
    [queryState.departmentCode, queryState.departmentId, updateQuery]
  )

  const handleToggleModality = useCallback(
    (option: OpportunityFilterOption) => {
      const isSameOption = matchesSelectedFilter(
        option,
        queryState.modalityId,
        queryState.modalityCode
      )

      updateQuery({
        modalityId: isSameOption ? null : option.id,
        modalityCode: null,
        page: null,
      })
    },
    [queryState.modalityCode, queryState.modalityId, updateQuery]
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

  const hasActiveFilters = Boolean(
    queryState.search ||
      queryState.departmentId ||
      queryState.departmentCode ||
      queryState.modalityId ||
      queryState.modalityCode ||
      queryState.country ||
      queryState.countryCode
  )

  const totalCount = response?.pagination.totalCount ?? 0
  const currentPage = response?.pagination.page ?? queryState.page
  const totalPages = response?.pagination.totalPages ?? 1
  const totalDepartments = response?.availableFilters.departments.length ?? 0
  const totalModalities = response?.availableFilters.modalities.length ?? 0

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1224] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[540px] bg-[linear-gradient(180deg,#5b2b86_0%,#25365d_40%,#0b1224_100%)]" />
        <div className="absolute left-[-8%] top-10 h-72 w-72 rounded-full bg-[#c73277]/28 blur-3xl" />
        <div className="absolute right-[8%] top-24 h-80 w-80 rounded-full bg-[#71bced]/18 blur-3xl" />
        <div className="absolute inset-x-0 top-[340px] h-px bg-linear-to-r from-transparent via-white/12 to-transparent" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <PublicOpportunitiesNavbar className="mb-6" />

        <header className={`relative overflow-hidden rounded-[36px] px-6 py-8 text-white sm:px-8 sm:py-10 lg:px-10 ${darkPanelClassName}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(199,50,119,0.35),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(113,188,237,0.18),transparent_24%)]" />
          <div className="absolute -right-10 top-0 hidden h-44 w-44 rounded-full border border-white/10 bg-white/5 blur-2xl lg:block" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end">
            <div className="max-w-3xl space-y-5">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/7 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-white/76">
                <Sparkles className="h-3.5 w-3.5 text-[#f5b0ff]" aria-hidden />
                Portal de oportunidades
              </p>

              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
                  Encontrá roles con una experiencia visual más clara, directa y memorable
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                  Rediseñamos el portal para que el contenido clave destaque desde el primer vistazo:
                  departamento, modalidad, contexto y navegación de postulación en una composición
                  inspirada en la referencia visual.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/auth/registrarse"
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-[#18213d] transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#161d34]"
                >
                  Crear cuenta
                </Link>
                <Link
                  href="/auth/iniciar-sesion"
                  className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/7 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/12 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#161d34]"
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[26px] border border-white/10 bg-black/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/48">Resultados</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {isLoading ? "--" : totalCount}
                </p>
                <p className="mt-1 text-sm text-white/62">vacantes activas visibles</p>
              </div>
              <div className="rounded-[26px] border border-white/10 bg-black/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/48">Departamentos</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {isLoading ? "--" : totalDepartments}
                </p>
                <p className="mt-1 text-sm text-white/62">opciones dinámicas desde backend</p>
              </div>
              <div className="rounded-[26px] border border-white/10 bg-black/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/48">Modalidades</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {isLoading ? "--" : totalModalities}
                </p>
                <p className="mt-1 text-sm text-white/62">preservadas en URL y detalle</p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="w-full lg:sticky lg:top-6 lg:max-w-xs">
            <div className={`overflow-hidden rounded-[30px] ${darkPanelClassName}`}>
              <button
                type="button"
                onClick={() => setIsFiltersOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left lg:cursor-default"
                aria-expanded={isFiltersOpen}
                aria-controls="public-vacancies-filters"
              >
                <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
                  <Filter className="h-4 w-4 text-[#f2adff]" aria-hidden />
                  Filtros inteligentes
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-white/60 transition-transform lg:hidden ${
                    isFiltersOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>

              <div
                id="public-vacancies-filters"
                className={`${isFiltersOpen ? "block" : "hidden"} border-t border-white/10 px-5 py-5 lg:block`}
              >
                <form onSubmit={handleSearchSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="public-vacancies-search"
                      className="text-sm font-medium text-white"
                    >
                      Buscar vacantes
                    </label>
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42"
                        aria-hidden
                      />
                      <input
                        id="public-vacancies-search"
                        type="search"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Ej. React, diseño, remoto"
                        className="h-12 w-full rounded-[20px] border border-white/10 bg-white/6 pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#f0a7ff]"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full justify-center rounded-full bg-white px-4 py-3 text-[#18213d] hover:bg-white"
                    >
                      Aplicar búsqueda
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-medium text-white">Departamentos</h2>
                      {selectedDepartmentLabel ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateQuery({
                              departmentId: null,
                              departmentCode: null,
                              page: null,
                            })
                          }
                          className="text-xs font-medium text-[#f5b0ff] hover:text-white"
                        >
                          Limpiar
                        </button>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      {response?.availableFilters.departments.length ? (
                        response.availableFilters.departments.map((option) => (
                          <FilterOptionButton
                            key={option.id}
                            option={option}
                            isActive={matchesSelectedFilter(
                              option,
                              queryState.departmentId,
                              queryState.departmentCode
                            )}
                            onClick={() => handleToggleDepartment(option)}
                          />
                        ))
                      ) : (
                        <p className="text-sm text-white/56">No hay departamentos disponibles.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-medium text-white">Modalidades</h2>
                      {selectedModalityLabel ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateQuery({
                              modalityId: null,
                              modalityCode: null,
                              page: null,
                            })
                          }
                          className="text-xs font-medium text-[#f5b0ff] hover:text-white"
                        >
                          Limpiar
                        </button>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      {response?.availableFilters.modalities.length ? (
                        response.availableFilters.modalities.map((option) => (
                          <FilterOptionButton
                            key={option.id}
                            option={option}
                            isActive={matchesSelectedFilter(
                              option,
                              queryState.modalityId,
                              queryState.modalityCode
                            )}
                            onClick={() => handleToggleModality(option)}
                          />
                        ))
                      ) : (
                        <p className="text-sm text-white/56">No hay modalidades disponibles.</p>
                      )}
                    </div>
                  </div>

                  {hasActiveFilters ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-center rounded-full border-white/12 bg-white/6 px-4 py-3 text-white hover:bg-white/10"
                      onClick={handleClearAll}
                    >
                      <X className="h-4 w-4" aria-hidden />
                      Limpiar filtros
                    </Button>
                  ) : null}
                </form>
              </div>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <section className={`relative overflow-hidden rounded-[32px] p-5 sm:p-6 ${darkPanelClassName}`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(199,50,119,0.18),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(113,188,237,0.14),transparent_20%)]" />

              <div className="relative flex flex-col gap-5 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/60">
                    <Layers3 className="h-3.5 w-3.5 text-[#8dd8ff]" aria-hidden />
                    Descubrimiento de vacantes
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white">
                    Vacantes disponibles
                  </h2>
                  <p className="text-sm text-white/62">
                    {isLoading
                      ? "Cargando oportunidades..."
                      : `${totalCount} oportunidad${totalCount === 1 ? "" : "es"} encontradas`}
                  </p>
                </div>

                {hasActiveFilters ? (
                  <div className="flex flex-wrap gap-2">
                    {queryState.search ? (
                      <ActiveFilterChip
                        label="Búsqueda"
                        value={queryState.search}
                        onRemove={() => updateQuery({ search: null, page: null })}
                      />
                    ) : null}
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
                  </div>
                ) : null}
              </div>

              <div className="relative mt-6">
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
                  <div className="grid gap-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <OpportunityCardSkeleton key={index} />
                    ))}
                  </div>
                ) : response?.items.length ? (
                  <div className="grid gap-4">
                    {response.items.map((vacancy) => (
                      <OpportunityCard
                        key={vacancy.id}
                        vacancy={vacancy}
                        queryString={currentQueryString}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[30px] border border-dashed border-white/12 bg-white/5 px-6 py-12 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/10 bg-white/8 text-[#f2adff] shadow-[0_24px_60px_rgba(110,51,133,0.18)]">
                      <Briefcase className="h-7 w-7" aria-hidden />
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold text-white">
                      No encontramos vacantes con esos filtros
                    </h3>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/62">
                      Probá con otro departamento o modalidad, o limpiá la búsqueda para volver
                      a ver todas las oportunidades disponibles.
                    </p>
                    {hasActiveFilters ? (
                      <div className="mt-6">
                        <Button
                          type="button"
                          className="rounded-full bg-white px-6 py-3 text-[#18213d] hover:bg-white"
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
    </div>
  )
}
