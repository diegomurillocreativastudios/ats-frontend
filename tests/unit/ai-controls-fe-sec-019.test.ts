import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = join(__dirname, "../..")

/**
 * FE-SEC-019: AI outputs stay as React text; match/search never auto-start applications;
 * tailoring 422 fails closed without client-side JSON repair; apply requires confirm + version id.
 */
describe("FE-SEC-019 AI controls pins", () => {
  const aiRenderSurfaces = [
    "components/candidato/profile-tailoring/comparison/ComparisonInsights.tsx",
    "components/candidato/profile-tailoring/comparison/dashboard/AdaptationSummaryPanel.tsx",
    "components/rrhh/candidate-profile-modal.tsx",
    "components/rrhh/vacancy-resultados/vacancy-resultados-candidates-block.tsx",
    "lib/reportes/report-template-context-registry.ts",
  ]

  it("does not use dangerouslySetInnerHTML on AI output surfaces", () => {
    for (const relativePath of aiRenderSurfaces) {
      const content = readFileSync(join(ROOT, relativePath), "utf8")
      expect(
        content.includes("dangerouslySetInnerHTML"),
        `${relativePath} must not use dangerouslySetInnerHTML for AI fields`
      ).toBe(false)
    }
  })

  it("renders adaptationSummary and qualitativeReasoning as text children", () => {
    const insights = readFileSync(
      join(ROOT, "components/candidato/profile-tailoring/comparison/ComparisonInsights.tsx"),
      "utf8"
    )
    expect(insights).toMatch(/\{adaptationSummary\}/)
    expect(insights).not.toMatch(/dangerouslySetInnerHTML[\s\S]*adaptationSummary/)

    const modal = readFileSync(
      join(ROOT, "components/rrhh/candidate-profile-modal.tsx"),
      "utf8"
    )
    expect(modal).toMatch(/\{qualitativeReasoningPositive\}/)
    expect(modal).toMatch(/\{qualitativeReasoningNegative\}/)
    expect(modal).toMatch(/\{qualitativeReasoningLegacy\}/)
  })

  it("vacancy match and smart search do not call applications/start", () => {
    const page = readFileSync(
      join(ROOT, "app/portal-rrhh/vacantes/[id]/page.tsx"),
      "utf8"
    )

    const handleMatchBlock = page.match(
      /const handleMatch = useCallback\(async \(\) => \{[\s\S]*?\}, \[[^\]]*\]\)/
    )?.[0]
    expect(handleMatchBlock, "handleMatch should exist").toBeTruthy()
    expect(handleMatchBlock!).not.toContain("applications/start")

    const loadSmartBlock = page.match(
      /const loadSmartCandidates = useCallback\([\s\S]*?\}, \[[^\]]*\]\)/
    )?.[0]
    expect(loadSmartBlock, "loadSmartCandidates should exist").toBeTruthy()
    expect(loadSmartBlock!).not.toContain("applications/start")

    const startProcessBlock = page.match(
      /const handleStartProcess = useCallback\(async \(\) => \{[\s\S]*?\}, \[[^\]]*\]\)/
    )?.[0]
    expect(startProcessBlock, "handleStartProcess should exist").toBeTruthy()
    expect(startProcessBlock!).toContain("/api/recruiter/applications/start")
  })

  it("profile tailoring apply requires confirmation modal and appliedFromVersionId", () => {
    const content = readFileSync(
      join(
        ROOT,
        "components/candidato/profile-tailoring/ProfileTailoringContent.tsx"
      ),
      "utf8"
    )
    expect(content).toMatch(/showApplyConfirm/)
    expect(content).toMatch(/applyConfirm\.confirm/)
    expect(content).toMatch(/appliedFromVersionId:\s*result\.versionId/)
    expect(content).toMatch(
      /onClick=\{\(\) => void handleApplyToMainProfile\(\)\}/
    )
  })

  it("tailoring hook surfaces 422 without repairing invalid AI JSON", () => {
    const hook = readFileSync(
      join(ROOT, "hooks/use-profile-tailoring.ts"),
      "utf8"
    )
    expect(hook).toMatch(/status === 422/)
    expect(hook).toMatch(/No se creó ninguna versión/)
    expect(hook).not.toMatch(/JSON\.parse\(/)
    expect(hook).not.toMatch(/repair|coerce|fixJson/i)

    const normalize = readFileSync(
      join(ROOT, "lib/candidate-profile-version.ts"),
      "utf8"
    )
    expect(normalize).toMatch(
      /export function normalizeTailorToVacancyResult/
    )
    expect(normalize).toMatch(/if \(!versionId\) return null/)
  })

  it("documents FE-SEC-019 backend mapping in AI controls spec", () => {
    const spec = readFileSync(
      join(ROOT, "docs/AI_CONTROLS_BACKEND_SPEC.md"),
      "utf8"
    )
    expect(spec).toMatch(/FE-SEC-019/)
    expect(spec).toMatch(/BE-SEC-017/)
    expect(spec).toMatch(/ai_candidates_included_in_process/)
    expect(spec).toMatch(/ai_adapted_profile_applied/)
    expect(spec).toMatch(/appliedFromVersionId/)
  })
})
