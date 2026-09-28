import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"

import { InterviewDetailPanel } from "@/components/rrhh/interviews/interview-detail-panel"
import { splitCandidateIdentity } from "@/lib/rrhh/candidate-identity"
import esMessages from "@/messages/es.json"
import type { Interview } from "@/lib/api/interviews"

const getInterviewById = vi.fn()
const fetchInterviewTypes = vi.fn()
const listInterviewModalitiesRecruiter = vi.fn()
const patchInterview = vi.fn()
const deleteRecruiterInterview = vi.fn()

vi.mock("@/lib/api/interviews", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/interviews")>()
  return {
    ...actual,
    getInterviewById: (...args: unknown[]) => getInterviewById(...args),
    fetchInterviewTypes: (...args: unknown[]) => fetchInterviewTypes(...args),
    listInterviewModalitiesRecruiter: (...args: unknown[]) =>
      listInterviewModalitiesRecruiter(...args),
    patchInterview: (...args: unknown[]) => patchInterview(...args),
    deleteRecruiterInterview: (...args: unknown[]) =>
      deleteRecruiterInterview(...args),
  }
})

vi.mock("@/hooks/useGoogleCalendar", () => ({
  useGoogleCalendar: () => ({
    status: { isConnected: false, email: "", connectedAt: null },
    isLoading: false,
  }),
}))

vi.mock("@/lib/google-calendar", () => ({
  getInterviewCalendarEvent: vi.fn(async () => null),
}))

vi.mock("@/components/rrhh/interviews/interviewer-recruiter-select", () => ({
  InterviewerRecruiterSelect: ({
    id,
    value,
    onChange,
    disabled,
  }: {
    id: string
    value: string
    onChange: (next: string) => void
    disabled?: boolean
  }) => (
    <input
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Entrevistador(a)"
    />
  ),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

function renderPanel(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

const interview: Interview = {
  id: "int-1",
  vacancyId: "vac-1",
  jobTitle: "Dev Senior",
  candidateProfileId: "cp-1",
  candidateName: "Ana Pérez",
  applicationId: "app-1",
  scheduledAtUtc: "2026-09-21T15:00:00.000Z",
  durationMinutes: 60,
  interviewType: "tech",
  interviewTypeLabel: "Técnica",
  interviewTypeId: "type-1",
  interviewModalityId: "mod-1",
  interviewModality: {
    id: "mod-1",
    displayName: "Virtual",
    includeGoogleMeetLink: true,
  },
  interviewerName: "Diego",
  googleMeetUrl: "https://meet.google.com/abc-defg-hij",
  descripcion: "",
  notes: null,
  outcome: null,
  status: "Scheduled",
  statusDisplayName: "Programada",
  interviewStatusId: null,
  isStatusTerminal: false,
  createdAtUtc: null,
  updatedAtUtc: null,
}

describe("InterviewDetailPanel", () => {
  beforeEach(() => {
    getInterviewById.mockReset()
    fetchInterviewTypes.mockReset()
    listInterviewModalitiesRecruiter.mockReset()
    patchInterview.mockReset()
    deleteRecruiterInterview.mockReset()
    getInterviewById.mockResolvedValue(interview)
    fetchInterviewTypes.mockResolvedValue([
      { value: "tech", label: "Técnica" },
    ])
    listInterviewModalitiesRecruiter.mockResolvedValue([
      {
        id: "mod-1",
        displayName: "Virtual",
        includeGoogleMeetLink: true,
      },
    ])
  })

  it("muestra candidato, vacante y duración, y desactiva guardar sin cambios", async () => {
    renderPanel(
      <InterviewDetailPanel
        interviewId="int-1"
        vacancyIdFromQuery="vac-1"
        candidateLabel="Ana Pérez"
        vacancyTitle="Dev Senior"
        variant="modal"
      />
    )

    expect(await screen.findByTestId("interview-detail-candidate")).toHaveTextContent(
      "Ana Pérez"
    )
    expect(screen.getByText("Dev Senior")).toBeInTheDocument()
    expect(screen.getByLabelText("Estado")).toBeInTheDocument()
    expect(screen.getByTestId("interview-schedule-duration")).toHaveTextContent(
      "60 min"
    )
    expect(screen.getByTestId("interview-detail-save")).toBeDisabled()
    expect(screen.queryByText("Descartar cambios")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument()
  })

  it("habilita guardar al editar y aplica el estado sin confirmación", async () => {
    renderPanel(
      <InterviewDetailPanel
        interviewId="int-1"
        vacancyIdFromQuery="vac-1"
        variant="modal"
      />
    )

    await screen.findByTestId("interview-detail-candidate")
    fireEvent.change(screen.getByLabelText("Entrevistador(a)"), {
      target: { value: "María" },
    })
    expect(screen.getByTestId("interview-detail-save")).not.toBeDisabled()

    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "Completed" },
    })
    expect(screen.queryByText("Marcar como completada")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Estado")).toHaveValue("Completed")
  })

  it("separa nombre y correo del candidato para no saturar el encabezado", async () => {
    renderPanel(
      <InterviewDetailPanel
        interviewId="int-1"
        vacancyIdFromQuery="vac-1"
        candidateLabel="Diego Murillo - diegomurillo@example.com"
        vacancyTitle="React Frontend Dev"
        variant="modal"
      />
    )

    const identity = await screen.findByTestId("interview-detail-candidate")
    expect(identity).toHaveTextContent("Diego Murillo")
    expect(identity).toHaveTextContent("diegomurillo@example.com")
    expect(screen.getByText("React Frontend Dev")).toBeInTheDocument()
    expect(screen.getByLabelText("Estado")).toBeInTheDocument()
  })
})

describe("splitCandidateIdentity", () => {
  it("parte nombre y correo con guion o punto medio", () => {
    expect(
      splitCandidateIdentity("Diego Murillo - diegomurillo@example.com")
    ).toEqual({
      name: "Diego Murillo",
      email: "diegomurillo@example.com",
    })
    expect(
      splitCandidateIdentity("Ana Pérez · ana@test.com")
    ).toEqual({
      name: "Ana Pérez",
      email: "ana@test.com",
    })
  })

  it("no parte cuando no hay correo", () => {
    expect(splitCandidateIdentity("Ana Pérez")).toEqual({
      name: "Ana Pérez",
      email: null,
    })
  })
})
