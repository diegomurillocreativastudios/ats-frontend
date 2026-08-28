import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { ConsentAuthorizationModal } from "@/components/candidato/consent-authorization-modal"
import { resetPhoneCountriesCache } from "@/lib/phone-countries"
import esMessages from "@/messages/es.json"

vi.mock("@countrystatecity/countries-browser", () => ({
  getCountries: vi.fn(async () => [
    { iso2: "SV", name: "El Salvador", phonecode: "503" },
    { iso2: "US", name: "United States", phonecode: "1" },
  ]),
}))

const completeInitialValues = {
  firstNames: "Ana",
  lastNames: "Garcia",
  documentId: "00123456-7",
  email: "ana@example.com",
  phone: "1234-5678",
  phoneCountryIso2: "SV",
}

function renderModal(
  props?: Partial<Parameters<typeof ConsentAuthorizationModal>[0]>
) {
  const onAccept = vi.fn()
  const onClose = vi.fn()
  render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <ConsentAuthorizationModal
        isOpen
        onClose={onClose}
        onAccept={onAccept}
        variant="public"
        {...props}
      />
    </NextIntlClientProvider>
  )
  return { onAccept, onClose }
}

describe("ConsentAuthorizationModal contrast", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPhoneCountriesCache()
    Element.prototype.scrollIntoView = vi.fn()
  })

  it("muestra Confirmo mi aceptación final deshabilitado y con bajo énfasis si el formulario está incompleto", async () => {
    renderModal()

    fireEvent.click(
      screen.getByRole("button", {
        name: "Aceptación (firma y datos del candidato)",
      })
    )

    const confirm = await screen.findByText("Confirmo mi aceptación final")
    expect(confirm.closest("label")?.className).toContain("cursor-not-allowed")
    expect(confirm.closest("label")?.className).toContain("bg-muted")
    expect(
      screen.getByRole("checkbox", { name: "Confirmo mi aceptación final" })
    ).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Enviar autorización" })
    ).toBeDisabled()
  })

  it("hace perceptible el cambio de estado al completar el formulario y marcar la última sección", async () => {
    renderModal({ initialValues: completeInitialValues })

    const confirmCheckbox = await screen.findByRole("checkbox", {
      name: "Confirmo mi aceptación final",
    })

    await waitFor(() => {
      expect(confirmCheckbox).toBeEnabled()
    })

    const confirm = screen.getByText("Confirmo mi aceptación final")
    const confirmClass = confirm.closest("label")?.className ?? ""
    expect(confirmClass).toContain("bg-white")
    expect(confirmClass).toContain("text-emerald-950")
    expect(confirmClass).toContain("border-emerald-800")
    expect(confirmClass).not.toContain("cursor-not-allowed")

    const submit = screen.getByRole("button", { name: "Enviar autorización" })
    expect(submit).toBeDisabled()
    expect(submit.className).toContain("bg-emerald-800")
    expect(submit.className).toContain("disabled:bg-muted")
    expect(submit.className).toContain("disabled:text-foreground")

    for (const checkbox of screen.getAllByRole("checkbox", {
      name: "He leído y acepto esta sección",
    })) {
      fireEvent.click(checkbox)
    }
    fireEvent.click(confirmCheckbox)

    await waitFor(() => {
      const acceptedClass = confirm.closest("label")?.className ?? ""
      expect(acceptedClass).toContain("bg-emerald-800")
      expect(acceptedClass).toContain("text-white")
      expect(submit).toBeEnabled()
    })
  })
})
