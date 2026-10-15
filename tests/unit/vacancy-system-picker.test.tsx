import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"

import { VacancySystemPicker } from "@/components/candidato/profile-tailoring/VacancySystemPicker"
import { renderWithIntl } from "@/tests/helpers/render-with-intl"

const { listPublicVacanciesMock, getPublicVacancyDetailMock } = vi.hoisted(() => ({
  listPublicVacanciesMock: vi.fn(),
  getPublicVacancyDetailMock: vi.fn(),
}))

vi.mock("@/lib/api/public-vacancies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/public-vacancies")>()
  return {
    ...actual,
    listPublicVacancies: listPublicVacanciesMock,
    getPublicVacancyDetail: getPublicVacancyDetailMock,
  }
})

const assistant = {
  id: "vac-1",
  publicSlug: null,
  title: "Asistente Administrativo",
  company: { id: "c1", name: "Creativa Studios", hasLogo: false, logo: null },
  locationLabel: "El Salvador",
  modality: { id: "m1", code: "onsite", displayName: "Presencial" },
}

const developer = {
  id: "vac-2",
  publicSlug: null,
  title: "Desarrollador .NET",
  company: { id: "c1", name: "ApplicanTree", hasLogo: false, logo: null },
  locationLabel: "El Salvador",
  modality: { id: "m2", code: "remote", displayName: "Remoto" },
}

describe("VacancySystemPicker", () => {
  beforeEach(() => {
    listPublicVacanciesMock.mockReset()
    getPublicVacancyDetailMock.mockReset()
    listPublicVacanciesMock.mockResolvedValue({
      items: [assistant, developer],
      availableFilters: { departments: [], modalities: [], countries: [] },
      pagination: {
        page: 1,
        pageSize: 20,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })
    getPublicVacancyDetailMock.mockImplementation(async (id: string) => {
      if (id === assistant.id) {
        return {
          ...assistant,
          description: "Apoyo administrativo del equipo.",
          details: "Jornada diurna.",
          advantages: "Horario flexible.",
          responsibilities: ["Agendar reuniones"],
          requirements: ["Excel avanzado"],
          benefits: ["Seguro médico"],
          salary: "$800",
        }
      }
      return {
        ...developer,
        description: "Desarrollo de APIs internas.",
      }
    })
  })

  it("abre el detalle, muestra las secciones y selecciona sin ocultar la lista", async () => {
    const onSelect = vi.fn()
    const onClear = vi.fn()

    renderWithIntl(
      <VacancySystemPicker
        selectedId={null}
        selectedTitle={null}
        onSelect={onSelect}
        onClear={onClear}
      />
    )

    expect(await screen.findByText("Asistente Administrativo")).toBeInTheDocument()
    expect(screen.getByText("Desarrollador .NET")).toBeInTheDocument()
    expect(screen.getByText("Creativa Studios · El Salvador · Presencial")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Asistente Administrativo"))

    expect(await screen.findByRole("heading", { name: "Descripción" })).toBeInTheDocument()
    expect(screen.getByText("Apoyo administrativo del equipo.")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Detalles" })).toBeInTheDocument()
    expect(screen.getByText("Jornada diurna.")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Ventajas" })).toBeInTheDocument()
    expect(screen.getByText("Horario flexible.")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Responsabilidades" })).toBeInTheDocument()
    expect(screen.getByText("Agendar reuniones")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Requisitos" })).toBeInTheDocument()
    expect(screen.getByText("Excel avanzado")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Beneficios" })).toBeInTheDocument()
    expect(screen.getByText("Seguro médico")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Salario" })).toBeInTheDocument()
    expect(screen.getByText("$800")).toBeInTheDocument()
    expect(getPublicVacancyDetailMock).toHaveBeenCalledWith("vac-1")

    fireEvent.click(screen.getByRole("button", { name: "Usar esta vacante" }))

    expect(onSelect).toHaveBeenCalledWith(assistant)
    expect(screen.getByText("Asistente Administrativo")).toBeInTheDocument()
    expect(screen.getByText("Desarrollador .NET")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Desarrollador .NET"))

    expect(await screen.findByText("Desarrollo de APIs internas.")).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText("Apoyo administrativo del equipo.")).not.toBeInTheDocument()
    })
    expect(screen.queryByRole("heading", { name: "Salario" })).not.toBeInTheDocument()
  })
})
