import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { PublicVacancyApplicationForm } from "@/components/public/PublicVacancyApplicationForm"
import { resetPhoneCountriesCache } from "@/lib/phone-countries"
import enMessages from "@/messages/en.json"
import esMessages from "@/messages/es.json"

const postFormData = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    postFormData: (...args: unknown[]) => postFormData(...args),
  },
}))

vi.mock("@/lib/api/identity-document-types", () => ({
  listIdentityDocumentTypes: vi.fn(async () => [
    { id: "doc-dui", code: "DUI", name: "DUI" },
  ]),
}))

vi.mock("@/components/candidato/consent-authorization-modal", () => ({
  ConsentAuthorizationModal: ({
    isOpen,
    onAccept,
  }: {
    isOpen: boolean
    onAccept: (payload: Record<string, unknown>) => void
  }) =>
    isOpen ? (
      <button
        type="button"
        onClick={() =>
          onAccept({
            documentVersion: "v1",
            documentLocale: "es",
            firstNames: "Ana",
            lastNames: "López",
            signature: "Ana López",
            identityDocument: "01234567-8",
            phoneCountryIso2: "SV",
            phoneNationalNumber: "77778888",
            clientDeclaredDate: "2026-09-27",
          })
        }
      >
        mock-accept-consent
      </button>
    ) : null,
}))

vi.mock("@/components/public/ApplyEmailConfirmationModal", () => ({
  ApplyEmailConfirmationModal: ({
    isOpen,
    onConfirm,
  }: {
    isOpen: boolean
    onConfirm: () => void
  }) =>
    isOpen ? (
      <button type="button" onClick={onConfirm}>
        mock-confirm-email
      </button>
    ) : null,
}))

vi.mock("@/lib/phone-countries-data", () => ({
  getBundledPhoneCountryRows: () => [
    { iso2: "SV", name: "El Salvador", phonecode: "503" },
    { iso2: "US", name: "United States", phonecode: "1" },
  ],
}))

function renderForm(locale: "es" | "en" = "es") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "en" ? enMessages : esMessages}
    >
      <PublicVacancyApplicationForm vacancyId="vac-1" />
    </NextIntlClientProvider>
  )
}

async function fillAndSubmit(locale: "es" | "en" = "es") {
  const formCopy = (locale === "en" ? enMessages : esMessages)
    .PublicOpportunities.applicationForm
  const labels = formCopy.fields
  const submitLabel = formCopy.actions.submit

  fireEvent.change(await screen.findByLabelText(labels.firstName), {
    target: { value: "Ana" },
  })
  fireEvent.change(screen.getByLabelText(labels.lastName), {
    target: { value: "López" },
  })
  fireEvent.change(screen.getByLabelText(labels.email), {
    target: { value: "ana@example.com" },
  })
  fireEvent.change(screen.getByLabelText(labels.phone), {
    target: { value: "77778888" },
  })
  const documentType = screen.getByLabelText(labels.documentType)
  await screen.findByRole("option", { name: "DUI" })
  fireEvent.change(documentType, { target: { value: "doc-dui" } })
  fireEvent.change(screen.getByLabelText(labels.documentNumber), {
    target: { value: "01234567-8" },
  })
  const cvInput = document.getElementById("apply-cv") as HTMLInputElement
  fireEvent.change(cvInput, {
    target: {
      files: [new File(["%PDF"], "mi-cv.pdf", { type: "application/pdf" })],
    },
  })

  fireEvent.click(screen.getByRole("button", { name: submitLabel }))
  fireEvent.click(await screen.findByRole("button", { name: "mock-accept-consent" }))
  fireEvent.click(await screen.findByRole("button", { name: "mock-confirm-email" }))
}

function getLastFormData(): FormData {
  return postFormData.mock.calls.at(-1)?.[1] as FormData
}

describe("PublicVacancyApplicationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPhoneCountriesCache()
  })

  it("envía outputLanguage según el idioma activo fuera del JSON candidate", async () => {
    postFormData.mockResolvedValue("ok")
    renderForm("en")

    await fillAndSubmit("en")

    await waitFor(() =>
      expect(postFormData).toHaveBeenCalledWith(
        "/api/candidate/personal-appliance",
        expect.any(FormData)
      )
    )
    const formData = getLastFormData()
    expect(formData.get("outputLanguage")).toBe("EN")
    expect(JSON.parse(String(formData.get("candidate")))).not.toHaveProperty(
      "outputLanguage"
    )
  })

  it("muestra copy localizado en vez de 'revisa los datos' ante 400 errors.outputLanguage", async () => {
    postFormData.mockRejectedValue(
      Object.assign(new Error("Solicitud fallida (400)"), {
        status: 400,
        body: {
          message: "The submitted payload is invalid.",
          errors: { outputLanguage: ["outputLanguage is required."] },
        },
      })
    )
    renderForm()

    await fillAndSubmit()

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("El idioma de la aplicación no es compatible")
    expect(screen.queryByText("Revisa los datos indicados.")).not.toBeInTheDocument()
    expect(screen.queryByText("outputLanguage is required.")).not.toBeInTheDocument()
  })

  it("muestra copy localizado ante 422 CV_OUTPUT_LANGUAGE_MISMATCH", async () => {
    postFormData.mockRejectedValue(
      Object.assign(new Error("x"), {
        status: 422,
        body: {
          message: "CV output could not be produced in the requested language.",
          code: "CV_OUTPUT_LANGUAGE_MISMATCH",
          outputLanguage: "ES",
        },
      })
    )
    renderForm()

    await fillAndSubmit()

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos procesar tu CV en el idioma seleccionado. Intenta de nuevo."
    )
  })

  it("muestra copy localizado de vacante no disponible ante 404", async () => {
    postFormData.mockRejectedValue(
      Object.assign(new Error("Vacancy not found."), {
        status: 404,
        body: { message: "Vacancy not found." },
      })
    )
    renderForm()

    await fillAndSubmit()

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(
      esMessages.PublicOpportunities.applicationForm.validation.vacancyUnavailable
    )
    expect(alert).not.toHaveTextContent("Vacancy not found.")
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
