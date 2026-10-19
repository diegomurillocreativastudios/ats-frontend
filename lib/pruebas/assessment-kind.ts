import type { AssessmentKind } from "@/lib/pruebas/types"

/**
 * Portal Pruebas only offers technical assessments until other kinds are enabled.
 */
export const PORTAL_ASSESSMENT_KIND = "technical" satisfies AssessmentKind

export function isPortalAssessmentKind(kind: AssessmentKind): boolean {
  return kind === PORTAL_ASSESSMENT_KIND
}
