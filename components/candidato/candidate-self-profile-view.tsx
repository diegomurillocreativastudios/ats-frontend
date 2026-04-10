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
  type CandidateProfile,
} from "@/lib/candidate-profile"
import { resolveHeadlineForDisplay } from "@/lib/candidate-profile-hydrate"
import type { CandidateProfileSaveBody } from "@/lib/candidate-profile"
import { getAccessToken } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatPhoneSvDisplay } from "@/lib/formatPhoneSv"
import { getInitials } from "@/lib/getInitials"
import { resolveCountryDisplay } from "@/lib/normalizeCountryDisplay"

const formatBirthDate = (value: unknown) => {
  if (!value) return null
  const d =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
        : null
  if (!d || Number.isNaN(d.getTime())) return emptyToDash(value)
  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

const formatCompliancePreview = (value: unknown): { label: string; value: string }[] => {
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
  return [{ label: "Valor", value: String(value) }]
}

const SectionGroupLabel = ({ children }: { children: ReactNode }) => (
  <div className="scroll-mt-28 pt-2 first:pt-0">
    <p className="mb-3 font-inter text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
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
      aria-label="Ir a sección del perfil"
    >
      <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:gap-2 md:overflow-visible [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavClick(item.id)}
            onKeyDown={(e) => handleNavKeyDown(e, item.id)}
            className="shrink-0 rounded-full border border-transparent bg-muted/60 px-3.5 py-1.5 font-inter text-xs font-medium text-foreground transition-colors hover:border-vo-purple/30 hover:bg-vo-purple/10 hover:text-vo-purple focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 md:text-sm"
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
    "Candidato"

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
      ? "Sí"
      : candidateProfile?.hasDisability === false
        ? "No"
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
      { label: "Usuario", value: emptyToDash(accountDisplayUser) },
      { label: "Correo electrónico", value: email || "—" },
      { label: "Teléfono", value: phoneDisplay },
      { label: "Rol en la sesión", value: emptyToDash(sessionRole) },
      { label: "Documento de identidad", value: emptyToDash(candidateProfile?.nationalId) },
      { label: "País", value: countryDisplay },
      { label: "Ciudad de nacimiento", value: birthCity },
      {
        label: "Fecha de nacimiento",
        value: birthDateRaw ? formatBirthDate(birthDateRaw) : null,
      },
      { label: "Estado civil", value: marital },
      { label: "Género", value: gender },
    ]
    if (!showEnrichedSections) {
      items.push(
        {
          label: "Salario mínimo esperado",
          value:
            candidateProfile?.minSalary != null &&
            !Number.isNaN(Number(candidateProfile.minSalary))
              ? String(candidateProfile.minSalary)
              : "—",
        },
        { label: "Disponibilidad", value: emptyToDash(candidateProfile?.availability) },
        { label: "Discapacidad (registrado)", value: disabilityLabel }
      )
    }
    return items
  }, [
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
      { id: "perfil-editar", label: "Editar" },
      { id: "perfil-resumen", label: "Resumen" },
      { id: "perfil-datos", label: "Cuenta y contacto" },
    ]
    base.push(
      { id: "perfil-objetivos", label: "Objetivos laborales" },
      { id: "perfil-trayectoria", label: "Trayectoria" },
      { id: "perfil-competencias", label: "Competencias" },
      { id: "perfil-presencia", label: "Enlaces" },
      { id: "perfil-referencias", label: "Referencias" }
    )
    if (compliance != null) {
      base.push({ id: "perfil-compliance", label: "Cumplimiento" })
    }
    return base
  }, [compliance, isEditing])

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
        if (!res.ok) throw new Error("No se pudo descargar el CV.")
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
      setDownloadError(getApiErrorMessage(err) || "Error al descargar.")
    } finally {
      setDownloading(false)
    }
  }

  const showHero = !!(candidateProfile || selfProfile) || isEditing

  return (
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
        aria-label="Acciones del perfil"
      >
        {isEditing ? (
          <div className="flex flex-col gap-4">
            <div className="min-w-0 space-y-2">
              {validationError ? (
                <div
                  className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 font-inter text-sm text-amber-900 dark:text-amber-100"
                  role="status"
                >
                  {validationError}
                </div>
              ) : null}
              {saveProfileError ? (
                <div
                  className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 font-inter text-sm text-destructive"
                  role="alert"
                >
                  {saveProfileError}
                </div>
              ) : null}
              <p className="font-inter text-xs text-muted-foreground">
                Titular, resumen y documento de identidad son obligatorios al guardar.
              </p>
            </div>
            <div
              role="toolbar"
              aria-label="Descargar CV, documentos o finalizar edición"
              className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3"
            >
              {cvStoragePath || candidateProfile?.cvDownloadUrl?.trim() ? (
                <button
                  type="button"
                  onClick={handleDownloadCv}
                  disabled={downloading}
                  className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 font-inter text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto"
                  aria-label="Descargar tu último CV subido"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  {downloading ? "Descargando…" : "Descargar CV"}
                </button>
              ) : null}
              <Link
                href="/portal-candidato/documentos"
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 font-inter text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 sm:min-h-10 sm:w-auto"
                aria-label="Ir a documentos para gestionar archivos"
              >
                <FileText className="h-4 w-4 shrink-0 text-vo-purple" aria-hidden />
                Gestionar documentos
                <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={savingProfile}
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 font-inter text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:w-auto"
                aria-label="Cancelar edición sin guardar"
              >
                <X className="h-4 w-4 shrink-0" aria-hidden />
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white shadow-sm transition-colors hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto sm:min-w-[140px]"
              >
                {savingProfile ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {savingProfile ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
            {downloadError ? (
              <p className="font-inter text-xs text-destructive" role="alert">
                {downloadError}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="font-inter text-sm leading-relaxed text-muted-foreground">
              {profileNotFound
                ? "Aún no registraste tu ficha. Completá los datos y guardá para activar tu perfil."
                : "Editá tu información en cada sección de la ficha. Descargá tu CV o gestioná documentos cuando lo necesites."}
            </p>
            <div
              role="toolbar"
              aria-label="Descargar CV, editar perfil o gestionar documentos"
              className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
            >
              {cvStoragePath || candidateProfile?.cvDownloadUrl?.trim() ? (
                <button
                  type="button"
                  onClick={handleDownloadCv}
                  disabled={downloading}
                  className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 font-inter text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto"
                  aria-label="Descargar tu último CV subido"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  {downloading ? "Descargando…" : "Descargar CV"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white shadow-sm transition-colors hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 sm:min-h-10 sm:w-auto"
                aria-expanded="false"
              >
                <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                {triggerLabel}
              </button>
              <Link
                href="/portal-candidato/documentos"
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 font-inter text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 sm:min-h-10 sm:w-auto"
                aria-label="Ir a documentos para gestionar archivos"
              >
                <FileText className="h-4 w-4 shrink-0 text-vo-purple" aria-hidden />
                Gestionar documentos
                <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              </Link>
            </div>
            {downloadError ? (
              <p className="font-inter text-xs text-destructive" role="alert">
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
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div
              className="flex h-18 w-18 shrink-0 items-center justify-center rounded-2xl bg-vo-purple font-inter text-xl font-semibold text-white shadow-md shadow-vo-purple/25 md:h-20 md:w-20 md:text-2xl"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <>
                  <h2
                    id="perfil-resumen-titulo"
                    className="font-inter text-xl font-bold leading-tight text-foreground md:text-2xl"
                  >
                    Tu ficha
                  </h2>
                  <p className="mt-1 font-inter text-sm text-muted-foreground">
                    Editá nombre, titular y resumen en el mismo lugar donde los ves al leer el
                    perfil.
                  </p>
                  <div className="mt-4">
                    <ProfileEditHeroFields form={form} patch={patch} saving={savingProfile} />
                  </div>
                </>
              ) : (
                <>
                  <h2
                    id="perfil-resumen-titulo"
                    className="font-inter text-xl font-bold leading-tight text-foreground md:text-2xl"
                  >
                    {displayName}
                  </h2>
                  {headlineDisplay ? (
                    <p className="mt-2 font-inter text-base font-medium text-vo-purple md:text-lg">
                      {headlineDisplay}
                    </p>
                  ) : null}
                  <p className="mt-1 font-inter text-sm text-muted-foreground">
                    Así figura tu perfil profesional en el sistema.
                  </p>
                  {summary ? (
                    <p className="mt-4 max-w-2xl font-inter text-sm leading-relaxed text-foreground/90 md:text-[15px]">
                      {summary}
                    </p>
                  ) : (
                    <p className="mt-4 font-inter text-sm italic text-muted-foreground">
                      Completá el resumen al editar el perfil o desde la información importada de tus
                      documentos.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      ) : profileNotFound ? (
        <div
          className="scroll-mt-28 rounded-2xl border border-dashed border-vo-purple/30 bg-vo-purple/[0.04] p-5 md:p-6"
          role="status"
        >
          <p className="font-inter text-sm leading-relaxed text-foreground">
            Aún no tenés perfil de candidato en el servidor. Tocá{" "}
            <span className="font-medium text-vo-purple">Completar mi perfil</span>, completá los
            datos obligatorios y guardá para activar tu ficha.
          </p>
        </div>
      ) : null}

      <div id="perfil-datos" className="scroll-mt-28">
        <SectionGroupLabel>Cuenta y datos personales</SectionGroupLabel>
        <SectionCard title="Ficha consolidada" icon={User} sectionId="sec-ficha-consolidada">
          <p className="mb-4 font-inter text-sm leading-relaxed text-muted-foreground">
            Combinamos datos de tu cuenta (sesión), del perfil editable y, si aplica, de documentos
            procesados.
          </p>
          {isEditing ? (
            <div className="flex flex-col gap-8">
              <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
                <p className="mb-3 font-inter text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Cuenta (solo lectura)
                </p>
                <InfoGrid
                  items={[
                    { label: "Usuario", value: emptyToDash(accountDisplayUser) },
                    { label: "Rol en la sesión", value: emptyToDash(sessionRole) },
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
            <SectionGroupLabel>Objetivos</SectionGroupLabel>
            <SectionCard title="Preferencias laborales" icon={Briefcase} sectionId="sec-job-prefs-self">
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
            <SectionGroupLabel>Trayectoria profesional</SectionGroupLabel>
            <div className="flex flex-col gap-4 md:gap-5">
              <SectionCard title="Experiencia laboral" icon={Building2} sectionId="sec-work-self">
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
              <SectionCard title="Educación" icon={GraduationCap} sectionId="sec-edu-self">
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
            <SectionGroupLabel>Competencias</SectionGroupLabel>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
              <SectionCard title="Idiomas" icon={Languages} sectionId="sec-lang-self">
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
              <SectionCard title="Habilidades" icon={Sparkles} sectionId="sec-skills-self">
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
            <SectionGroupLabel>Presencia en línea</SectionGroupLabel>
            <SectionCard title="Enlaces" icon={FileText} sectionId="sec-links-self">
              {isEditing ? (
                <ProfileEditSocialVideoFields
                  form={form}
                  setForm={setForm}
                  saving={savingProfile}
                />
              ) : (
                <div>
                  <p className="mb-2 font-inter text-xs font-medium text-muted-foreground">
                    Redes y sitio web
                  </p>
                  <SocialLinksList links={socialLinks} />
                </div>
              )}
            </SectionCard>
          </div>

          <div id="perfil-referencias" className="scroll-mt-28">
            <SectionGroupLabel>Referencias y logros</SectionGroupLabel>
            <div className="flex flex-col gap-4 md:gap-5">
              <SectionCard title="Referencias" icon={Users} sectionId="sec-refs-self">
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
              <SectionCard title="Reconocimientos" icon={Award} sectionId="sec-awards-self">
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
          className="rounded-2xl border border-border bg-muted/30 p-5 font-inter text-sm text-muted-foreground md:p-6"
          role="status"
        >
          Aún no hay trayectoria ni competencias en tu ficha. Podés cargarlas editando el perfil o
          subiendo un CV en{" "}
          <Link
            href="/portal-candidato/documentos"
            className="rounded font-medium text-vo-purple underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
          >
            Documentos
          </Link>
          .
        </div>
      )}

      {compliance != null ? (
        <div id="perfil-compliance" className="scroll-mt-28">
          <SectionGroupLabel>Requisitos y cumplimiento</SectionGroupLabel>
          <SectionCard title="Cumplimiento" icon={Award} sectionId="sec-compliance">
            {formatCompliancePreview(compliance).length > 0 ? (
              <InfoGrid items={formatCompliancePreview(compliance)} />
            ) : (
              <p className="font-inter text-sm text-muted-foreground">—</p>
            )}
          </SectionCard>
        </div>
      ) : null}

      {parseState.normalizedDataParseFailed && parseState.normalizedDataRaw ? (
        <SectionCard
          title="Datos técnicos (revisión)"
          icon={FileText}
          sectionId="sec-nd-raw-self"
        >
          <p
            className="mb-2 font-inter text-xs text-amber-800 dark:text-amber-200"
            role="status"
          >
            Parte de tu perfil llegó en un formato que no se pudo interpretar como JSON. Si ves esto,
            avisá a soporte.
          </p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg border border-border bg-muted/50 p-4 font-mono text-xs text-foreground">
            {parseState.normalizedDataRaw}
          </pre>
        </SectionCard>
      ) : null}
    </form>
  )
}
