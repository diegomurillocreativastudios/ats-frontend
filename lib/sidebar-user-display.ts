import { isAdminRole, isRecruiterRole } from "@/lib/roles"

export type SidebarRoleLabelKey = "roleAdmin" | "roleRecruiter" | "roleCandidate"

/**
 * Capitalizes a single lowercase token (e.g. "admin" → "Admin").
 * Leaves real names and emails unchanged.
 */
export function formatSidebarDisplayName(
  name: string | null | undefined,
  email: string | null | undefined,
): string | null {
  const trimmedName = (name ?? "").trim()
  if (trimmedName) {
    const isSingleLowerToken =
      !trimmedName.includes(" ") &&
      !trimmedName.includes("@") &&
      trimmedName === trimmedName.toLowerCase()
    if (isSingleLowerToken) {
      return trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1)
    }
    return trimmedName
  }

  const trimmedEmail = (email ?? "").trim()
  return trimmedEmail || null
}

/**
 * Maps a session role to a Sidebar i18n key, or null when unknown.
 */
export function resolveSidebarRoleLabelKey(
  role: string | null | undefined,
): SidebarRoleLabelKey | null {
  if (isAdminRole(role)) return "roleAdmin"
  if (isRecruiterRole(role)) return "roleRecruiter"

  const normalized = String(role ?? "").trim().toLowerCase()
  if (normalized === "candidate" || normalized === "candidato") {
    return "roleCandidate"
  }

  return null
}
