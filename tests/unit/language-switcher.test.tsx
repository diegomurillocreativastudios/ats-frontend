import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import LanguageSwitcher from "@/components/language-switcher"
import { locales, localeCookieName, type Locale } from "@/i18n/routing"
import esMessages from "@/messages/es.json"

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }))

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

function renderSwitcher(locale: Locale = "es") {
  return render(
    <NextIntlClientProvider locale={locale} messages={esMessages}>
      <LanguageSwitcher />
    </NextIntlClientProvider>
  )
}

const openMenu = () =>
  fireEvent.click(screen.getByRole("button", { name: "Idioma" }))

beforeEach(() => {
  refreshMock.mockClear()
  // Reset NEXT_LOCALE cookie between tests
  document.cookie = `${localeCookieName}=; path=/; max-age=0`
})

describe("LanguageSwitcher (Etapa 2)", () => {
  it("renderiza el botón disparador con la etiqueta accesible de idioma", () => {
    renderSwitcher("es")
    expect(screen.getByRole("button", { name: "Idioma" })).toBeInTheDocument()
  })

  it("muestra los 5 idiomas soportados (endónimos) al abrir el menú", () => {
    renderSwitcher("es")
    openMenu()

    const listbox = screen.getByRole("listbox", { name: "Idioma" })
    const options = within(listbox).getAllByRole("option")

    expect(options).toHaveLength(locales.length)
    const labels = options.map((option) => within(option).getByText(/.+/).textContent)
    expect(labels).toEqual(["Español", "English", "Italiano", "Deutsch", "Français"])
  })

  it("marca el locale activo como seleccionado", () => {
    renderSwitcher("en")
    openMenu()

    const activeOption = screen.getByRole("option", { selected: true })
    expect(within(activeOption).getByText("English")).toBeInTheDocument()
  })

  it("persiste el idioma elegido en la cookie NEXT_LOCALE y refresca la UI", () => {
    renderSwitcher("es")
    openMenu()

    fireEvent.click(screen.getByRole("option", { name: "Inglés" }))

    expect(document.cookie).toContain(`${localeCookieName}=en`)
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it("no refresca si se elige el locale ya activo", () => {
    renderSwitcher("es")
    openMenu()

    fireEvent.click(screen.getByRole("option", { name: "Español" }))

    expect(refreshMock).not.toHaveBeenCalled()
  })
})
