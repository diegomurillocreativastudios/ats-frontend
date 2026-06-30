"use client"

import type { Dispatch, SetStateAction } from "react"
import { useTranslations } from "next-intl"
import type { FullProfileFormInput } from "@/lib/candidate-profile"
import {
  ProfileEditEducationFields,
  ProfileEditHeroFields,
  ProfileEditJobPreferencesFields,
  ProfileEditLanguagesFields,
  ProfileEditRecognitionsField,
  ProfileEditReferencesFields,
  ProfileEditSkillsField,
  ProfileEditSocialVideoFields,
  ProfileEditWorkFields,
} from "@/components/candidato/candidate-profile-edit-field-groups"
import { CandidateProfileSectionsProvider } from "@/components/rrhh/CandidateProfileSections"

export interface AdaptedProfileEditorProps {
  form: FullProfileFormInput
  setForm: Dispatch<SetStateAction<FullProfileFormInput>>
  patch: (patch: Partial<FullProfileFormInput>) => void
  saving?: boolean
}

export function AdaptedProfileEditor({
  form,
  setForm,
  patch,
  saving = false,
}: AdaptedProfileEditorProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.editor")
  const editorBase = { form, setForm, patch, saving }

  return (
    <CandidateProfileSectionsProvider namespace="CandidatePortal.profile">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-xl border border-vo-purple/25 bg-card p-4">
        <p className="font-sans text-xs text-muted-foreground">{t("hint")}</p>
        <ProfileEditHeroFields {...editorBase} />
        <ProfileEditJobPreferencesFields {...editorBase} />
        <ProfileEditWorkFields {...editorBase} />
        <ProfileEditEducationFields {...editorBase} />
        <ProfileEditLanguagesFields {...editorBase} />
        <ProfileEditSkillsField {...editorBase} />
        <ProfileEditSocialVideoFields {...editorBase} />
        <ProfileEditReferencesFields {...editorBase} />
        <ProfileEditRecognitionsField {...editorBase} />
      </div>
    </CandidateProfileSectionsProvider>
  )
}
