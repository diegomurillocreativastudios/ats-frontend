"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import type {
  ChangeDisplayLabels,
  ChangeFieldLabels,
} from "@/lib/profile-comparison-helpers"

export function useChangeDisplayLabels(): {
  displayLabels: ChangeDisplayLabels
  fieldLabels: ChangeFieldLabels
} {
  const tDashboard = useTranslations("CandidatePortal.profileTailoring.comparison.dashboard")
  const tProfile = useTranslations("CandidatePortal.profile")

  return useMemo(
    () => ({
      displayLabels: {
        emptySummary: tDashboard("emptySummary"),
        notDefined: tDashboard("notDefined"),
        yes: tProfile("values.yes"),
        no: tProfile("values.no"),
        jobPreferenceFields: {
          sectors: tProfile("fields.sectors"),
          desiredRole: tProfile("fields.desiredRole"),
          minSalary: tProfile("fields.minSalary"),
          educationLevel: tProfile("fields.educationLevel"),
          desiredCity: tProfile("fields.desiredCity"),
          availability: tProfile("fields.availability"),
          disability: tProfile("fields.disability"),
        },
      },
      fieldLabels: {
        headline: tDashboard("changeFields.headline"),
        summary: tDashboard("changeFields.summary"),
        skills: tDashboard("changeFields.skills"),
        jobPreferences: tDashboard("changeFields.jobPreferences"),
        workExperience: (index: number) =>
          tDashboard("changeFields.workExperienceItem", { index }),
        fallback: tDashboard("changeFields.fallback"),
      },
    }),
    [tDashboard, tProfile]
  )
}
