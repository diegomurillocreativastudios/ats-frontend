"use client"

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import Snackbar from "@/components/ui/Snackbar"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { RecruiterAvatar } from "@/components/rrhh/recruiter-avatar"
import { SettingsPageSection } from "@/components/rrhh/settings-page-section"
import { updateRecruiterAccount } from "@/lib/api/recruiter-account"
import {
  deleteRecruiterProfilePhoto,
  RECRUITER_PHOTO_ALLOWLIST,
  uploadRecruiterProfilePhoto,
} from "@/lib/api/recruiter-profile-photo"
import { parseRetryAfterSeconds } from "@/lib/auth/retry-after"
import {
  RECRUITER_DISPLAY_NAME_MAX,
  resolveRecruiterProfileName,
  validateRecruiterDisplayName,
} from "@/lib/rrhh/recruiter-display-name"
import { writeRecruiterPhotoCache } from "@/lib/rrhh/recruiter-photo-cache"
import { notifyCurrentUserUpdated, useCurrentUser } from "@/hooks/useCurrentUser"
import { resolveSidebarRoleLabelKey } from "@/lib/sidebar-user-display"
import {
  getUploadApiErrorMessage,
  LOGO_ACCEPT,
  validateUploadFile,
} from "@/lib/upload-constraints"

function readErrorStatus(err: unknown): number {
  if (typeof err === "object" && err !== null && "status" in err) {
    return Number((err as { status?: number }).status) || 0
  }
  return 0
}

function readErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message.trim()
  return ""
}

function readRetryAfterSeconds(err: unknown): number {
  if (typeof err === "object" && err !== null && "retryAfter" in err) {
    const value = Number((err as { retryAfter?: number }).retryAfter)
    if (Number.isFinite(value) && value > 0) return value
  }
  return parseRetryAfterSeconds(null)
}

/** Correo y rol de cuenta: texto suelto, no inputs bloqueados. */
function ProfileReadOnlyField({
  id,
  label,
  value,
  hint,
}: {
  id: string
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-sans text-sm font-medium text-foreground">{label}</p>
      <p id={id} className="font-sans text-sm text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="font-sans text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export function ProfileSettingsClient() {
  const tPage = useTranslations("RecruiterPortal.settings.profilePage")
  const tSidebar = useTranslations("Sidebar")
  const { user, photoSrc, loading } = useCurrentUser()
  const photoInputId = useId()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState("")
  const [nameError, setNameError] = useState("")
  const [photoError, setPhotoError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false)
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: "success" | "error"
    message: string
  }>({ open: false, variant: "success", message: "" })

  useEffect(() => {
    if (!user) return
    setDisplayName(resolveRecruiterProfileName(user))
  }, [user])

  useEffect(() => {
    if (rateLimitedUntil == null) return
    const remaining = rateLimitedUntil - Date.now()
    if (remaining <= 0) {
      setRateLimitedUntil(null)
      return
    }
    const timer = window.setTimeout(() => {
      setRateLimitedUntil(null)
    }, remaining)
    return () => window.clearTimeout(timer)
  }, [rateLimitedUntil])

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value)
    if (nameError) setNameError("")
  }

  const roleKey = resolveSidebarRoleLabelKey(user?.role)
  const roleLabel = roleKey
    ? tSidebar(roleKey)
    : user?.role?.trim() || tPage("roleUnknown")
  const emailValue = user?.email?.trim() ?? ""
  const savedName = resolveRecruiterProfileName(user ?? {})
  const hasNameChange = displayName.trim() !== savedName
  const isRateLimited =
    rateLimitedUntil != null && rateLimitedUntil > Date.now()
  const hasPhoto = Boolean(user?.hasPhoto && photoSrc)
  const isPhotoBusy = isUploadingPhoto || isRemovingPhoto
  const photoAlt = tPage("photoAlt", {
    name: displayName.trim() || savedName || emailValue,
  })

  const handleRateLimited = (err: unknown) => {
    const waitMs = readRetryAfterSeconds(err) * 1000
    setRateLimitedUntil(Date.now() + waitMs)
    setSnackbar({
      open: true,
      variant: "error",
      message: tPage("rateLimited"),
    })
  }

  const handleOpenPhotoPicker = () => {
    if (isRateLimited || isPhotoBusy) return
    photoInputRef.current?.click()
  }

  const handlePhotoFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ""
    if (!file || !user) return

    const validation = validateUploadFile(file, RECRUITER_PHOTO_ALLOWLIST)
    if (!validation.valid) {
      const reason = validation.reason
      setPhotoError(
        reason === "size"
          ? tPage("photoTooLarge")
          : reason === "empty"
            ? tPage("photoEmpty")
            : tPage("photoInvalidType")
      )
      return
    }

    setPhotoError("")
    setIsUploadingPhoto(true)
    try {
      const photo = await uploadRecruiterProfilePhoto(file)
      writeRecruiterPhotoCache(user.id, photo.dataUri, photo.photoFileId)
      notifyCurrentUserUpdated()
      setSnackbar({
        open: true,
        variant: "success",
        message: tPage("photoUploadedToast"),
      })
    } catch (err) {
      const status = readErrorStatus(err)
      if (status === 401) return
      if (status === 429) {
        handleRateLimited(err)
        return
      }
      setPhotoError(
        getUploadApiErrorMessage(err, {
          tooLarge: tPage("photoTooLarge"),
          typeMismatch: tPage("photoInvalidType"),
          unsupported: tPage("photoInvalidType"),
          generic: tPage("photoFailed"),
        })
      )
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!user || !hasPhoto || isRateLimited || isPhotoBusy) return

    setPhotoError("")
    setIsRemovingPhoto(true)
    try {
      await deleteRecruiterProfilePhoto()
      writeRecruiterPhotoCache(user.id, null)
      notifyCurrentUserUpdated()
      setSnackbar({
        open: true,
        variant: "success",
        message: tPage("photoRemovedToast"),
      })
    } catch (err) {
      const status = readErrorStatus(err)
      if (status === 401) return
      if (status === 429) {
        handleRateLimited(err)
        return
      }
      setPhotoError(readErrorMessage(err) || tPage("photoFailed"))
    } finally {
      setIsRemovingPhoto(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = validateRecruiterDisplayName(displayName)
    if (validation) {
      setNameError(tPage(validation))
      return
    }
    if (!hasNameChange || isRateLimited || isPhotoBusy) return

    setIsSaving(true)
    try {
      const account = await updateRecruiterAccount({
        userName: displayName.trim(),
      })
      setDisplayName(resolveRecruiterProfileName(account))
      notifyCurrentUserUpdated()
      setSnackbar({
        open: true,
        variant: "success",
        message: tPage("savedToast"),
      })
    } catch (err) {
      const status = readErrorStatus(err)
      if (status === 400) {
        setNameError(readErrorMessage(err) || tPage("saveFailed"))
        return
      }
      if (status === 429) {
        handleRateLimited(err)
        return
      }
      if (status === 401) {
        return
      }
      setSnackbar({
        open: true,
        variant: "error",
        message: readErrorMessage(err) || tPage("saveFailed"),
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SettingsPageSection
      title={tPage("title")}
      description={tPage("pageDescription")}
    >
      <section
        aria-label={tPage("title")}
        className="w-full max-w-2xl"
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : !user ? (
          <p
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-sans text-sm text-destructive"
            role="alert"
          >
            {tPage("loadFailed")}
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <RecruiterAvatar
                name={savedName}
                email={emailValue}
                photoSrc={photoSrc}
                size="lg"
                alt={hasPhoto ? photoAlt : ""}
              />
              <div className="min-w-0 flex-1">
                <p className="font-sans text-sm font-medium text-foreground">
                  {tPage("photoLabel")}
                </p>
                <p className="mt-1 font-sans text-xs text-muted-foreground">
                  {tPage("photoHint")}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    loading={isUploadingPhoto}
                    disabled={isPhotoBusy || isRateLimited}
                    className="h-10 px-4 py-0"
                    aria-label={
                      hasPhoto ? tPage("photoChange") : tPage("photoAdd")
                    }
                    onClick={handleOpenPhotoPicker}
                  >
                    {isUploadingPhoto
                      ? tPage("photoUploading")
                      : hasPhoto
                        ? tPage("photoChange")
                        : tPage("photoAdd")}
                  </Button>
                  {hasPhoto ? (
                    <Button
                      type="button"
                      variant="ghost"
                      loading={isRemovingPhoto}
                      disabled={isPhotoBusy || isRateLimited}
                      className="h-10 px-4 py-0 text-destructive hover:text-destructive"
                      aria-label={tPage("photoRemove")}
                      onClick={() => {
                        void handleRemovePhoto()
                      }}
                    >
                      {isRemovingPhoto
                        ? tPage("photoRemoving")
                        : tPage("photoRemove")}
                    </Button>
                  ) : null}
                </div>
                <input
                  id={photoInputId}
                  ref={photoInputRef}
                  type="file"
                  accept={LOGO_ACCEPT}
                  className="sr-only"
                  aria-label={tPage("photoLabel")}
                  disabled={isPhotoBusy || isRateLimited}
                  onChange={(event) => {
                    void handlePhotoFileChange(event)
                  }}
                />
                {photoError ? (
                  <p
                    className="mt-2 font-sans text-xs text-destructive"
                    role="alert"
                  >
                    {photoError}
                  </p>
                ) : null}
              </div>
            </div>

            <form
              className="mt-8 flex max-w-xl flex-col gap-6"
              onSubmit={(event) => void handleSubmit(event)}
              noValidate
            >
              <div className="flex flex-col gap-1.5">
                <Input
                  id="recruiter-display-name"
                  name="displayName"
                  label={tPage("nameLabel")}
                  value={displayName}
                  onChange={(event: { target: { value: string } }) =>
                    handleDisplayNameChange(event.target.value)
                  }
                  placeholder={tPage("namePlaceholder")}
                  required
                  maxLength={RECRUITER_DISPLAY_NAME_MAX}
                  error={nameError}
                  autoComplete="name"
                  aria-label={tPage("nameLabel")}
                />
                <p className="font-sans text-xs text-muted-foreground">
                  {tPage("formHint")}
                </p>
              </div>
              <ProfileReadOnlyField
                id="recruiter-email"
                label={tPage("emailLabel")}
                value={emailValue}
                hint={tPage("emailHint")}
              />
              <ProfileReadOnlyField
                id="recruiter-role"
                label={tPage("roleLabel")}
                value={roleLabel}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSaving}
                  disabled={
                    isSaving ||
                    isPhotoBusy ||
                    !hasNameChange ||
                    isRateLimited
                  }
                  className="h-10 px-4 py-0 sm:w-auto"
                  aria-label={tPage("save")}
                >
                  {isSaving ? tPage("saving") : tPage("save")}
                </Button>
              </div>
            </form>
          </>
        )}
      </section>

      <Snackbar
        open={snackbar.open}
        onClose={handleCloseSnackbar}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </SettingsPageSection>
  )
}
