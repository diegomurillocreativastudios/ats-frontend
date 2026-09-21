import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const LOCALES = ["es", "en", "de", "fr", "it"] as const
const ROOT = join(import.meta.dirname, "../..")

function matchingKanban(locale: string) {
  const raw = readFileSync(join(ROOT, "messages", `${locale}.json`), "utf8")
  const data = JSON.parse(raw) as {
    RecruiterPortal: {
      vacancies: {
        matching: {
          kanban: Record<string, string>
          errors: Record<string, string>
        }
      }
    }
  }
  return data.RecruiterPortal.vacancies.matching
}

describe("stage move confirm i18n", () => {
  it.each(LOCALES)("%s has confirm modal keys and no backward copy", (locale) => {
    const matching = matchingKanban(locale)
    const { kanban, errors } = matching

    expect(kanban.confirmStageMoveTitle?.trim()).toBeTruthy()
    expect(kanban.confirmStageMoveMessage).toContain("{name}")
    expect(kanban.confirmStageMoveMessage).toContain("{fromStage}")
    expect(kanban.confirmStageMoveMessage).toContain("{toStage}")
    expect(kanban.confirmStageMoveConfirm?.trim()).toBeTruthy()

    expect(kanban.dropNotAllowedTooltip).not.toMatch(
      /retroced|back one|zurück|reculer|indietro/i
    )
    expect(errors.stageSkipNotAllowed).not.toMatch(
      /retroced|back one|zurück|reculer|indietro/i
    )
  })
})
