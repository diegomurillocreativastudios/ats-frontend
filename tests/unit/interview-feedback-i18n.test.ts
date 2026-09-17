import { describe, expect, it } from "vitest"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import frMessages from "@/messages/fr.json"
import deMessages from "@/messages/de.json"
import itMessages from "@/messages/it.json"

const locales = {
  es: esMessages,
  en: enMessages,
  fr: frMessages,
  de: deMessages,
  it: itMessages,
} as const

function matchingFeedback(messages: (typeof locales)[keyof typeof locales]) {
  return (
    messages as {
      RecruiterPortal: {
        vacancies: { matching: { interviewFeedback: Record<string, string> } }
      }
    }
  ).RecruiterPortal.vacancies.matching.interviewFeedback
}

function adminStageFields(messages: (typeof locales)[keyof typeof locales]) {
  return (
    messages as {
      AdminPortal: { stages: { fields: Record<string, string> } }
    }
  ).AdminPortal.stages.fields
}

describe("interview feedback i18n", () => {
  it("exposes admin interview stage and Kanban feedback keys in all locales", () => {
    for (const [locale, messages] of Object.entries(locales)) {
      expect(adminStageFields(messages).interviewStage, locale).toBeTruthy()
      const feedback = matchingFeedback(messages)
      expect(feedback.button, locale).toBeTruthy()
      expect(feedback.conflictNotInterview, locale).toBeTruthy()
      expect(feedback.successIncreased, locale).toContain("{previous}")
      expect(feedback.changePoints, locale).toContain("{signedDelta}")
    }
  })
})
