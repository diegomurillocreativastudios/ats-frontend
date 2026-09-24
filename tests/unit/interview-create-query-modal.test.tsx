import { StrictMode } from "react"
import { describe, expect, it, vi, afterEach } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import esMessages from "@/messages/es.json"
import { InterviewList } from "@/components/rrhh/interviews/interview-list"
import type { UseRecruiterVacancySummaryResult } from "@/hooks/use-recruiter-vacancy-summary"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/portal-rrhh/entrevistas/v1",
  useSearchParams: () => new URLSearchParams("nueva=1&candidato=cand-1"),
  useParams: () => ({ vacancyId: "v1" }),
}))

vi.mock("@/lib/api/interviews", () => ({
  getInterviewsByVacancy: vi.fn(async () => []),
  getInterviewHttpErrorMessage: () => "error",
}))

vi.mock("@/components/rrhh/interviews/interview-form", () => ({
  InterviewForm: ({
    initialCandidateProfileId,
  }: {
    initialCandidateProfileId?: string
  }) => (
    <form aria-label="interview-form">
      {initialCandidateProfileId ?? "empty"}
    </form>
  ),
}))

vi.mock("@/components/rrhh/interviews/interview-detail-modal", () => ({
  InterviewDetailModal: () => null,
}))
vi.mock("@/components/rrhh/interviews/interview-notes-modal", () => ({
  InterviewNotesModal: () => null,
}))
vi.mock("@/components/rrhh/interviews/interview-schedule-controls", () => ({
  InterviewSingleDatetimeRow: () => null,
}))
vi.mock("@/components/rrhh/technical-sheet/technical-sheet-modal", () => ({
  TechnicalSheetModal: () => null,
}))
vi.mock("@/components/ui/Snackbar", () => ({ default: () => null }))

const summaryStub: UseRecruiterVacancySummaryResult = {
  title: "Vacante",
  applicantOptions: [],
  loading: false,
  error: false,
}

describe("InterviewList nueva query", () => {
  afterEach(() => {
    cleanup()
  })
  it("abre un solo modal aunque el listado se monte dos veces", () => {
    window.history.replaceState(
      {},
      "",
      "/portal-rrhh/entrevistas/v1?nueva=1&candidato=cand-1"
    )

    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <InterviewList vacancyId="v1" vacancySummary={summaryStub} />
        <InterviewList vacancyId="v1" vacancySummary={summaryStub} />
      </NextIntlClientProvider>
    )

    expect(
      screen.getAllByRole("dialog", { name: "Nueva entrevista" })
    ).toHaveLength(1)
    expect(screen.getByRole("form", { name: "interview-form" })).toHaveTextContent(
      "cand-1"
    )
    expect(window.location.search).not.toContain("nueva=1")
  })

  it("sigue abriendo un solo modal en Strict Mode", () => {
    window.history.replaceState(
      {},
      "",
      "/portal-rrhh/entrevistas/v1?nueva=1&candidato=cand-1"
    )

    render(
      <StrictMode>
        <NextIntlClientProvider locale="es" messages={esMessages}>
          <InterviewList vacancyId="v1" vacancySummary={summaryStub} />
        </NextIntlClientProvider>
      </StrictMode>
    )

    expect(
      screen.getAllByRole("dialog", { name: "Nueva entrevista" })
    ).toHaveLength(1)
  })
})
