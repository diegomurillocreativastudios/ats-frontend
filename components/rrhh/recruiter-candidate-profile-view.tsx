"use client"

import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { useTranslations } from "next-intl"
import {
  Award,
  Briefcase,
  Building2,
  Download,
  FileText,
  GraduationCap,
  Languages,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react"
import { CandidateSalaryExpectationCard } from "@/components/candidato/candidate-salary-expectation-card"
import {
  ProfileEditContactFields,
  ProfileEditEducationFields,
  ProfileEditHeroFields,
  ProfileEditJobPreferencesFields,
  ProfileEditLanguagesFields,
  ProfileEditLocationAndPersonalFields,
  ProfileEditNationalIdField,
  ProfileEditRecognitionsField,
  ProfileEditReferencesFields,
  ProfileEditSkillsField,
  ProfileEditSocialVideoFields,
  ProfileEditWorkFields,
} from "@/components/candidato/candidate-profile-edit-field-groups"
import { useCandidateProfileEditor } from "@/hooks/use-candidate-profile-editor"
import {
  CandidateProfileSectionsProvider,
  SectionCard,
  InfoGrid,
  JobPreferencesBlock,
  WorkExperienceList,
  EducationList,
  LanguagesList,
  SkillsCloud,
  SocialLinksList,
  ReferencesList,
  RecognitionsList,
  emptyToDash,
} from "@/components/rrhh/CandidateProfileSections"
import {
  candidateProfileHasEnrichedDisplayData,
  formatBirthDateForDisplay,
  type CandidateProfile,
  type CandidateProfileSaveBody,
} from "@/lib/candidate-profile"
import { resolveHeadlineForDisplay } from "@/lib/candidate-profile-hydrate"
import type { RecruiterCandidateDetailState } from "@/lib/recruiter-candidate-profile-api"
import {
  downloadRecruiterCandidateCv,
  isRecruiterCandidateCvError,
} from "@/lib/api/recruiter-candidate-cv"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatPhoneSvDisplay } from "@/lib/formatPhoneSv"
import { getInitials } from "@/lib/getInitials"
import { resolveCountryDisplay } from "@/lib/normalizeCountryDisplay"

const SectionGroupLabel = ({ children }: { children: ReactNode }) => (
  <div className="scroll-mt-28 pt-2 first:pt-0">
    <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </p>
  </div>
)

interface NavItem {
  id: string
  label: string
}

function ProfileSectionNav({
  items,
  ariaLabel,
}: {
  items: NavItem[]
  ariaLabel: string
}) {
  const handleNavClick = useCallback((targetId: string) => {
    const el = document.getElementById(targetId)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const handleNavKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, targetId: string) => {
      if (event.key !== "Enter" && event.key !== " ") return
      event.preventDefault()
      handleNavClick(targetId)
    },
    [handleNavClick]
  )

  return (
    <nav
      className="sticky top-0 z-10 -mx-1 mb-2 border-b border-border/80 bg-background/90 pb-3 pt-1 backdrop-blur-md supports-backdrop-filter:bg-background/75 md:mb-4"
      aria-label={ariaLabel}
    >
      <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:gap-2 md:overflow-visible [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavClick(item.id)}
            onKeyDown={(e) => handleNavKeyDown(e, item.id)}
            className="shrink-0 rounded-full border border-transparent bg-muted/60 px-3.5 py-1.5 font-sans text-xs font-medium text-foreground transition-colors hover:border-vo-purple/30 hover:bg-vo-purple/10 hover:text-vo-purple focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 md:text-sm"
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

export interface RecruiterCandidateProfileViewProps {
  candidateId: string | null
  profile: RecruiterCandidateDetailState | null
  canonicalProfile: CandidateProfile | null
  onSaveProfile: (body: CandidateProfileSaveBody) => Promise<void>
  savingProfile: boolean
  saveProfileError: string | null
  clearSaveProfileError: () => void
}

export function RecruiterCandidateProfileView({
  candidateId,
  profile,
  canonicalProfile,
  onSaveProfile,
  savingProfile,
  saveProfileError,
  clearSaveProfileError,
}: RecruiterCandidateProfileViewProps) {
  const t = useTranslations("RecruiterPortal.candidateDetail")
  const nd = (profile?.normalizedData ?? {}) as Record<string, unknown>

  const {
    form,
    setForm,
    patch,
    isEditing,
    validationError,
    fieldErrors,
    handleOpenEdit,
    handleCancelEdit,
    handleSubmit,
  } = useCandidateProfileEditor({
    initialProfile: canonicalProfile,
    enrichedNd: nd,
    isCreating: false,
    onSave: onSaveProfile,
    saving: savingProfile,
    saveError: saveProfileError,
    onDismissSaveError: clearSaveProfileError,
    messages: {
      requiredFields: t("form.validation.requiredFields"),
      birthDate: {
        invalid: t("form.validation.birthDate.invalid"),
        futureDate: t("form.validation.birthDate.futureDate"),
        tooYoung: t("form.validation.birthDate.tooYoung"),
      },
      triggerComplete: t("actions.editProfile"),
      triggerEdit: t("actions.editProfile"),
    },
  })

  const firstName = String(nd.FirstName ?? nd.firstName ?? "")
  const lastName = String(nd.LastName ?? nd.lastName ?? "")
  const fullNameFromNd = [firstName, lastName].filter(Boolean).join(" ").trim()

  const fullNameFromApi = [canonicalProfile?.firstName, canonicalProfile?.lastName]
    .filter((x) => x != null && String(x).trim() !== "")
    .join(" ")
    .trim()

  const headlineDisplay = resolveHeadlineForDisplay(canonicalProfile)

  const displayName = fullNameFromApi || fullNameFromNd || t("fallbacks.candidate")
  const dashFallback = t("fallbacks.dash")

  const email = String(
    nd.Email ?? nd.email ?? canonicalProfile?.email ?? ""
  )
  const phoneRaw = String(
    nd.PhoneNumber ?? nd.phoneNumber ?? nd.phone ?? canonicalProfile?.phoneNumber ?? ""
  )
  const phoneDisplay = formatPhoneSvDisplay(phoneRaw)

  const countryRaw = String(nd.Country ?? nd.country ?? "")
  const countryFromApi = canonicalProfile?.country?.trim()
  const countryDisplay = countryFromApi
    ? resolveCountryDisplay(countryFromApi, phoneDisplay)
    : resolveCountryDisplay(countryRaw, phoneDisplay)

  const birthCity =
    canonicalProfile?.birthCity ?? String(nd.BirthCity ?? nd.birthCity ?? "")
  const birthDateRaw =
    canonicalProfile?.birthDate ?? nd.BirthDate ?? nd.birthDate ?? null
  const marital =
    canonicalProfile?.maritalStatus ?? String(nd.MaritalStatus ?? nd.maritalStatus ?? "")
  const gender = canonicalProfile?.gender ?? String(nd.Gender ?? nd.gender ?? "")

  const summaryFromApi = canonicalProfile?.summary?.trim() ?? ""
  const summaryRaw = nd.Summary ?? nd.summary
  const summaryFromNd =
    typeof summaryRaw === "string"
      ? summaryRaw
      : summaryRaw != null && summaryRaw !== ""
        ? String(summaryRaw)
        : ""
  const summary = summaryFromApi || summaryFromNd

  const jobPrefs =
    canonicalProfile?.jobPreferences ?? nd.JobPreferences ?? nd.jobPreferences ?? null
  const workExperience =
    canonicalProfile?.workExperience ?? nd.WorkExperience ?? nd.workExperience ?? []
  const education =
    canonicalProfile?.education ?? nd.Education ?? nd.education ?? []
  const languages =
    canonicalProfile?.languages ?? nd.Languages ?? nd.languages ?? []
  const skills = canonicalProfile?.skills ?? nd.Skills ?? nd.skills ?? []
  const socialLinks =
    canonicalProfile?.socialLinks ?? nd.SocialLinks ?? nd.socialLinks ?? []
  const references =
    canonicalProfile?.references ?? nd.References ?? nd.references ?? []
  const recognitions =
    canonicalProfile?.recognitions ?? nd.Recognitions ?? nd.recognitions ?? []

  const showEnrichedSections =
    isEditing || candidateProfileHasEnrichedDisplayData(canonicalProfile) || fullNameFromNd !== ""

  const displayNameWhileEditing = [form.firstName, form.lastName]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .trim()
  const initialsSource =
    isEditing && displayNameWhileEditing ? displayNameWhileEditing : displayName
  const initials = getInitials(initialsSource, email)

  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const cvCandidateId =
    candidateId != null && String(candidateId).trim() !== ""
      ? String(candidateId).trim()
      : profile?.id != null && String(profile.id).trim() !== ""
        ? String(profile.id).trim()
        : null

  const contactItems = useMemo(
    () => [
      { label: t("fields.email"), value: email || dashFallback },
      { label: t("fields.phone"), value: phoneDisplay },
      { label: t("fields.nationalId"), value: emptyToDash(canonicalProfile?.nationalId, dashFallback) },
      { label: t("fields.country"), value: countryDisplay },
      { label: t("fields.birthCity"), value: birthCity },
      {
        label: t("fields.birthDate"),
        value: birthDateRaw ? formatBirthDateForDisplay(birthDateRaw) : null,
      },
      { label: t("fields.maritalStatus"), value: marital },
      { label: t("fields.gender"), value: gender },
    ],
    [
      t,
      dashFallback,
      email,
      phoneDisplay,
      canonicalProfile?.nationalId,
      countryDisplay,
      birthCity,
      birthDateRaw,
      marital,
      gender,
    ]
  )

  const navItems = useMemo<NavItem[]>(
    () => [
      { id: "rrhh-perfil-editar", label: t("nav.edit") },
      { id: "rrhh-perfil-resumen", label: t("nav.summary") },
      { id: "rrhh-perfil-datos", label: t("nav.contact") },
      { id: "rrhh-perfil-objetivos", label: t("nav.goals") },
      { id: "rrhh-perfil-trayectoria", label: t("nav.career") },
      { id: "rrhh-perfil-competencias", label: t("nav.competencies") },
      { id: "rrhh-perfil-presencia", label: t("nav.links") },
      { id: "rrhh-perfil-referencias", label: t("nav.references") },
    ],
    [t]
  )

  const handleDownloadCv = async () => {
    if (!cvCandidateId) return
    setDownloading(true)
    setDownloadError(null)
    try {
      await downloadRecruiterCandidateCv(cvCandidateId)
    } catch (err: unknown) {
      if (isRecruiterCandidateCvError(err) && err.code === "unavailable") {
        setDownloadError(t("errors.downloadCvUnavailable"))
      } else {
        setDownloadError(getApiErrorMessage(err) || t("errors.downloadCvFailed"))
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <CandidateProfileSectionsProvider namespace="RecruiterPortal.candidateDetail">
    <form
      className="flex flex-col gap-6 md:gap-8"
      noValidate
      onSubmit={(e) => {
        if (!isEditing) {
          e.preventDefault()
          return
        }
        void handleSubmit(e)
      }}
    >
      {profile?.normalizedDataParseFailed ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-sans text-sm text-amber-950"
          role="status"
        >
          {t("warnings.parseFailed")}
        </div>
      ) : null}

      <ProfileSectionNav items={navItems} ariaLabel={t("nav.aria")} />

      <section
        id="rrhh-perfil-editar"
        className="scroll-mt-28 rounded-xl border border-border bg-card p-4 md:p-5"
        aria-label={t("sections.profileActions")}
      >
        {isEditing ? (
          <div className="flex flex-col gap-4">
            <div className="min-w-0 space-y-2">
              {validationError ? (
                <div
                  className="rounded-xl border border-amber-900/20 bg-amber-50 px-4 py-3 font-sans text-sm text-amber-950"
                  role="status"
                >
                  {validationError}
                </div>
              ) : null}
              {saveProfileError ? (
                <div
                  className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 font-sans text-sm text-destructive"
                  role="alert"
                >
                  {saveProfileError}
                </div>
              ) : null}
              <p className="font-sans text-xs text-muted-foreground">
                {t("actions.requiredHint")}
              </p>
            </div>
            <div
              role="toolbar"
              aria-label={t("actions.toolbarEditingAria")}
              className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 ${
                cvCandidateId ? "sm:justify-between" : "sm:justify-end"
              }`}
            >
              {cvCandidateId ? (
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadCv}
                    disabled={downloading}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={t("actions.downloadCvAria")}
                  >
                    {downloading ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    ) : (
                      <Download className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                    {downloading ? t("actions.downloadingCv") : t("actions.downloadCv")}
                  </button>
                </div>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={savingProfile}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t("actions.cancelAria")}
                >
                  <X className="h-4 w-4 shrink-0" aria-hidden />
                  {t("actions.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <Save className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  {savingProfile ? t("actions.saving") : t("actions.save")}
                </button>
              </div>
            </div>
            {downloadError ? (
              <p className="font-sans text-xs text-destructive" role="alert">
                {downloadError}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-sans text-sm text-muted-foreground">
              {t("hero.editHint")}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              {cvCandidateId ? (
                <button
                  type="button"
                  onClick={handleDownloadCv}
                  disabled={downloading}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t("actions.downloadCvAria")}
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  {downloading ? t("actions.downloadingCv") : t("actions.downloadCv")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
                aria-expanded="false"
              >
                <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                {t("actions.editProfile")}
              </button>
            </div>
            {downloadError ? (
              <p className="font-sans text-xs text-destructive sm:col-span-2" role="alert">
                {downloadError}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section
        id="rrhh-perfil-resumen"
        className="scroll-mt-28 rounded-xl border border-border bg-card p-6"
        aria-label={t("sections.summary")}
      >
        {isEditing ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-vo-purple font-sans text-lg font-semibold text-white"
                aria-hidden
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-sans text-2xl font-bold text-foreground">{t("hero.editTitle")}</h1>
                <p className="mt-1 font-sans text-sm text-muted-foreground">
                  {t("hero.editDescription")}
                </p>
              </div>
            </div>
            <div className="border-t border-border/60 pt-6">
              <ProfileEditHeroFields
                form={form}
                patch={patch}
                saving={savingProfile}
                fieldErrors={fieldErrors}
                sidebar={
                  <CandidateSalaryExpectationCard
                    jobPrefs={jobPrefs}
                    fallbackMinSalary={canonicalProfile?.minSalary}
                    isEditing
                    editValue={form.jobMinSalary}
                    onEditChange={(jobMinSalary) => patch({ jobMinSalary })}
                    saving={savingProfile}
                  />
                }
              />
            </div>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16.5rem,19rem)]">
            <div className="flex min-w-0 flex-col gap-6 md:flex-row md:items-start">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-vo-purple font-sans text-lg font-semibold text-white"
                aria-hidden
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-sans text-2xl font-bold text-foreground">{displayName}</h1>
                {headlineDisplay ? (
                  <p className="mt-2 font-sans text-base font-medium text-vo-purple">
                    {headlineDisplay}
                  </p>
                ) : null}
                {summary ? (
                  <p className="mt-3 max-w-3xl font-sans text-sm leading-relaxed text-muted-foreground">
                    {summary}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-col gap-2 font-sans text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
                  {email ? (
                    <a
                      href={`mailto:${email}`}
                      className="inline-flex items-center gap-2 rounded text-foreground hover:text-vo-purple focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                    >
                      <Mail className="h-4 w-4 shrink-0" aria-hidden />
                      {email}
                    </a>
                  ) : null}
                  {phoneDisplay !== dashFallback ? (
                    <span className="inline-flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" aria-hidden />
                      {phoneDisplay}
                    </span>
                  ) : null}
                  {countryDisplay !== dashFallback ? (
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                      {countryDisplay}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 font-sans text-xs text-muted-foreground">
                  {t("fields.idLabel")}: {emptyToDash(profile?.id ?? candidateId, dashFallback)}
                </p>
              </div>
            </div>
            <CandidateSalaryExpectationCard
              jobPrefs={jobPrefs}
              fallbackMinSalary={canonicalProfile?.minSalary}
            />
          </div>
        )}
      </section>

      <div id="rrhh-perfil-datos" className="scroll-mt-28">
        <SectionGroupLabel>{t("groups.contactPersonal")}</SectionGroupLabel>
        <SectionCard title={t("sections.contactPersonal")} icon={User} sectionId="sec-contact-rrhh">
          {isEditing ? (
            <div className="flex flex-col gap-8">
              <ProfileEditNationalIdField
                form={form}
                setForm={setForm}
                patch={patch}
                saving={savingProfile}
                fieldErrors={fieldErrors}
              />
              <ProfileEditContactFields
                form={form}
                setForm={setForm}
                patch={patch}
                saving={savingProfile}
              />
              <ProfileEditLocationAndPersonalFields
                form={form}
                setForm={setForm}
                patch={patch}
                saving={savingProfile}
              />
            </div>
          ) : (
            <InfoGrid items={contactItems} />
          )}
        </SectionCard>
      </div>

      {showEnrichedSections ? (
        <>
          <div id="rrhh-perfil-objetivos" className="scroll-mt-28">
            <SectionGroupLabel>{t("groups.jobPreferences")}</SectionGroupLabel>
            <SectionCard title={t("sections.jobPreferences")} icon={Briefcase} sectionId="sec-job-prefs-rrhh">
              {isEditing ? (
                <ProfileEditJobPreferencesFields
                  form={form}
                  setForm={setForm}
                  patch={patch}
                  saving={savingProfile}
                />
              ) : (
                <JobPreferencesBlock
                  prefs={jobPrefs}
                  fallbackMinSalary={canonicalProfile?.minSalary}
                  fallbackAvailability={canonicalProfile?.availability}
                  fallbackHasDisability={canonicalProfile?.hasDisability}
                />
              )}
            </SectionCard>
          </div>

          <div id="rrhh-perfil-trayectoria" className="scroll-mt-28">
            <SectionGroupLabel>{t("groups.career")}</SectionGroupLabel>
            <div className="flex flex-col gap-6">
              <SectionCard title={t("sections.workExperience")} icon={Building2} sectionId="sec-work-rrhh">
                {isEditing ? (
                  <ProfileEditWorkFields
                    form={form}
                    setForm={setForm}
                    patch={patch}
                    saving={savingProfile}
                  />
                ) : (
                  <WorkExperienceList items={workExperience as never[]} />
                )}
              </SectionCard>
              <SectionCard title={t("sections.education")} icon={GraduationCap} sectionId="sec-edu-rrhh">
                {isEditing ? (
                  <ProfileEditEducationFields
                    form={form}
                    setForm={setForm}
                    patch={patch}
                    saving={savingProfile}
                  />
                ) : (
                  <EducationList items={education as never[]} />
                )}
              </SectionCard>
            </div>
          </div>

          <div id="rrhh-perfil-competencias" className="scroll-mt-28">
            <SectionGroupLabel>{t("groups.competencies")}</SectionGroupLabel>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <SectionCard title={t("sections.languages")} icon={Languages} sectionId="sec-lang-rrhh">
                {isEditing ? (
                  <ProfileEditLanguagesFields
                    form={form}
                    setForm={setForm}
                    patch={patch}
                    saving={savingProfile}
                  />
                ) : (
                  <LanguagesList items={languages as never[]} />
                )}
              </SectionCard>
              <SectionCard title={t("sections.skills")} icon={Sparkles} sectionId="sec-skills-rrhh">
                {isEditing ? (
                  <ProfileEditSkillsField
                    form={form}
                    setForm={setForm}
                    patch={patch}
                    saving={savingProfile}
                  />
                ) : (
                  <SkillsCloud skills={skills as never[]} />
                )}
              </SectionCard>
            </div>
          </div>

          <div id="rrhh-perfil-presencia" className="scroll-mt-28">
            <SectionGroupLabel>{t("groups.links")}</SectionGroupLabel>
            <SectionCard title={t("sections.links")} icon={FileText} sectionId="sec-links-rrhh">
              {isEditing ? (
                <ProfileEditSocialVideoFields
                  form={form}
                  setForm={setForm}
                  saving={savingProfile}
                />
              ) : (
                <div>
                  <p className="mb-2 font-sans text-xs font-medium text-muted-foreground">
                    {t("sections.linksSubtitle")}
                  </p>
                  <SocialLinksList links={socialLinks as never[]} />
                </div>
              )}
            </SectionCard>
          </div>

          <div id="rrhh-perfil-referencias" className="scroll-mt-28">
            <SectionGroupLabel>{t("groups.referencesAchievements")}</SectionGroupLabel>
            <div className="flex flex-col gap-6">
              <SectionCard title={t("sections.references")} icon={Users} sectionId="sec-refs-rrhh">
                {isEditing ? (
                  <ProfileEditReferencesFields
                    form={form}
                    setForm={setForm}
                    patch={patch}
                    saving={savingProfile}
                  />
                ) : (
                  <ReferencesList items={references as never[]} />
                )}
              </SectionCard>
              <SectionCard title={t("sections.recognitions")} icon={Award} sectionId="sec-awards-rrhh">
                {isEditing ? (
                  <ProfileEditRecognitionsField
                    form={form}
                    setForm={setForm}
                    patch={patch}
                    saving={savingProfile}
                  />
                ) : (
                  <RecognitionsList items={recognitions as never[]} />
                )}
              </SectionCard>
            </div>
          </div>
        </>
      ) : null}

      {profile?.normalizedDataParseFailed && profile.normalizedDataRaw ? (
        <SectionCard
          title={t("sections.normalizedDataRaw")}
          icon={FileText}
          sectionId="sec-nd-raw-rrhh"
        >
          <p className="mb-2 font-sans text-xs text-amber-800" role="status">
            {t("warnings.normalizedDataRawIntro")}
          </p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg border border-border bg-muted/50 p-4 font-mono text-xs text-foreground">
            {profile.normalizedDataRaw}
          </pre>
        </SectionCard>
      ) : null}
    </form>
    </CandidateProfileSectionsProvider>
  )
}
