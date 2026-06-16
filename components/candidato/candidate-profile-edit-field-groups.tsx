"use client"

import {
  useMemo,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type ReactNode,
  type SetStateAction,
} from "react"
import { Plus, Trash2, X } from "lucide-react"
import { SocialLinkTypePicker } from "@/components/candidato/social-link-type-picker"
import { useProfileEditTranslations } from "@/components/rrhh/CandidateProfileSections"
import { DatePicker } from "@/components/ui/date-picker"
import {
  getBirthDateInputValidationErrorCode,
  type FullProfileFormInput,
} from "@/lib/candidate-profile"
import {
  getAvailabilityOptions,
  getCountrySelectOptions,
  getGenderOptions,
  getMaritalStatusOptions,
  mergeLegacySelectOption,
  type SelectOption,
} from "@/lib/profile-form-options"
import {
  emptyEduRow,
  emptyLangRow,
  emptyRefRow,
  emptyWorkRow,
} from "@/lib/candidate-profile-structured"

export const profileEditInputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

export const sanitizeNonNegativeSalaryInput = (value: string): string => {
  if (!value) return ""
  const stripped = value.replace(/-/g, "")
  if (stripped === "") return ""
  const parsed = Number(stripped)
  if (Number.isNaN(parsed)) return stripped
  return parsed < 0 ? "" : stripped
}

export const blockNegativeNumberKeys = (e: KeyboardEvent<HTMLInputElement>): void => {
  if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
    e.preventDefault()
  }
}

export const profileEditLabelClass =
  "font-sans text-xs font-medium text-muted-foreground md:text-sm"

export const profileEditSectionTitleClass =
  "font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"

function ProfileEditSelect({
  id,
  value,
  onChange,
  disabled,
  options,
  emptyLabel,
}: {
  id: string
  value: string
  onChange: (next: string) => void
  disabled: boolean
  options: SelectOption[]
  emptyLabel: string
}) {
  const t = useProfileEditTranslations()
  const merged = useMemo(
    () =>
      mergeLegacySelectOption(options, value, (legacyValue) =>
        t("form.legacy.currentValue", { value: legacyValue })
      ),
    [options, value, t]
  )
  const hasValue = merged.some((o) => o.value === value)
  return (
    <select
      id={id}
      value={hasValue ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      className={profileEditInputClass}
      disabled={disabled}
    >
      <option value="">{emptyLabel}</option>
      {merged.map((o) => (
        <option key={`${id}-${o.value}`} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function ProfileEditField({
  label,
  required,
  htmlFor,
  children,
  className = "",
  hint,
  error,
}: {
  label: string
  required?: boolean
  htmlFor: string
  children: ReactNode
  className?: string
  hint?: string
  error?: string | null
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className={profileEditLabelClass}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="font-sans text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="font-sans text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

interface EditorFieldsBase {
  form: FullProfileFormInput
  setForm: Dispatch<SetStateAction<FullProfileFormInput>>
  patch: (partial: Partial<FullProfileFormInput>) => void
  saving: boolean
}

export function ProfileEditHeroFields({
  form,
  patch,
  saving,
}: Pick<EditorFieldsBase, "form" | "patch" | "saving">) {
  const t = useProfileEditTranslations()
  return (
    <div className="flex flex-col gap-4">
      <p className={profileEditSectionTitleClass}>{t("form.identitySummary")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileEditField label={t("form.labels.firstName")} htmlFor="pf-first">
          <input
            id="pf-first"
            autoComplete="given-name"
            value={form.firstName}
            onChange={(e) => patch({ firstName: e.target.value })}
            className={profileEditInputClass}
            disabled={saving}
          />
        </ProfileEditField>
        <ProfileEditField label={t("form.labels.lastName")} htmlFor="pf-last">
          <input
            id="pf-last"
            autoComplete="family-name"
            value={form.lastName}
            onChange={(e) => patch({ lastName: e.target.value })}
            className={profileEditInputClass}
            disabled={saving}
          />
        </ProfileEditField>
        <ProfileEditField label={t("form.labels.headline")} required htmlFor="pf-headline" className="sm:col-span-2">
          <input
            id="pf-headline"
            value={form.headline}
            onChange={(e) => patch({ headline: e.target.value })}
            className={profileEditInputClass}
            disabled={saving}
            autoComplete="off"
          />
        </ProfileEditField>
        <ProfileEditField label={t("form.labels.summary")} required htmlFor="pf-summary" className="sm:col-span-2">
          <textarea
            id="pf-summary"
            rows={4}
            value={form.summary}
            onChange={(e) => patch({ summary: e.target.value })}
            className={`${profileEditInputClass} min-h-[100px] resize-y`}
            disabled={saving}
          />
        </ProfileEditField>
      </div>
    </div>
  )
}

export function ProfileEditNationalIdField({ form, patch, saving }: EditorFieldsBase) {
  const t = useProfileEditTranslations()
  return (
    <ProfileEditField label={t("form.labels.nationalId")} required htmlFor="pf-national-id">
      <input
        id="pf-national-id"
        value={form.nationalId}
        onChange={(e) => patch({ nationalId: e.target.value })}
        className={profileEditInputClass}
        disabled={saving}
        autoComplete="off"
      />
    </ProfileEditField>
  )
}

export function ProfileEditContactFields({ form, patch, saving }: EditorFieldsBase) {
  const t = useProfileEditTranslations()
  return (
    <div className="flex flex-col gap-4">
      <p className={profileEditSectionTitleClass}>{t("form.contact")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileEditField label={t("form.labels.email")} htmlFor="pf-email">
          <input
            id="pf-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => patch({ email: e.target.value })}
            className={profileEditInputClass}
            disabled={saving}
          />
        </ProfileEditField>
        <ProfileEditField label={t("form.labels.phone")} htmlFor="pf-phone">
          <input
            id="pf-phone"
            type="tel"
            autoComplete="tel"
            value={form.phoneNumber}
            onChange={(e) => patch({ phoneNumber: e.target.value })}
            className={profileEditInputClass}
            disabled={saving}
          />
        </ProfileEditField>
      </div>
    </div>
  )
}

export function ProfileEditLocationAndPersonalFields({ form, patch, saving }: EditorFieldsBase) {
  const t = useProfileEditTranslations()
  const countryOptions = useMemo(
    () => getCountrySelectOptions().map((c) => ({ value: c.value, label: c.label })),
    []
  )
  const birthDateErrorCode = useMemo(
    () => getBirthDateInputValidationErrorCode(form.birthDateInput),
    [form.birthDateInput]
  )
  const birthDateError = birthDateErrorCode
    ? t(`form.validation.birthDate.${birthDateErrorCode}`)
    : null

  return (
    <div className="flex flex-col gap-4">
      <p className={profileEditSectionTitleClass}>{t("form.locationPersonal")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileEditField label={t("form.labels.country")} htmlFor="pf-country" className="sm:col-span-2">
          <ProfileEditSelect
            id="pf-country"
            value={form.country}
            onChange={(country) => patch({ country })}
            disabled={saving}
            options={countryOptions}
            emptyLabel={t("form.selects.selectCountry")}
          />
        </ProfileEditField>
        <ProfileEditField
          label={t("form.labels.birthDate")}
          htmlFor="pf-birth"
          error={birthDateError}
        >
          <DatePicker
            id="pf-birth"
            value={form.birthDateInput}
            onChange={(birthDateInput) => patch({ birthDateInput })}
            disabled={saving}
            ariaLabel={t("form.labels.birthDate")}
            errorMessage={birthDateError}
            buttonClassName={`${profileEditInputClass} justify-center text-center`}
            wrapperClassName="relative w-full"
          />
        </ProfileEditField>
        <ProfileEditField label={t("form.labels.birthCity")} htmlFor="pf-birth-city">
          <input
            id="pf-birth-city"
            value={form.birthCity}
            onChange={(e) => patch({ birthCity: e.target.value })}
            className={profileEditInputClass}
            disabled={saving}
          />
        </ProfileEditField>
        <ProfileEditField label={t("form.labels.maritalStatus")} htmlFor="pf-marital">
          <ProfileEditSelect
            id="pf-marital"
            value={form.maritalStatus}
            onChange={(maritalStatus) => patch({ maritalStatus })}
            disabled={saving}
            options={getMaritalStatusOptions(t)}
            emptyLabel={t("form.selects.unspecified")}
          />
        </ProfileEditField>
        <ProfileEditField label={t("form.labels.gender")} htmlFor="pf-gender">
          <ProfileEditSelect
            id="pf-gender"
            value={form.gender}
            onChange={(gender) => patch({ gender })}
            disabled={saving}
            options={getGenderOptions(t)}
            emptyLabel={t("form.selects.unspecified")}
          />
        </ProfileEditField>
      </div>
    </div>
  )
}

function ProfileEditSectorsTags({
  id,
  sectors,
  onSectorsChange,
  disabled,
}: {
  id: string
  sectors: string[]
  onSectorsChange: (next: string[]) => void
  disabled: boolean
}) {
  const t = useProfileEditTranslations()
  const [draft, setDraft] = useState("")

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const t = draft.trim()
      if (!t) return
      const exists = sectors.some((s) => s.toLowerCase() === t.toLowerCase())
      if (exists) {
        setDraft("")
        return
      }
      onSectorsChange([...sectors, t])
      setDraft("")
      return
    }
    if (e.key === "Backspace" && draft === "" && sectors.length > 0) {
      e.preventDefault()
      onSectorsChange(sectors.slice(0, -1))
    }
  }

  const handleRemoveAt = (index: number) => {
    onSectorsChange(sectors.filter((_, i) => i !== index))
  }

  return (
    <div
      role="group"
      aria-label={t("form.aria.sectorsGroup")}
      className={`${profileEditInputClass} flex min-h-11 flex-wrap items-center gap-2 py-2`}
    >
      {sectors.map((label, index) => (
        <span
          key={`${label}-${index}`}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-vo-purple bg-background px-2.5 py-1 font-sans text-sm font-medium text-vo-purple"
        >
          <span className="truncate">{label}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleRemoveAt(index)}
            className="shrink-0 rounded-full p-0.5 text-vo-purple hover:bg-vo-purple/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={t("form.aria.removeSector", { label })}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      ))}
      <input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="min-w-40 flex-1 border-0 bg-transparent py-0.5 font-sans text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0 disabled:cursor-not-allowed"
        placeholder={
          sectors.length === 0
            ? t("form.placeholders.sectorsEmpty")
            : t("form.placeholders.sectorsMore")
        }
      />
    </div>
  )
}

export function ProfileEditJobPreferencesFields({ form, patch, saving }: EditorFieldsBase) {
  const t = useProfileEditTranslations()
  return (
    <div className="flex flex-col gap-4">
      <p className={profileEditSectionTitleClass}>{t("form.jobPreferences")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileEditField label={t("form.labels.sectors")} htmlFor="pf-sectors" className="sm:col-span-2">
          <ProfileEditSectorsTags
            id="pf-sectors"
            sectors={form.sectors}
            onSectorsChange={(next) => patch({ sectors: next })}
            disabled={saving}
          />
        </ProfileEditField>
        <ProfileEditField label={t("form.labels.desiredRole")} htmlFor="pf-job-role">
          <input
            id="pf-job-role"
            value={form.jobDesiredRole}
            onChange={(e) => patch({ jobDesiredRole: e.target.value })}
            className={profileEditInputClass}
            disabled={saving}
          />
        </ProfileEditField>
        <ProfileEditField label={t("form.labels.minSalary")} htmlFor="pf-job-min">
          <input
            id="pf-job-min"
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            value={form.jobMinSalary}
            onChange={(e) => patch({ jobMinSalary: sanitizeNonNegativeSalaryInput(e.target.value) })}
            onKeyDown={blockNegativeNumberKeys}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text")
              const sanitized = sanitizeNonNegativeSalaryInput(pasted)
              if (sanitized !== pasted) {
                e.preventDefault()
                patch({ jobMinSalary: sanitized })
              }
            }}
            className={profileEditInputClass}
            disabled={saving}
          />
        </ProfileEditField>
        <ProfileEditField label={t("form.labels.educationLevel")} htmlFor="pf-job-edu">
          <input
            id="pf-job-edu"
            value={form.jobEducationLevel}
            onChange={(e) => patch({ jobEducationLevel: e.target.value })}
            className={profileEditInputClass}
            disabled={saving}
          />
        </ProfileEditField>
        <ProfileEditField label={t("form.labels.desiredCity")} htmlFor="pf-job-city">
          <input
            id="pf-job-city"
            value={form.jobDesiredCity}
            onChange={(e) => patch({ jobDesiredCity: e.target.value })}
            className={profileEditInputClass}
            disabled={saving}
          />
        </ProfileEditField>
        <ProfileEditField label={t("form.labels.availability")} htmlFor="pf-job-avail">
          <ProfileEditSelect
            id="pf-job-avail"
            value={form.jobAvailability}
            onChange={(jobAvailability) => patch({ jobAvailability })}
            disabled={saving}
            options={getAvailabilityOptions(t)}
            emptyLabel={t("form.selects.unspecified")}
          />
        </ProfileEditField>
        <ProfileEditField label={t("form.labels.disability")} htmlFor="pf-job-dis">
          <select
            id="pf-job-dis"
            value={form.jobDisability}
            onChange={(e) =>
              patch({ jobDisability: e.target.value as "" | "yes" | "no" })
            }
            className={profileEditInputClass}
            disabled={saving}
          >
            <option value="">{t("form.selects.disabilityUnset")}</option>
            <option value="yes">{t("form.selects.yes")}</option>
            <option value="no">{t("form.selects.no")}</option>
          </select>
        </ProfileEditField>
      </div>
    </div>
  )
}

export function ProfileEditResumeMarkdownField({ form, patch, saving }: EditorFieldsBase) {
  const t = useProfileEditTranslations()
  return (
    <ProfileEditField
      label={t("form.labels.resumeMarkdown")}
      required
      htmlFor="pf-resume-md"
      hint={t("form.hints.resumeMarkdown")}
    >
      <textarea
        id="pf-resume-md"
        rows={10}
        value={form.resumeMarkdown}
        onChange={(e) => patch({ resumeMarkdown: e.target.value })}
        className={`${profileEditInputClass} min-h-[200px] resize-y font-mono text-[13px]`}
        disabled={saving}
      />
    </ProfileEditField>
  )
}

export function ProfileEditWorkFields({ form, setForm, saving }: EditorFieldsBase) {
  const t = useProfileEditTranslations()
  return (
    <div className="flex flex-col gap-4">
      <p className={profileEditSectionTitleClass}>{t("form.workExperience")}</p>
      {form.workRows.map((row, index) => (
        <div
          key={`work-${index}`}
          className="rounded-xl border border-border/80 bg-muted/20 p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="font-sans text-xs font-medium text-muted-foreground">
              {t("form.items.experience", { index: index + 1 })}
            </span>
            {form.workRows.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    workRows: f.workRows.filter((_, i) => i !== index),
                  }))
                }
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-sans text-xs text-destructive hover:bg-destructive/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
                aria-label={t("form.aria.removeExperience", { index: index + 1 })}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {t("form.buttons.remove")}
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileEditField label={t("form.labels.company")} htmlFor={`pf-wc-${index}`}>
              <input
                id={`pf-wc-${index}`}
                value={row.company}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    workRows: f.workRows.map((r, i) =>
                      i === index ? { ...r, company: v } : r
                    ),
                  }))
                }}
                className={profileEditInputClass}
                disabled={saving}
              />
            </ProfileEditField>
            <ProfileEditField label={t("form.labels.role")} htmlFor={`pf-wr-${index}`}>
              <input
                id={`pf-wr-${index}`}
                value={row.role}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    workRows: f.workRows.map((r, i) =>
                      i === index ? { ...r, role: v } : r
                    ),
                  }))
                }}
                className={profileEditInputClass}
                disabled={saving}
              />
            </ProfileEditField>
            <ProfileEditField label={t("form.labels.start")} htmlFor={`pf-ws-${index}`}>
              <input
                id={`pf-ws-${index}`}
                value={row.startDate}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    workRows: f.workRows.map((r, i) =>
                      i === index ? { ...r, startDate: v } : r
                    ),
                  }))
                }}
                className={profileEditInputClass}
                disabled={saving}
                placeholder={t("form.placeholders.workStart")}
              />
            </ProfileEditField>
            <ProfileEditField label={t("form.labels.end")} htmlFor={`pf-we-${index}`}>
              <input
                id={`pf-we-${index}`}
                value={row.endDate}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    workRows: f.workRows.map((r, i) =>
                      i === index ? { ...r, endDate: v } : r
                    ),
                  }))
                }}
                className={profileEditInputClass}
                disabled={saving}
                placeholder={t("form.placeholders.workEnd")}
              />
            </ProfileEditField>
            <ProfileEditField label={t("form.labels.description")} htmlFor={`pf-wd-${index}`} className="sm:col-span-2">
              <textarea
                id={`pf-wd-${index}`}
                rows={3}
                value={row.description}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    workRows: f.workRows.map((r, i) =>
                      i === index ? { ...r, description: v } : r
                    ),
                  }))
                }}
                className={`${profileEditInputClass} resize-y`}
                disabled={saving}
              />
            </ProfileEditField>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setForm((f) => ({ ...f, workRows: [...f.workRows, emptyWorkRow()] }))
        }
        disabled={saving}
        className="inline-flex w-fit items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2 font-sans text-sm font-medium text-vo-purple hover:bg-vo-purple/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("form.buttons.addExperience")}
      </button>
    </div>
  )
}

export function ProfileEditEducationFields({ form, setForm, saving }: EditorFieldsBase) {
  const t = useProfileEditTranslations()
  return (
    <div className="flex flex-col gap-4">
      <p className={profileEditSectionTitleClass}>{t("form.education")}</p>
      {form.educationRows.map((row, index) => (
        <div
          key={`edu-${index}`}
          className="rounded-xl border border-border/80 bg-muted/20 p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="font-sans text-xs font-medium text-muted-foreground">
              {t("form.items.education", { index: index + 1 })}
            </span>
            {form.educationRows.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    educationRows: f.educationRows.filter((_, i) => i !== index),
                  }))
                }
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-sans text-xs text-destructive hover:bg-destructive/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
                aria-label={t("form.aria.removeEducation", { index: index + 1 })}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {t("form.buttons.remove")}
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileEditField label={t("form.labels.institution")} htmlFor={`pf-ei-${index}`} className="sm:col-span-2">
              <input
                id={`pf-ei-${index}`}
                value={row.institution}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    educationRows: f.educationRows.map((r, i) =>
                      i === index ? { ...r, institution: v } : r
                    ),
                  }))
                }}
                className={profileEditInputClass}
                disabled={saving}
              />
            </ProfileEditField>
            <ProfileEditField label={t("form.labels.degree")} htmlFor={`pf-ed-${index}`} className="sm:col-span-2">
              <input
                id={`pf-ed-${index}`}
                value={row.degree}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    educationRows: f.educationRows.map((r, i) =>
                      i === index ? { ...r, degree: v } : r
                    ),
                  }))
                }}
                className={profileEditInputClass}
                disabled={saving}
              />
            </ProfileEditField>
            <ProfileEditField label={t("form.labels.start")} htmlFor={`pf-es-${index}`}>
              <input
                id={`pf-es-${index}`}
                value={row.startDate}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    educationRows: f.educationRows.map((r, i) =>
                      i === index ? { ...r, startDate: v } : r
                    ),
                  }))
                }}
                className={profileEditInputClass}
                disabled={saving}
              />
            </ProfileEditField>
            <ProfileEditField label={t("form.labels.end")} htmlFor={`pf-ee-${index}`}>
              <input
                id={`pf-ee-${index}`}
                value={row.endDate}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    educationRows: f.educationRows.map((r, i) =>
                      i === index ? { ...r, endDate: v } : r
                    ),
                  }))
                }}
                className={profileEditInputClass}
                disabled={saving}
              />
            </ProfileEditField>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setForm((f) => ({
            ...f,
            educationRows: [...f.educationRows, emptyEduRow()],
          }))
        }
        disabled={saving}
        className="inline-flex w-fit items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2 font-sans text-sm font-medium text-vo-purple hover:bg-vo-purple/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("form.buttons.addEducation")}
      </button>
    </div>
  )
}

export function ProfileEditLanguagesFields({ form, setForm, saving }: EditorFieldsBase) {
  const t = useProfileEditTranslations()
  return (
    <div className="flex flex-col gap-4">
      <p className={profileEditSectionTitleClass}>{t("form.languages")}</p>
      {form.languageRows.map((row, index) => (
        <div key={`lang-${index}`} className="grid gap-3 sm:grid-cols-2">
          <ProfileEditField label={t("form.labels.language", { index: index + 1 })} htmlFor={`pf-ln-${index}`}>
            <input
              id={`pf-ln-${index}`}
              value={row.language}
              onChange={(e) => {
                const v = e.target.value
                setForm((f) => ({
                  ...f,
                  languageRows: f.languageRows.map((r, i) =>
                    i === index ? { ...r, language: v } : r
                  ),
                }))
              }}
              className={profileEditInputClass}
              disabled={saving}
            />
          </ProfileEditField>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <ProfileEditField label={t("form.labels.level")} htmlFor={`pf-ll-${index}`}>
                <input
                  id={`pf-ll-${index}`}
                  value={row.level}
                  onChange={(e) => {
                    const v = e.target.value
                    setForm((f) => ({
                      ...f,
                      languageRows: f.languageRows.map((r, i) =>
                        i === index ? { ...r, level: v } : r
                      ),
                    }))
                  }}
                  className={profileEditInputClass}
                  disabled={saving}
                />
              </ProfileEditField>
            </div>
            {form.languageRows.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    languageRows: f.languageRows.filter((_, i) => i !== index),
                  }))
                }
                disabled={saving}
                className="mb-0.5 shrink-0 rounded-lg p-2 text-destructive hover:bg-destructive/10"
                aria-label={t("form.aria.removeLanguage", { index: index + 1 })}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setForm((f) => ({
            ...f,
            languageRows: [...f.languageRows, emptyLangRow()],
          }))
        }
        disabled={saving}
        className="inline-flex w-fit items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2 font-sans text-sm font-medium text-vo-purple hover:bg-vo-purple/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("form.buttons.addLanguage")}
      </button>
    </div>
  )
}

export function ProfileEditSkillsField({ form, patch, saving }: EditorFieldsBase) {
  const t = useProfileEditTranslations()
  return (
    <div className="flex flex-col gap-4">
      <p className={profileEditSectionTitleClass}>{t("form.skills")}</p>
      <ProfileEditField
        label={t("form.labels.skillsOnePerLine")}
        htmlFor="pf-skills"
        hint={t("form.hints.skills")}
      >
        <textarea
          id="pf-skills"
          rows={6}
          value={form.skillsText}
          onChange={(e) => patch({ skillsText: e.target.value })}
          className={`${profileEditInputClass} resize-y font-mono text-[13px]`}
          disabled={saving}
        />
      </ProfileEditField>
    </div>
  )
}

export function ProfileEditSocialVideoFields({
  form,
  setForm,
  saving,
}: Pick<EditorFieldsBase, "form" | "setForm" | "saving">) {
  const t = useProfileEditTranslations()
  const [isAddingLinkOpen, setIsAddingLinkOpen] = useState(false)
  const [addDraftKey, setAddDraftKey] = useState(0)
  const [draftPlatform, setDraftPlatform] = useState("")
  const [draftUrl, setDraftUrl] = useState("")
  const [addLinkError, setAddLinkError] = useState<string | null>(null)

  const resetAddDraft = () => {
    setDraftPlatform("")
    setDraftUrl("")
    setAddLinkError(null)
    setAddDraftKey((k) => k + 1)
  }

  const handleOpenAddPanel = () => {
    resetAddDraft()
    setIsAddingLinkOpen(true)
  }

  const handleCancelAddPanel = () => {
    setIsAddingLinkOpen(false)
    resetAddDraft()
  }

  const handleConfirmAddLink = () => {
    const urlTrim = draftUrl.trim()
    const platformTrim = draftPlatform.trim()
    if (!platformTrim) {
      setAddLinkError(t("form.addLink.errorSelectType"))
      return
    }
    if (!urlTrim) {
      setAddLinkError(t("form.addLink.errorUrl"))
      return
    }
    setForm((f) => ({
      ...f,
      socialRows: [...f.socialRows, { platform: platformTrim, url: urlTrim }],
    }))
    setIsAddingLinkOpen(false)
    resetAddDraft()
  }

  return (
    <div className="flex flex-col gap-4">
      <p className={profileEditSectionTitleClass}>{t("form.links")}</p>

      {form.socialRows.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground">
          {t("form.addLink.emptyHint")}
        </p>
      ) : null}

      {form.socialRows.map((row, index) => (
        <div
          key={`soc-${index}`}
          className="grid gap-4 rounded-xl border border-border/80 bg-muted/20 p-4 sm:grid-cols-2"
        >
          <div className="flex items-center justify-between gap-2 sm:col-span-2">
            <span className="font-sans text-xs font-medium text-muted-foreground">
              {t("form.items.link", { index: index + 1 })}
            </span>
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  socialRows: f.socialRows.filter((_, i) => i !== index),
                }))
              }
              disabled={saving}
              className="font-sans text-xs text-destructive hover:underline"
            >
              {t("form.buttons.remove")}
            </button>
          </div>
          <div className="sm:col-span-2">
            <SocialLinkTypePicker
              id={`pf-sp-${index}`}
              platformValue={row.platform}
              onPlatformChange={(v) =>
                setForm((f) => ({
                  ...f,
                  socialRows: f.socialRows.map((r, i) =>
                    i === index ? { ...r, platform: v } : r
                  ),
                }))
              }
              disabled={saving}
            />
          </div>
          <ProfileEditField label={t("form.labels.url")} required htmlFor={`pf-su-${index}`} className="sm:col-span-2">
            <input
              id={`pf-su-${index}`}
              type="url"
              value={row.url}
              onChange={(e) => {
                const v = e.target.value
                setForm((f) => ({
                  ...f,
                  socialRows: f.socialRows.map((r, i) =>
                    i === index ? { ...r, url: v } : r
                  ),
                }))
              }}
              className={profileEditInputClass}
              disabled={saving}
              placeholder={t("form.placeholders.url")}
            />
          </ProfileEditField>
        </div>
      ))}
      {isAddingLinkOpen ? (
        <section
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
          aria-labelledby="pf-add-link-heading"
        >
          <h3
            id="pf-add-link-heading"
            className="mb-4 font-sans text-base font-semibold text-foreground"
          >
            {t("form.addLink.heading")}
          </h3>
          <div className="flex flex-col gap-4">
            <SocialLinkTypePicker
              key={addDraftKey}
              id="pf-add-social-type"
              platformValue={draftPlatform}
              onPlatformChange={(v) => {
                setDraftPlatform(v)
                setAddLinkError(null)
              }}
              disabled={saving}
              required
            />
            <ProfileEditField label={t("form.labels.url")} required htmlFor="pf-add-social-url">
              <input
                id="pf-add-social-url"
                type="url"
                value={draftUrl}
                onChange={(e) => {
                  setDraftUrl(e.target.value)
                  setAddLinkError(null)
                }}
                className={profileEditInputClass}
                disabled={saving}
                placeholder={t("form.placeholders.url")}
              />
            </ProfileEditField>
            {addLinkError ? (
              <p className="font-sans text-sm text-destructive" role="alert">
                {addLinkError}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={handleCancelAddPanel}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-5 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("form.buttons.cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmAddLink}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("form.buttons.addLink")}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={handleOpenAddPanel}
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 font-sans text-sm font-medium text-vo-purple hover:bg-vo-purple/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple sm:w-fit"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t("form.buttons.addLink")}
        </button>
      )}
    </div>
  )
}

export function ProfileEditReferencesFields({ form, setForm, saving }: EditorFieldsBase) {
  const t = useProfileEditTranslations()
  return (
    <div className="flex flex-col gap-4">
      <p className={profileEditSectionTitleClass}>{t("form.references")}</p>
      {form.referenceRows.map((row, index) => (
        <div
          key={`ref-${index}`}
          className="rounded-xl border border-border/80 bg-muted/20 p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="font-sans text-xs font-medium text-muted-foreground">
              {t("form.items.reference", { index: index + 1 })}
            </span>
            {form.referenceRows.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    referenceRows: f.referenceRows.filter((_, i) => i !== index),
                  }))
                }
                disabled={saving}
                className="text-xs text-destructive hover:underline"
              >
                {t("form.buttons.remove")}
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileEditField label={t("form.labels.referenceName")} htmlFor={`pf-rn-${index}`}>
              <input
                id={`pf-rn-${index}`}
                value={row.name}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    referenceRows: f.referenceRows.map((r, i) =>
                      i === index ? { ...r, name: v } : r
                    ),
                  }))
                }}
                className={profileEditInputClass}
                disabled={saving}
              />
            </ProfileEditField>
            <ProfileEditField label={t("form.labels.position")} htmlFor={`pf-rp-${index}`}>
              <input
                id={`pf-rp-${index}`}
                value={row.position}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    referenceRows: f.referenceRows.map((r, i) =>
                      i === index ? { ...r, position: v } : r
                    ),
                  }))
                }}
                className={profileEditInputClass}
                disabled={saving}
              />
            </ProfileEditField>
            <ProfileEditField label={t("form.labels.company")} htmlFor={`pf-rc-${index}`}>
              <input
                id={`pf-rc-${index}`}
                value={row.company}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    referenceRows: f.referenceRows.map((r, i) =>
                      i === index ? { ...r, company: v } : r
                    ),
                  }))
                }}
                className={profileEditInputClass}
                disabled={saving}
              />
            </ProfileEditField>
            <ProfileEditField label={t("form.labels.contact")} htmlFor={`pf-rx-${index}`}>
              <input
                id={`pf-rx-${index}`}
                value={row.contact}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    referenceRows: f.referenceRows.map((r, i) =>
                      i === index ? { ...r, contact: v } : r
                    ),
                  }))
                }}
                className={profileEditInputClass}
                disabled={saving}
              />
            </ProfileEditField>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setForm((f) => ({
            ...f,
            referenceRows: [...f.referenceRows, emptyRefRow()],
          }))
        }
        disabled={saving}
        className="inline-flex w-fit items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2 font-sans text-sm font-medium text-vo-purple hover:bg-vo-purple/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("form.buttons.addReference")}
      </button>
    </div>
  )
}

export function ProfileEditRecognitionsField({ form, patch, saving }: EditorFieldsBase) {
  const t = useProfileEditTranslations()
  return (
    <div className="flex flex-col gap-4">
      <p className={profileEditSectionTitleClass}>{t("form.recognitions")}</p>
      <ProfileEditField
        label={t("form.labels.recognitionsOnePerLine")}
        htmlFor="pf-recog"
        hint={t("form.hints.recognitions")}
      >
        <textarea
          id="pf-recog"
          rows={5}
          value={form.recognitionsText}
          onChange={(e) => patch({ recognitionsText: e.target.value })}
          className={`${profileEditInputClass} resize-y`}
          disabled={saving}
        />
      </ProfileEditField>
    </div>
  )
}
