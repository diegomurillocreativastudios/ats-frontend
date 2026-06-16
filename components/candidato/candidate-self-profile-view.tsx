"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  Award,
  Briefcase,
  Building2,
  ChevronRight,
  Download,
  FileText,
  GraduationCap,
  Languages,
  Loader2,
  Pencil,
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
import type { CandidateSelfProfileDto } from "@/lib/candidate-self-profile"
import {
  getLatestResumeParseState,
  mergeSelfProfileToNormalized,
} from "@/lib/candidate-self-profile"
import {
  candidateProfileHasEnrichedDisplayData,
  formatBirthDateForDisplay,
  type CandidateProfile,
  type CandidateProfileSaveBody,
} from "@/lib/candidate-profile"
import { resolveHeadlineForDisplay } from "@/lib/candidate-profile-hydrate"
import { getAccessToken } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatPhoneSvDisplay } from "@/lib/formatPhoneSv"
import { getInitials } from "@/lib/getInitials"
import { resolveCountryDisplay } from "@/lib/normalizeCountryDisplay"

const formatCompliancePreview = (
  value: unknown,
  fallbackLabel: string
): { label: string; value: string }[] => {
  if (value == null) return []
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).map(([k, v]) => ({
      label: k,
      value:
        typeof v === "string" || typeof v === "number" || typeof v === "boolean"
          ? String(v)
          : JSON.stringify(v),
    }))
  }
  return [{ label: fallbackLabel, value: String(value) }]
}

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

interface ProfileSectionNavProps {
  items: NavItem[]
}

function ProfileSectionNav({ items }: ProfileSectionNavProps) {
  const t = useTranslations("CandidatePortal.profile")
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
      aria-label={t("nav.aria")}
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

interface CandidateSelfProfileViewProps {
  candidateProfile: CandidateProfile | null
  selfProfile: CandidateSelfProfileDto | null
  profileNotFound: boolean
  sessionRole?: string | null
  onSaveProfile: (body: CandidateProfileSaveBody) => Promise<void>
  savingProfile: boolean
  saveProfileError: string | null
  clearSaveProfileError: () => void
}

export function CandidateSelfProfileView({
  candidateProfile,
  selfProfile,
  profileNotFound,
  sessionRole,
  onSaveProfile,
  savingProfile,
  saveProfileError,
  clearSaveProfileError,
}: CandidateSelfProfileViewProps) {
  const t = useTranslations("CandidatePortal.profile")
  const raw = useMemo(
    () => (selfProfile ?? {}) as Record<string, unknown>,
    [selfProfile]
  )
  const nd = useMemo(
    () => mergeSelfProfileToNormalized(raw) as Record<string, unknown>,
    [raw]
  )
  const {
    form,
    setForm,
    patch,
    isEditing,
    validationError,
    handleOpenEdit,
    handleCancelEdit,
    handleSubmit,
    triggerLabel,
  } = useCandidateProfileEditor({
    initialProfile: candidateProfile,
    enrichedNd: nd as Record<string, unknown>,
    isCreating: profileNotFound,
    onSave: onSaveProfile,
    saving: savingProfile,
    saveError: saveProfileError,
    onDismissSaveError: clearSaveProfileError,
    messages: {
      requiredFields: t("form.validation.requiredFields"),
      resumeRequired: t("form.validation.resumeRequired"),
      birthDate: {
        invalid: t("form.validation.birthDate.invalid"),
        futureDate: t("form.validation.birthDate.futureDate"),
        tooYoung: t("form.validation.birthDate.tooYoung"),
      },
      triggerComplete: t("actions.triggerComplete"),
      triggerEdit: t("actions.triggerEdit"),
    },
  })
  const parseState = getLatestResumeParseState(raw)
  const latest = selfProfile?.latestResume ?? null

  const cvStoragePath =
    (latest?.storagePath != null && String(latest.storagePath).trim() !== ""
      ? String(latest.storagePath).trim()
      : "") ||
    (candidateProfile?.storagePath != null &&
    String(candidateProfile.storagePath).trim() !== ""
      ? String(candidateProfile.storagePath).trim()
      : "")

  const firstNameNd = nd.FirstName ?? nd.firstName ?? ""
  const lastNameNd = nd.LastName ?? nd.lastName ?? ""
  const fullNameFromNd = [firstNameNd, lastNameNd].filter(Boolean).join(" ").trim()

  const fullNameFromApi = [
    candidateProfile?.firstName,
    candidateProfile?.lastName,
  ]
    .filter((x) => x != null && String(x).trim() !== "")
    .join(" ")
    .trim()

  const headlineDisplay = resolveHeadlineForDisplay(candidateProfile)

  const displayName =
    fullNameFromApi ||
    headlineDisplay ||
    (typeof selfProfile?.userName === "string" && selfProfile.userName.trim() !== ""
      ? selfProfile.userName
      : fullNameFromNd) ||
    t("hero.defaultName")

  const emailNd = nd.Email ?? nd.email ?? ""
  const emailAccount = selfProfile?.email ?? ""
  const emailFromProfile =
    candidateProfile?.email != null && String(candidateProfile.email).trim() !== ""
      ? String(candidateProfile.email).trim()
      : ""
  const email = (emailNd || emailAccount || emailFromProfile || "") as string

  const phoneFromNd = nd.PhoneNumber ?? nd.phoneNumber ?? nd.phone ?? ""
  const phoneFromProfile =
    candidateProfile?.phoneNumber != null &&
    String(candidateProfile.phoneNumber).trim() !== ""
      ? String(candidateProfile.phoneNumber).trim()
      : ""
  const phoneRaw = (
    selfProfile?.phoneNumber ||
    phoneFromNd ||
    phoneFromProfile ||
    ""
  ) as string
  const phoneDisplay = formatPhoneSvDisplay(phoneRaw)

  const accountDisplayUser =
    typeof selfProfile?.userName === "string" && selfProfile.userName.trim() !== ""
      ? selfProfile.userName.trim()
      : fullNameFromApi

  const countryRaw = nd.Country ?? nd.country ?? ""
  const countryFromApi = candidateProfile?.country?.trim()
  const countryDisplay = countryFromApi
    ? resolveCountryDisplay(countryFromApi, phoneDisplay)
    : resolveCountryDisplay(countryRaw, phoneDisplay)

  const birthCity =
    candidateProfile?.birthCity ?? nd.BirthCity ?? nd.birthCity ?? ""
  const birthDateRaw =
    candidateProfile?.birthDate ?? nd.BirthDate ?? nd.birthDate ?? null
  const marital =
    candidateProfile?.maritalStatus ?? nd.MaritalStatus ?? nd.maritalStatus ?? ""
  const gender = candidateProfile?.gender ?? nd.Gender ?? nd.gender ?? ""

  const summaryFromApi = candidateProfile?.summary?.trim() ?? ""
  const summaryRaw = nd.Summary ?? nd.summary
  const summaryFromNd =
    typeof summaryRaw === "string"
      ? summaryRaw
      : summaryRaw != null && summaryRaw !== ""
        ? String(summaryRaw)
        : ""
  const summary = summaryFromApi || summaryFromNd

  const jobPrefs =
    candidateProfile?.jobPreferences ??
    nd.JobPreferences ??
    nd.jobPreferences ??
    null
  const workExperience =
    candidateProfile?.workExperience ??
    nd.WorkExperience ??
    nd.workExperience ??
    []
  const education =
    candidateProfile?.education ?? nd.Education ?? nd.education ?? []
  const languages =
    candidateProfile?.languages ?? nd.Languages ?? nd.languages ?? []
  const skills = candidateProfile?.skills ?? nd.Skills ?? nd.skills ?? []
  const socialLinks =
    candidateProfile?.socialLinks ?? nd.SocialLinks ?? nd.socialLinks ?? []
  const references =
    candidateProfile?.references ?? nd.References ?? nd.references ?? []
  const recognitions =
    candidateProfile?.recognitions ?? nd.Recognitions ?? nd.recognitions ?? []

  const compliance = selfProfile?.compliance

  const showEnrichedSections =
    !!selfProfile ||
    isEditing ||
    candidateProfileHasEnrichedDisplayData(candidateProfile)

  const disabilityLabel =
    candidateProfile?.hasDisability === true
      ? t("values.yes")
      : candidateProfile?.hasDisability === false
        ? t("values.no")
        : "—"

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

  useEffect(() => {
    if (displayName) {
      document.title = `ATS | ${displayName}`
    }
  }, [displayName])

  const accountAndPersonalItems = useMemo(() => {
    const items = [
      { label: t("fields.user"), value: emptyToDash(accountDisplayUser) },
      { label: t("fields.email"), value: email || "—" },
      { label: t("fields.phone"), value: phoneDisplay },
      { label: t("fields.sessionRole"), value: emptyToDash(sessionRole) },
      { label: t("fields.nationalId"), value: emptyToDash(candidateProfile?.nationalId) },
      { label: t("fields.country"), value: countryDisplay },
      { label: t("fields.birthCity"), value: birthCity },
      {
        label: t("fields.birthDate"),
        value: birthDateRaw ? formatBirthDateForDisplay(birthDateRaw) : null,
      },
      { label: t("fields.maritalStatus"), value: marital },
      { label: t("fields.gender"), value: gender },
    ]
    if (!showEnrichedSections) {
      items.push(
        {
          label: t("fields.minExpectedSalary"),
          value:
            candidateProfile?.minSalary != null &&
            !Number.isNaN(Number(candidateProfile.minSalary))
              ? String(candidateProfile.minSalary)
              : "—",
        },
        { label: t("fields.availability"), value: emptyToDash(candidateProfile?.availability) },
        { label: t("fields.disabilityRegistered"), value: disabilityLabel }
      )
    }
    return items
  }, [
    t,
    accountDisplayUser,
    email,
    phoneDisplay,
    sessionRole,
    candidateProfile?.nationalId,
    candidateProfile?.minSalary,
    candidateProfile?.availability,
    countryDisplay,
    birthCity,
    birthDateRaw,
    marital,
    gender,
    disabilityLabel,
    showEnrichedSections,
  ])

  const navItems = useMemo(() => {
    const base: NavItem[] = [
      { id: "perfil-editar", label: t("nav.edit") },
      { id: "perfil-resumen", label: t("nav.summary") },
      { id: "perfil-datos", label: t("nav.accountContact") },
    ]
    base.push(
      { id: "perfil-objetivos", label: t("nav.jobGoals") },
      { id: "perfil-trayectoria", label: t("nav.career") },
      { id: "perfil-competencias", label: t("nav.competencies") },
      { id: "perfil-presencia", label: t("nav.links") },
      { id: "perfil-referencias", label: t("nav.references") }
    )
    if (compliance != null) {
      base.push({ id: "perfil-compliance", label: t("nav.compliance") })
    }
    return base
  }, [t, compliance])

  const handleDownloadCv = async () => {
    const path = cvStoragePath
    const directUrl = candidateProfile?.cvDownloadUrl?.trim() ?? ""

    if (!path && !directUrl) return

    setDownloading(true)
    setDownloadError(null)
    try {
      if (path) {
        const token = getAccessToken()
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
        const url = `${baseUrl}/api/Storage/files/${encodeURIComponent(path)}`
        const res = await fetch(url, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error(t("download.cvError"))
        const blob = await res.blob()
        const objUrl = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = objUrl
        a.download = path.split("/").pop() || "cv.pdf"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(objUrl)
        return
      }

      try {
        const res = await fetch(directUrl, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
        })
        if (res.ok) {
          const blob = await res.blob()
          const objUrl = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = objUrl
          let name = "cv.pdf"
          try {
            const u = new URL(directUrl)
            const seg = decodeURIComponent(u.pathname.split("/").pop() || "")
            if (seg) name = seg.split("?")[0] || name
          } catch {
            /* nombre por defecto */
          }
          a.download = name
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(objUrl)
          return
        }
      } catch {
        /* CORS u otro error: abrir en nueva pestaña */
      }
      window.open(directUrl, "_blank", "noopener,noreferrer")
    } catch (err: unknown) {
      setDownloadError(getApiErrorMessage(err) || t("download.genericError"))
    } finally {
      setDownloading(false)
    }
  }

  const showHero = !!(candidateProfile || selfProfile) || isEditing

  return (
    <CandidateProfileSectionsProvider namespace="CandidatePortal.profile">
    <form
      className="flex flex-col gap-8 md:gap-10"
      noValidate
      onSubmit={(e) => {
        if (!isEditing) {
          e.preventDefault()
          return
        }
        void handleSubmit(e)
      }}
    >
      <ProfileSectionNav items={navItems} />

      <section
        id="perfil-editar"
        className="scroll-mt-28 rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5"
        aria-label={t("actions.aria")}
      >
        {isEditing ? (
          <div className="flex flex-col gap-4">
            <div className="min-w-0 space-y-2">
              {validationError ? (
                <div
                  className="rounded-xl border border-amber-900/20 bg-amber-50 px-4 py-3 font-sans text-sm leading-snug text-amber-950 shadow-sm selection:bg-amber-200 selection:text-amber-950"
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
              className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3"
            >
              {cvStoragePath || candidateProfile?.cvDownloadUrl?.trim() ? (
                <button
                  type="button"
                  onClick={handleDownloadCv}
                  disabled={downloading}
                  className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto"
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
              <Link
                href="/portal-candidato/documentos"
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 sm:min-h-10 sm:w-auto"
                aria-label={t("actions.manageDocumentsAria")}
              >
                <FileText className="h-4 w-4 shrink-0 text-vo-purple" aria-hidden />
                {t("actions.manageDocuments")}
                <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={savingProfile}
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:w-auto"
                aria-label={t("actions.cancelAria")}
              >
                <X className="h-4 w-4 shrink-0" aria-hidden />
                {t("actions.cancel")}
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white shadow-sm transition-colors hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto sm:min-w-[140px]"
              >
                {savingProfile ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {savingProfile ? t("actions.saving") : t("actions.save")}
              </button>
            </div>
            {downloadError ? (
              <p className="font-sans text-xs text-destructive" role="alert">
                {downloadError}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
              {profileNotFound ? t("intro.notRegistered") : t("intro.editHint")}
            </p>
            <div
              role="toolbar"
              aria-label={t("actions.toolbarViewingAria")}
              className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
            >
              {cvStoragePath || candidateProfile?.cvDownloadUrl?.trim() ? (
                <button
                  type="button"
                  onClick={handleDownloadCv}
                  disabled={downloading}
                  className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto"
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
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white shadow-sm transition-colors hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 sm:min-h-10 sm:w-auto"
                aria-expanded="false"
              >
                <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                {triggerLabel}
              </button>
              <Link
                href="/portal-candidato/documentos"
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 sm:min-h-10 sm:w-auto"
                aria-label={t("actions.manageDocumentsAria")}
              >
                <FileText className="h-4 w-4 shrink-0 text-vo-purple" aria-hidden />
                {t("actions.manageDocuments")}
                <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              </Link>
            </div>
            {downloadError ? (
              <p className="font-sans text-xs text-destructive" role="alert">
                {downloadError}
              </p>
            ) : null}
          </div>
        )}
      </section>

      {showHero ? (
        <section
          id="perfil-resumen"
          className="scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-linear-to-br from-card via-card to-vo-purple/[0.07] p-5 shadow-sm md:p-8"
          aria-labelledby="perfil-resumen-titulo"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-start">
            <div
              className="flex h-18 w-18 shrink-0 items-center justify-center rounded-2xl bg-vo-purple font-sans text-xl font-semibold text-white shadow-md shadow-vo-purple/25 md:h-20 md:w-20 md:text-2xl"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <>
                  <h2
                    id="perfil-resumen-titulo"
                    className="font-sans text-xl font-bold leading-tight text-foreground md:text-2xl"
                  >
                    {t("hero.editTitle")}
                  </h2>
                  <p className="mt-1 font-sans text-sm text-muted-foreground">
                    {t("hero.editDescription")}
                  </p>
                  <div className="mt-4">
                    <ProfileEditHeroFields form={form} patch={patch} saving={savingProfile} />
                  </div>
                </>
              ) : (
                <>
                  <h2
                    id="perfil-resumen-titulo"
                    className="font-sans text-xl font-bold leading-tight text-foreground md:text-2xl"
                  >
                    {displayName}
                  </h2>
                  {headlineDisplay ? (
                    <p className="mt-2 font-sans text-base font-medium text-vo-purple md:text-lg">
                      {headlineDisplay}
                    </p>
                  ) : null}
                  <p className="mt-1 font-sans text-sm text-muted-foreground">
                    {t("hero.profileSubtitle")}
                  </p>
                  {summary ? (
                    <p className="mt-4 max-w-2xl font-sans text-sm leading-relaxed text-foreground/90 md:text-[15px]">
                      {summary}
                    </p>
                  ) : (
                    <p className="mt-4 font-sans text-sm italic text-muted-foreground">
                      {t("hero.summaryEmpty")}
                    </p>
                  )}
                </>
              )}
            </div>
            </div>
            <CandidateSalaryExpectationCard
              jobPrefs={jobPrefs}
              fallbackMinSalary={candidateProfile?.minSalary}
              isEditing={isEditing}
              editValue={form.jobMinSalary}
              onEditChange={(jobMinSalary) => patch({ jobMinSalary })}
              saving={savingProfile}
            />
          </div>
        </section>
      ) : profileNotFound ? (
        <div
          className="scroll-mt-28 rounded-2xl border border-dashed border-vo-purple/30 bg-vo-purple/[0.04] p-5 md:p-6"
          role="status"
        >
          <p className="font-sans text-sm leading-relaxed text-foreground">
            {t("notFound.intro")}
            <span className="font-medium text-vo-purple">{t("notFound.cta")}</span>
            {t("notFound.outro")}
          </p>
        </div>
      ) : null}

      <div id="perfil-datos" className="scroll-mt-28">
        <SectionGroupLabel>{t("groups.accountPersonal")}</SectionGroupLabel>
        <SectionCard title={t("sections.consolidated")} icon={User} sectionId="sec-ficha-consolidada">
          <p className="mb-4 font-sans text-sm leading-relaxed text-muted-foreground">
            {t("sections.consolidatedDescription")}
          </p>
          {isEditing ? (
            <div className="flex flex-col gap-8">
              <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
                <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {t("sections.accountReadOnly")}
                </p>
                <InfoGrid
                  items={[
                    { label: t("fields.user"), value: emptyToDash(accountDisplayUser) },
                    { label: t("fields.sessionRole"), value: emptyToDash(sessionRole) },
                  ]}
                />
              </div>
              <ProfileEditNationalIdField
                form={form}
                setForm={setForm}
                patch={patch}
                saving={savingProfile}
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
            <InfoGrid items={accountAndPersonalItems} />
          )}
        </SectionCard>
      </div>

      {showEnrichedSections ? (
        <>
          <div id="perfil-objetivos" className="scroll-mt-28">
            <SectionGroupLabel>{t("groups.goals")}</SectionGroupLabel>
            <SectionCard title={t("sections.jobPreferences")} icon={Briefcase} sectionId="sec-job-prefs-self">
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
                  fallbackMinSalary={candidateProfile?.minSalary}
                  fallbackAvailability={candidateProfile?.availability}
                  fallbackHasDisability={candidateProfile?.hasDisability}
                />
              )}
            </SectionCard>
          </div>

          <div id="perfil-trayectoria" className="scroll-mt-28">
            <SectionGroupLabel>{t("groups.career")}</SectionGroupLabel>
            <div className="flex flex-col gap-4 md:gap-5">
              <SectionCard title={t("sections.workExperience")} icon={Building2} sectionId="sec-work-self">
                {isEditing ? (
                  <ProfileEditWorkFields
                    form={form}
                    setForm={setForm}
                    patch={patch}
                    saving={savingProfile}
                  />
                ) : (
                  <WorkExperienceList items={workExperience} />
                )}
              </SectionCard>
              <SectionCard title={t("sections.education")} icon={GraduationCap} sectionId="sec-edu-self">
                {isEditing ? (
                  <ProfileEditEducationFields
                    form={form}
                    setForm={setForm}
                    patch={patch}
                    saving={savingProfile}
                  />
                ) : (
                  <EducationList items={education} />
                )}
              </SectionCard>
            </div>
          </div>

          <div id="perfil-competencias" className="scroll-mt-28">
            <SectionGroupLabel>{t("groups.competencies")}</SectionGroupLabel>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
              <SectionCard title={t("sections.languages")} icon={Languages} sectionId="sec-lang-self">
                {isEditing ? (
                  <ProfileEditLanguagesFields
                    form={form}
                    setForm={setForm}
                    patch={patch}
                    saving={savingProfile}
                  />
                ) : (
                  <LanguagesList items={languages} />
                )}
              </SectionCard>
              <SectionCard title={t("sections.skills")} icon={Sparkles} sectionId="sec-skills-self">
                {isEditing ? (
                  <ProfileEditSkillsField
                    form={form}
                    setForm={setForm}
                    patch={patch}
                    saving={savingProfile}
                  />
                ) : (
                  <SkillsCloud skills={skills} />
                )}
              </SectionCard>
            </div>
          </div>

          <div id="perfil-presencia" className="scroll-mt-28">
            <SectionGroupLabel>{t("groups.onlinePresence")}</SectionGroupLabel>
            <SectionCard title={t("sections.links")} icon={FileText} sectionId="sec-links-self">
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
                  <SocialLinksList links={socialLinks} />
                </div>
              )}
            </SectionCard>
          </div>

          <div id="perfil-referencias" className="scroll-mt-28">
            <SectionGroupLabel>{t("groups.referencesAchievements")}</SectionGroupLabel>
            <div className="flex flex-col gap-4 md:gap-5">
              <SectionCard title={t("sections.references")} icon={Users} sectionId="sec-refs-self">
                {isEditing ? (
                  <ProfileEditReferencesFields
                    form={form}
                    setForm={setForm}
                    patch={patch}
                    saving={savingProfile}
                  />
                ) : (
                  <ReferencesList items={references} />
                )}
              </SectionCard>
              <SectionCard title={t("sections.recognitions")} icon={Award} sectionId="sec-awards-self">
                {isEditing ? (
                  <ProfileEditRecognitionsField
                    form={form}
                    setForm={setForm}
                    patch={patch}
                    saving={savingProfile}
                  />
                ) : (
                  <RecognitionsList items={recognitions} />
                )}
              </SectionCard>
            </div>
          </div>
        </>
      ) : (
        <div
          className="rounded-2xl border border-border bg-muted/30 p-5 font-sans text-sm text-muted-foreground md:p-6"
          role="status"
        >
          {t("emptyStates.enrichedEmptyPrefix")}
          <Link
            href="/portal-candidato/documentos"
            className="rounded font-medium text-vo-purple underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
          >
            {t("emptyStates.documentsLink")}
          </Link>
          {t("emptyStates.enrichedEmptySuffix")}
        </div>
      )}

      {compliance != null ? (
        <div id="perfil-compliance" className="scroll-mt-28">
          <SectionGroupLabel>{t("groups.requirementsCompliance")}</SectionGroupLabel>
          <SectionCard title={t("sections.compliance")} icon={Award} sectionId="sec-compliance">
            {formatCompliancePreview(compliance, t("values.complianceValueLabel")).length > 0 ? (
              <InfoGrid items={formatCompliancePreview(compliance, t("values.complianceValueLabel"))} />
            ) : (
              <p className="font-sans text-sm text-muted-foreground">—</p>
            )}
          </SectionCard>
        </div>
      ) : null}

      {parseState.normalizedDataParseFailed && parseState.normalizedDataRaw ? (
        <SectionCard
          title={t("sections.technicalData")}
          icon={FileText}
          sectionId="sec-nd-raw-self"
        >
          <p
            className="mb-2 font-sans text-xs text-amber-800"
            role="status"
          >
            {t("emptyStates.technicalDataWarning")}
          </p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg border border-border bg-muted/50 p-4 font-mono text-xs text-foreground">
            {parseState.normalizedDataRaw}
          </pre>
        </SectionCard>
      ) : null}
    </form>
    </CandidateProfileSectionsProvider>
  )
}
