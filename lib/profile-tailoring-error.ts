import { extractStructuredApiErrorMessage } from "@/lib/api-error"
import { getUploadApiErrorMessage } from "@/lib/upload-constraints"

export interface ProfileTailoringErrorMessages {
  unprocessable: string
  vacancyUnavailable: string
  fallback: string
}

/**
 * User-facing message for a failed `POST tailor-to-vacancy`.
 * 404 means the vacancy was unpublished or removed while the candidate worked.
 */
export function getProfileTailoringErrorMessage(
  err: unknown,
  messages: ProfileTailoringErrorMessages
): string {
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? (err as { status?: number }).status
      : undefined
  if (status === 404) return messages.vacancyUnavailable
  if (status === 413 || status === 415 || status === 400) {
    return getUploadApiErrorMessage(err)
  }
  const serverMessage = extractStructuredApiErrorMessage(err)
  if (status === 422) return serverMessage || messages.unprocessable
  return serverMessage || messages.fallback
}
