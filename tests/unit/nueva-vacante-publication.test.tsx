import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import esMessages from "@/messages/es.json"

const apiPost = vi.fn()
const readVacancyClipboardMock = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(async () => []),
    post: (...args: unknown[]) => apiPost(...args),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("@/lib/api/admin-vacancy-catalogs", () => ({
  listAdminVacancyCatalog: vi.fn(async (kind: string) => {
    if (kind === "vacancyTypes") {
      return [
        {
          id: "type-hh",
          code: "headhunting",
          displayName: "Headhunting",
          sortOrder: 1,
          isActive: true,
          presentationSlaDays: 3,
        },
      ]
    }
    return []
  }),
}))

vi.mock("@/lib/api/recruiter-companies", () => ({
  listRecruiterCompanies: vi.fn(async () => [
    { id: "co-1", name: "Creativa", isActive: true },
  ]),
}))

vi.mock("@/lib/api/data-protection-laws", () => ({
  listRecruiterDataProtectionLaws: vi.fn(async () => [
    {
      id: "law-sv",
      code: "ley-proteccion-datos-el-salvador",
      displayName: "Ley de El Salvador",
      jurisdictionCode: "SV",
      officialReference: "",
      summary: "",
      locale: "es",
      body: "",
      isActive: true,
    },
  ]),
}))

vi.mock("@/components/rrhh/VacancyLocationFields", () => ({
  VacancyLocationFields: () => <div data-testid="vacancy-location-fields" />,
}))

vi.mock("@/components/rrhh/vacancy-paste-confirm-modal", () => ({
  VacancyPasteConfirmModal: ({
    isOpen,
    onConfirm,
  }: {
    isOpen: boolean
    onConfirm: () => void
  }) =>
    isOpen ? (
      <button type="button" onClick={onConfirm}>
        mock-confirm-paste
      </button>
    ) : null,
}))

vi.mock("@/lib/vacancies/vacancy-clipboard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/vacancies/vacancy-clipboard")>()
  return {
    ...actual,
    readVacancyClipboard: () => readVacancyClipboardMock(),
  }
})

import NuevaVacanteModal from "@/components/rrhh/NuevaVacanteModal"

const form = esMessages.RecruiterPortal.vacancies.form
const switchLabel = form.fields.isPublished.label

function renderModal(onClose = vi.fn()) {
  render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <NuevaVacanteModal isOpen onClose={onClose} onSubmit={vi.fn()} onSnackbar={vi.fn()} />
    </NextIntlClientProvider>
  )
  return { onClose }
}

async function fillRequiredFields() {
  fireEvent.change(await screen.findByLabelText(/Nombre de la vacante/), {
    target: { value: "Frontend Developer" },
  })
  fireEvent.change(screen.getByLabelText(/Descripción de la vacante/), {
    target: { value: "Construir interfaces" },
  })
  await screen.findByRole("option", { name: "Creativa" })
  const typeSelect = await screen.findByLabelText(/^Tipo de vacante$/)
  await screen.findByRole("option", { name: "Headhunting" })
  fireEvent.change(typeSelect, { target: { value: "type-hh" } })
  fireEvent.change(screen.getByLabelText(/Fecha límite de presentación de candidatos/), {
    target: { value: "2026-10-12" },
  })
  fireEvent.click(await screen.findByRole("button", { name: /Leyes de protección de datos/ }))
  fireEvent.click(await screen.findByRole("checkbox", { name: /Ley de El Salvador/ }))
}

function submit() {
  fireEvent.submit(document.querySelector("#nueva-vacante-form") as HTMLFormElement)
}

describe("NuevaVacanteModal publication", () => {
  beforeEach(() => {
    apiPost.mockReset()
    apiPost.mockResolvedValue({ id: "vac-1" })
    readVacancyClipboardMock.mockReset()
  })

  it("starts published and omits isPublished from the POST", async () => {
    renderModal()

    expect(await screen.findByRole("switch", { name: switchLabel })).toHaveAttribute(
      "aria-checked",
      "true"
    )
    await fillRequiredFields()
    submit()

    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1))
    const [path, payload] = apiPost.mock.calls[0]
    expect(path).toBe("/api/recruiter/vacancies")
    expect(payload).not.toHaveProperty("isPublished")
    expect(payload.dataProtectionLawIds).toEqual(["law-sv"])
    expect(payload.vacancyTypeId).toBe("type-hh")
    expect(payload.presentationDueAtUtc).toBeTruthy()
  })

  it("sends isPublished: false when the recruiter turns the switch off", async () => {
    renderModal()

    await fillRequiredFields()
    fireEvent.click(screen.getByRole("switch", { name: switchLabel }))
    expect(screen.getByRole("switch", { name: switchLabel })).toHaveAttribute(
      "aria-checked",
      "false"
    )
    submit()

    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1))
    expect(apiPost.mock.calls[0][1]).toMatchObject({ isPublished: false })
  })

  it("resets to published after cancelling", async () => {
    const { onClose } = renderModal()

    const control = await screen.findByRole("switch", { name: switchLabel })
    fireEvent.click(control)
    fireEvent.click(screen.getByRole("button", { name: form.actions.cancel }))

    expect(onClose).toHaveBeenCalled()
    expect(screen.getByRole("switch", { name: switchLabel })).toHaveAttribute(
      "aria-checked",
      "true"
    )
  })

  it("keeps the publication choice when pasting a copied vacancy", async () => {
    readVacancyClipboardMock.mockResolvedValue({
      version: 1,
      title: "Copiada",
      description: "Descripción copiada",
      details: "",
      salary: "",
      advantages: "",
      countryCode: "",
      stateCode: "",
      vacancyDepartmentId: "",
      vacancyDepartmentCode: "",
      vacancyDepartmentName: "",
      vacancyModalityId: "",
      vacancyModalityCode: "",
      vacancyModalityName: "",
      vacancyTypeId: "type-hh",
      vacancyTypeCode: "headhunting",
      vacancyTypeName: "Headhunting",
      presentationDueAtUtc: "2026-10-12T23:59:59.999Z",
      companyId: "",
      companyName: "",
      requirements: [],
      dataProtectionLawIds: ["law-sv"],
    })
    renderModal()

    fireEvent.click(await screen.findByRole("switch", { name: switchLabel }))
    fireEvent.click(screen.getByRole("button", { name: form.actions.pasteAria }))
    fireEvent.click(await screen.findByRole("button", { name: "mock-confirm-paste" }))

    expect(await screen.findByDisplayValue("Copiada")).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: switchLabel })).toHaveAttribute(
      "aria-checked",
      "false"
    )
  })
})
