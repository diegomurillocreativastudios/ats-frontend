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
      expect(feedback.conflictInterviewNotDone, locale).toBeTruthy()
      expect(feedback.softSkillsTitle, locale).toBeTruthy()
      expect(feedback.technicalSkillsTitle, locale).toBeTruthy()
      expect(feedback.historyTitle, locale).toBeTruthy()
      expect(feedback.scaleLegend, locale).toBeTruthy()
      expect(feedback.notScored, locale).toBeTruthy()
      expect(feedback.scoreChipAria, locale).toContain("{skill}")
      expect(feedback.scoreChipAria, locale).toContain("{score}")
      expect(feedback.progressSkills, locale).toContain("{scored}")
      expect(feedback.progressSkills, locale).toMatch(/\{total/)
      expect(feedback.progressCommentMissing, locale).toBeTruthy()
      expect(feedback.successIncreased, locale).toContain("{previous}")
      expect(feedback.changePoints, locale).toContain("{signedDelta}")
      const matching = (
        messages as {
          RecruiterPortal: {
            vacancies: { matching: { errors: Record<string, string> } }
          }
        }
      ).RecruiterPortal.vacancies.matching.errors
      expect(matching.interviewNotDone, locale).toBeTruthy()
      expect(matching.interviewFeedbackRequired, locale).toBeTruthy()
      const softSkills = (
        messages as {
          AdminPortal: {
            vacancyCatalog: { softSkills: Record<string, string> }
          }
          Navigation: Record<string, string>
        }
      )
      expect(softSkills.AdminPortal.vacancyCatalog.softSkills.title, locale).toBeTruthy()
      expect(softSkills.Navigation.softSkills, locale).toBeTruthy()
    }
  })
})
