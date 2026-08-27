"use client"

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown, Search } from "lucide-react"
import { countryFlagPngUrl, iso2ToFlagEmoji } from "@/lib/country-flag"
import {
  filterPhoneCountries,
  getCachedPhoneCountries,
  loadPhoneCountries,
  type PhoneCountryOption,
} from "@/lib/phone-countries"

export type PhoneCountryInputSurface = "default" | "public-light" | "public-dark"

interface PhoneCountryInputProps {
  id?: string
  name?: string
  phone: string
  countryIso2: string
  onPhoneChange: (phone: string) => void
  onCountryChange: (iso2: string) => void
  disabled?: boolean
  placeholder?: string
  countryAriaLabel: string
  loadingLabel: string
  searchPlaceholder: string
  emptyResultsLabel: string
  required?: boolean
  surface?: PhoneCountryInputSurface
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

interface PhoneCountrySurfaceClasses {
  wrapper: string
  triggerWrap: string
  trigger: string
  chevron: string
  input: string
  panel: string
  searchWrap: string
  search: string
  option: string
  optionActive: string
}

function getPhoneCountrySurfaceClasses(
  surface: PhoneCountryInputSurface,
  disabled: boolean
): PhoneCountrySurfaceClasses {
  const disabledClass = disabled ? "opacity-60" : ""

  if (surface === "public-light") {
    return {
      wrapper: [
        "flex h-11 rounded-lg border border-border bg-background transition",
        "focus-within:ring-2 focus-within:ring-ats-terracotta",
        disabledClass,
      ].join(" "),
      triggerWrap: "relative shrink-0",
      trigger: [
        "inline-flex h-full w-[7.25rem] cursor-pointer items-center gap-1.5 bg-transparent",
        "py-2 pr-7 pl-3 text-left focus:outline-none disabled:cursor-not-allowed",
      ].join(" "),
      chevron:
        "pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground",
      input:
        "block h-full min-w-0 grow bg-transparent py-2 pr-3 pl-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed",
      panel:
        "fixed z-[250] flex max-h-[min(22rem,70vh)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg",
      searchWrap: "border-b border-border p-2",
      search:
        "h-9 w-full rounded-md border border-border bg-background py-1.5 pr-3 pl-8 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ats-terracotta",
      option:
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted/70",
      optionActive: "bg-ats-terracotta/10",
    }
  }

  if (surface === "public-dark") {
    return {
      wrapper: [
        "flex h-11 rounded-2xl border border-border bg-muted/35 transition",
        "focus-within:ring-2 focus-within:ring-ats-cobre",
        disabledClass,
      ].join(" "),
      triggerWrap: "relative shrink-0",
      trigger: [
        "inline-flex h-full w-[7.5rem] cursor-pointer items-center gap-1.5 bg-transparent",
        "py-2 pr-8 pl-4 text-left focus:outline-none disabled:cursor-not-allowed",
      ].join(" "),
      chevron:
        "pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground",
      input:
        "block h-full min-w-0 grow bg-transparent py-2 pr-4 pl-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed",
      panel:
        "fixed z-[250] flex max-h-[min(22rem,70vh)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-[#2A2B2E] shadow-[0_18px_48px_rgba(7,12,27,0.55)]",
      searchWrap: "border-b border-border p-2",
      search:
        "h-9 w-full rounded-xl border border-border bg-muted/35 py-1.5 pr-3 pl-8 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ats-cobre",
      option:
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-white/8",
      optionActive: "bg-white/10",
    }
  }

  return {
    wrapper: [
      "flex overflow-hidden rounded-md border border-input bg-background",
      "focus-within:ring-2 focus-within:ring-vo-purple focus-within:border-transparent",
      disabledClass,
    ].join(" "),
    triggerWrap: "relative shrink-0 border-r border-input",
    trigger: [
      "inline-flex h-10 w-[7.5rem] cursor-pointer items-center gap-1.5 bg-muted/40",
      "py-2 pr-8 pl-3 text-left font-sans text-sm focus:outline-none disabled:cursor-not-allowed",
    ].join(" "),
    chevron:
      "pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground",
    input:
      "block h-10 min-w-0 grow bg-transparent px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed",
    panel:
      "fixed z-[250] flex max-h-[min(22rem,70vh)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg",
    searchWrap: "border-b border-border p-2",
    search:
      "h-9 w-full rounded-md border border-input bg-background py-1.5 pr-3 pl-8 font-sans text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-vo-purple",
    option:
      "flex w-full items-center gap-2 px-3 py-2 text-left font-sans text-sm text-foreground hover:bg-muted",
    optionActive: "bg-muted",
  }
}

function CountryFlag({ iso2 }: { iso2: string }) {
  const src = countryFlagPngUrl(iso2)
  const emoji = iso2ToFlagEmoji(iso2)
  const [loadedIso2, setLoadedIso2] = useState<string | null>(null)
  const showPng = loadedIso2 === iso2

  if (!src && !emoji) return null

  return (
    <span className="relative inline-flex h-4 w-5 shrink-0 items-center justify-center overflow-hidden rounded-[2px]">
      {emoji ? (
        <span aria-hidden className="text-[1.05rem] leading-none">
          {emoji}
        </span>
      ) : null}
      {src ? (
        <img
          key={iso2}
          src={src}
          alt=""
          width={20}
          height={15}
          decoding="async"
          draggable={false}
          onLoad={() => setLoadedIso2(iso2)}
          onError={() => setLoadedIso2(null)}
          className={`absolute inset-0 h-4 w-5 object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.12)] ${
            showPng ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}
    </span>
  )
}

function getPanelStyle(anchor: HTMLElement | null): CSSProperties {
  if (!anchor) return { display: "none" }
  const rect = anchor.getBoundingClientRect()
  const width = Math.min(352, Math.max(rect.width, 280), window.innerWidth - 16)
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)
  const spaceBelow = window.innerHeight - rect.bottom
  const openUp = spaceBelow < 288 && rect.top > spaceBelow

  if (openUp) {
    return {
      left,
      width,
      bottom: window.innerHeight - rect.top + 4,
    }
  }

  return {
    left,
    width,
    top: rect.bottom + 4,
  }
}

/**
 * Teléfono con selector de país (bandera + prefijo) y campo numérico.
 * El listado se monta solo al abrir y se filtra por nombre, ISO o código.
 */
export const PhoneCountryInput = memo(function PhoneCountryInput({
  id,
  name,
  phone,
  countryIso2,
  onPhoneChange,
  onCountryChange,
  disabled = false,
  placeholder,
  countryAriaLabel,
  loadingLabel,
  searchPlaceholder,
  emptyResultsLabel,
  required = false,
  surface = "default",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: PhoneCountryInputProps) {
  const generatedId = useId()
  const phoneId = id ?? generatedId
  const listboxId = `${phoneId}-countries`
  const searchId = `${phoneId}-country-search`
  const classes = getPhoneCountrySurfaceClasses(surface, disabled)
  const normalizedIso2 = countryIso2.toUpperCase()

  const [countries, setCountries] = useState<PhoneCountryOption[]>(
    () => getCachedPhoneCountries() ?? []
  )
  const [isLoading, setIsLoading] = useState(
    () => getCachedPhoneCountries() == null
  )
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (getCachedPhoneCountries()) return
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const rows = await loadPhoneCountries()
        if (!cancelled) setCountries(rows)
      } catch {
        if (!cancelled) setCountries([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedCountry = useMemo(
    () => countries.find((country) => country.iso2 === normalizedIso2),
    [countries, normalizedIso2]
  )

  const filteredCountries = useMemo(
    () => filterPhoneCountries(countries, query),
    [countries, query]
  )

  const updatePanelPosition = useCallback(() => {
    setPanelStyle(getPanelStyle(triggerRef.current))
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) return
    updatePanelPosition()
    window.addEventListener("resize", updatePanelPosition)
    window.addEventListener("scroll", updatePanelPosition, true)
    return () => {
      window.removeEventListener("resize", updatePanelPosition)
      window.removeEventListener("scroll", updatePanelPosition, true)
    }
  }, [isOpen, updatePanelPosition])

  useLayoutEffect(() => {
    if (!isOpen) return
    const selectedIndex = countries.findIndex(
      (country) => country.iso2 === normalizedIso2
    )
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [countries, isOpen, normalizedIso2])

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const option = filteredCountries[activeIndex]
    if (!option) return
    const node = listRef.current?.querySelector(
      `[data-country-iso="${option.iso2}"]`
    )
    if (node instanceof HTMLElement && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex, filteredCountries, isOpen])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setQuery("")
  }, [])

  const handleSelectCountry = useCallback(
    (iso2: string) => {
      onCountryChange(iso2)
      handleClose()
      window.requestAnimationFrame(() => {
        phoneRef.current?.focus()
      })
    },
    [handleClose, onCountryChange]
  )

  const handleToggleOpen = useCallback(() => {
    if (disabled || isLoading) return
    setIsOpen((open) => {
      if (open) {
        setQuery("")
        return false
      }
      return true
    })
  }, [disabled, isLoading])

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setActiveIndex((index) =>
          filteredCountries.length === 0
            ? 0
            : Math.min(index + 1, filteredCountries.length - 1)
        )
        return
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setActiveIndex((index) => Math.max(index - 1, 0))
        return
      }
      if (event.key === "Home") {
        event.preventDefault()
        setActiveIndex(0)
        return
      }
      if (event.key === "End") {
        event.preventDefault()
        setActiveIndex(Math.max(filteredCountries.length - 1, 0))
        return
      }
      if (event.key === "Enter") {
        event.preventDefault()
        const country = filteredCountries[activeIndex]
        if (country) handleSelectCountry(country.iso2)
        return
      }
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        handleClose()
        triggerRef.current?.focus()
      }
    },
    [activeIndex, filteredCountries, handleClose, handleSelectCountry]
  )

  const activeCountry = filteredCountries[activeIndex]
  const triggerLabel = selectedCountry
    ? `${countryAriaLabel}: ${selectedCountry.name} ${selectedCountry.phonecode}`
    : countryAriaLabel

  return (
    <div className={classes.wrapper}>
      <div className={classes.triggerWrap}>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled || isLoading}
          aria-label={triggerLabel}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          onClick={handleToggleOpen}
          className={classes.trigger}
        >
          {isLoading ? (
            <span className="truncate text-xs text-muted-foreground">
              {loadingLabel}
            </span>
          ) : (
            <>
              <CountryFlag iso2={normalizedIso2} />
              <span className="truncate text-sm text-muted-foreground">
                {selectedCountry?.phonecode}
              </span>
            </>
          )}
        </button>
        <ChevronDown aria-hidden className={classes.chevron} />
      </div>

      <input
        ref={phoneRef}
        id={phoneId}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        required={required}
        value={phone}
        onChange={(event) => onPhoneChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={classes.input}
      />

      {isOpen
        ? createPortal(
            <div
              ref={panelRef}
              className={classes.panel}
              style={panelStyle}
            >
              <div className={classes.searchWrap}>
                <div className="relative">
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    ref={searchRef}
                    id={searchId}
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded="true"
                    aria-controls={listboxId}
                    aria-activedescendant={
                      activeCountry ? `${listboxId}-${activeCountry.iso2}` : undefined
                    }
                    aria-label={searchPlaceholder}
                    placeholder={searchPlaceholder}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value)
                      setActiveIndex(0)
                    }}
                    onKeyDown={handleSearchKeyDown}
                    className={classes.search}
                  />
                </div>
              </div>
              <div
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-label={countryAriaLabel}
                className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-1"
              >
                {filteredCountries.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    {emptyResultsLabel}
                  </p>
                ) : (
                  filteredCountries.map((country, index) => {
                    const isSelected = country.iso2 === normalizedIso2
                    const isActive = index === activeIndex
                    return (
                      <button
                        key={country.iso2}
                        id={`${listboxId}-${country.iso2}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        data-country-iso={country.iso2}
                        className={`${classes.option} ${isActive ? classes.optionActive : ""}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => handleSelectCountry(country.iso2)}
                      >
                        <span
                          aria-hidden
                          className="w-6 shrink-0 text-center text-[1.05rem] leading-none"
                        >
                          {iso2ToFlagEmoji(country.iso2)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {country.name}
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          {country.phonecode}
                        </span>
                        {isSelected ? (
                          <Check
                            aria-hidden
                            className="size-4 shrink-0 text-ats-terracotta"
                          />
                        ) : (
                          <span aria-hidden className="size-4 shrink-0" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
})
