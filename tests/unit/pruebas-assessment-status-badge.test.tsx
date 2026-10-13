import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import {
  ASSESSMENT_STATUS_BADGE_STATUSES,
  AssessmentStatusBadge,
} from "@/components/pruebas/shared/assessment-status-badge"
import { AssessmentTypeBadge } from "@/components/pruebas/shared/assessment-type-badge"
import { MockDemoNotice } from "@/components/pruebas/shared/mock-demo-notice"

describe("AssessmentStatusBadge", () => {
  it("only accepts lifecycle statuses", () => {
    expect(ASSESSMENT_STATUS_BADGE_STATUSES).toEqual([
      "draft",
      "published",
      "archived",
    ])
    expect(ASSESSMENT_STATUS_BADGE_STATUSES).not.toContain("in_progress")
    expect(ASSESSMENT_STATUS_BADGE_STATUSES).not.toContain("expired")
  })

  it("renders the provided label and data-status code", () => {
    render(
      <AssessmentStatusBadge lifecycleStatus="published" label="Publicada" />
    )
    const badge = screen.getByTestId("assessment-status-badge")
    expect(badge).toHaveTextContent("Publicada")
    expect(badge).toHaveAttribute("data-status", "published")
    expect(badge).toHaveClass("text-emerald-900")
  })

  it("renders archived with amber treatment", () => {
    render(
      <AssessmentStatusBadge lifecycleStatus="archived" label="Archivada" />
    )
    expect(screen.getByTestId("assessment-status-badge")).toHaveAttribute(
      "data-status",
      "archived"
    )
  })
})

describe("AssessmentTypeBadge", () => {
  it("renders kind on data-status and external label", () => {
    render(<AssessmentTypeBadge kind="technical" label="Técnica" />)
    const badge = screen.getByTestId("assessment-type-badge")
    expect(badge).toHaveTextContent("Técnica")
    expect(badge).toHaveAttribute("data-status", "technical")
  })
})

describe("MockDemoNotice", () => {
  it("exposes a status role with the given label", () => {
    render(<MockDemoNotice label="Demostración — datos simulados" />)
    expect(screen.getByRole("status")).toHaveTextContent(
      "Demostración — datos simulados"
    )
  })
})
