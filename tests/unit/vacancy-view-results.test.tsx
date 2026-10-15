import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { VacancyListItem } from "@/lib/vacancies/map-vacancy-list-item"
import esMessages from "@/messages/es.json"

vi.mock("@/components/rrhh/VacancyListCard", () => ({
  VacancyListCard: ({ vacancy }: { vacancy: VacancyListItem }) => (
    <div data-testid={`vacancy-card-${vacancy.id}`}>{vacancy.title}</div>
  ),
}))

import { VacancyViewList } from "@/components/rrhh/vacancy-view-results"

function listItem(
  overrides: Partial<VacancyListItem> & Pick<VacancyListItem, "id" | "title">
): VacancyListItem {
  return {
    publicSlug: null,
    description: "",
    company: "Creativa Studios",
    companyId: null,
    jobCategory: "",
    department: "",
    departmentId: "",
    modality: "",
    modalityId: "",
    vacancyType: "",
    vacancyTypeId: "",
    presentationDueAtUtc: "2026-10-11T23:59:59.999Z",
    presentationDueAtLabel: "11 oct 2026",
    isPresentationOverdue: true,
    location: "",
    requirementsSummary: "",
    requirementsRaw: null,
    candidates: 0,
    interviews: null,
    status: "activa",
    statusRaw: "Open",
    iconKey: "briefcase",
    needsRematch: false,
    createdAt: null,
    createdAtLabel: null,
    countryCode: null,
    countryLabel: "",
    stateCode: null,
    isActive: true,
    isPublished: true,
    logoSrc: null,
    ...overrides,
  }
}

function renderViewList(
  props: Partial<Parameters<typeof VacancyViewList>[0]> &
    Pick<Parameters<typeof VacancyViewList>[0], "view">
) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <VacancyViewList
        listItems={[]}
        progressRows={[]}
        onRefresh={vi.fn()}
        onSnackbar={vi.fn()}
        {...props}
      />
    </NextIntlClientProvider>
  )
}

describe("VacancyViewList", () => {
  it("renderiza listItems en la vista fuera-de-plazo (no progressRows)", () => {
    renderViewList({
      view: "fuera-de-plazo",
      listItems: [
        listItem({ id: "vac-1", title: "Asistente Administrativo" }),
      ],
      progressRows: [],
    })

    expect(screen.getByTestId("vacancy-card-vac-1")).toHaveTextContent(
      "Asistente Administrativo"
    )
    expect(screen.queryByRole("link", { name: /abrir vacante/i })).toBeNull()
  })

  it("sigue usando progressRows solo en sin-postulaciones", () => {
    renderViewList({
      view: "sin-postulaciones",
      listItems: [listItem({ id: "ignored", title: "No debe verse" })],
      progressRows: [
        {
          vacancyId: "prog-1",
          title: "Sin candidatos",
          clientName: "Acme",
          daysOpen: 3,
          candidateCount: 0,
          href: "/portal-rrhh/vacantes/prog-1",
        },
      ],
    })

    expect(screen.getByText("Sin candidatos")).toBeInTheDocument()
    expect(screen.queryByTestId("vacancy-card-ignored")).toBeNull()
  })
})
