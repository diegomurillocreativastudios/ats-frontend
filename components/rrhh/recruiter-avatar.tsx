import { getInitials } from "@/lib/getInitials"

const SIZE_CLASS = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-[11px]",
  lg: "h-20 w-20 text-xl",
} as const

interface RecruiterAvatarProps {
  name?: string | null
  email?: string | null
  photoSrc?: string | null
  size?: keyof typeof SIZE_CLASS
  alt?: string
  isLoading?: boolean
}

/**
 * Recruiter account avatar: photo when present, otherwise initials.
 */
export function RecruiterAvatar({
  name,
  email,
  photoSrc,
  size = "md",
  alt = "",
  isLoading = false,
}: RecruiterAvatarProps) {
  const sizeClass = SIZE_CLASS[size]

  if (isLoading) {
    return (
      <span
        className={`${sizeClass} shrink-0 animate-pulse rounded-full bg-muted`}
        aria-hidden
      />
    )
  }

  if (photoSrc) {
    return (
      <img
        src={photoSrc}
        alt={alt}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    )
  }

  return (
    <span
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-linear-to-br from-vo-purple to-vo-magenta font-sans font-semibold text-white`}
      aria-hidden
    >
      {getInitials(name, email)}
    </span>
  )
}
