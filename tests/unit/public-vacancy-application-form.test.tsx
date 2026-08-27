import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PublicVacancyApplicationForm } from "@/components/public/PublicVacancyApplicationForm"
import { resetPhoneCountriesCache } from "@/lib/phone-countries"
import esMessages from "@/messages/es.json"

vi.mock("@/lib/api/identity-document-types", () => ({
  listIdentityDocumentTypes: vi.fn(async () => [
    { id: "doc-dui", code: "DUI", name: "DUI" },
  ]),
}))

vi.mock("@/components/candidato/consent-authorization-modal", () => ({
  ConsentAuthorizationModal: () => null,
}))

vi.mock("@/components/public/ApplyEmailConfirmationModal", () => ({
  ApplyEmailConfirmationModal: () => null,
}))

vi.mock("@countrystatecity/countries-browser", () => ({
  getCountries: vi.fn(async () => [
    { iso2: "SV", name: "El Salvador", phonecode: "503" },
    { iso2: "US", name: "United States", phonecode: "1" },
  ]),
}))

function renderForm() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <PublicVacancyApplicationForm vacancyId="vac-1" />
    </NextIntlClientProvider>
  )
}

describe("PublicVacancyApplicationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPhoneCountriesCache()
  })

  it("muestra nombres y apellidos en plural y marca teléfono y documento como requeridos", async () => {
    renderForm()

    expect(await screen.findByLabelText("Nombres *")).toBeInTheDocument()
    expect(screen.getByLabelText("Apellidos *")).toBeInTheDocument()
    expect(screen.getByLabelText("Teléfono *")).toBeInTheDocument()
    expect(
      await screen.findByLabelText(/Código de país/)
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Tipo de documento *")).toBeInTheDocument()
    expect(screen.getByLabelText("Número de documento *")).toBeInTheDocument()
  })

  it("muestra placeholders genéricos en nombres, apellidos, correo y teléfono", async () => {
    renderForm()

    expect(await screen.findByPlaceholderText("Ej. Ana")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Ej. Martínez")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("correo@ejemplo.com")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("1234-5678")).toBeInTheDocument()
  })

  it("exige teléfono, tipo de documento y número de documento al enviar", async () => {
    renderForm()

    fireEvent.click(await screen.findByRole("button", { name: "Enviar postulación" }))

    expect(screen.getByText("Ingresa tus nombres.")).toBeInTheDocument()
    expect(screen.getByText("Ingresa tus apellidos.")).toBeInTheDocument()
    expect(screen.getByText("Ingresa tu teléfono.")).toBeInTheDocument()
    expect(screen.getByText("Selecciona un tipo de documento.")).toBeInTheDocument()
    expect(screen.getByText("Ingresa tu número de documento.")).toBeInTheDocument()
  })

  it("muestra la bandera del país junto al prefijo telefónico", async () => {
    renderForm()

    const trigger = await screen.findByRole("button", {
      name: /Código de país: El Salvador/,
    })
    fireEvent.click(trigger)

    expect(await screen.findByRole("option", { name: /El Salvador/ })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /United States/ })).toBeInTheDocument()
    const flagImg = document.querySelector(
      'img[src="https://flagcdn.com/w40/sv.png"]'
    )
    const flagEmoji = document.body.textContent?.includes("🇸🇻")
    expect(Boolean(flagImg) || Boolean(flagEmoji)).toBe(true)
  })

  it("muestra el dropzone de currículum con el texto de selección y la ayuda", async () => {
    renderForm()

    expect(await screen.findByRole("button", { name: "Seleccionar PDF" })).toBeInTheDocument()
    expect(
      screen.getByText("Solo se acepta formato PDF (máx. 15 MB).")
    ).toBeInTheDocument()
  })

  it("rechaza un currículum que no es PDF", async () => {
    renderForm()

    const input = document.getElementById("apply-cv") as HTMLInputElement
    const file = new File(["cv"], "mi-cv.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })
    fireEvent.change(input, { target: { files: [file] } })

    expect(
      await screen.findByText("Solo se aceptan archivos PDF.")
    ).toBeInTheDocument()
  })

  it("muestra el nombre del archivo al seleccionar un PDF válido", async () => {
    renderForm()

    const input = document.getElementById("apply-cv") as HTMLInputElement
    const file = new File(["cv"], "mi-cv.pdf", { type: "application/pdf" })
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText("mi-cv.pdf")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Quitar mi-cv.pdf" })).toBeInTheDocument()
  })
})
