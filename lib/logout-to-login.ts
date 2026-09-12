import { csrfHeaders } from "@/lib/auth/csrf-client"
import { clearCurrentUserStore } from "@/lib/rrhh/current-user-store"
import { clearRecruiterPhotoCache } from "@/lib/rrhh/recruiter-photo-cache"

/**
 * Ends the session and sends the user to the login screen.
 */
export async function logoutToLogin(router: {
  push: (href: string) => void
}): Promise<void> {
  clearRecruiterPhotoCache()
  clearCurrentUserStore()

  try {
    const headers = await csrfHeaders()
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers,
    })
    router.push(
      `/auth/iniciar-sesion?logout=${response.ok ? "success" : "error"}`,
    )
  } catch {
    router.push("/auth/iniciar-sesion?logout=error")
  }
}
