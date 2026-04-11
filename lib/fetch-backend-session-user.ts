/**
 * Obtiene id, nombre y rol del usuario autenticado en el API (.NET Identity no envía `user` en el JSON de POST /login).
 */
export interface BackendSessionUserPayload {
  id: string | null
  name: string
  email: string
  role: string | null
}

export async function fetchBackendSessionUser(
  baseUrl: string,
  accessToken: string
): Promise<BackendSessionUserPayload | null> {
  const clean = baseUrl.replace(/\/$/, "")
  try {
    const res = await fetch(`${clean}/api/auth/session`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })
    if (!res.ok) return null
    const u = (await res.json().catch(() => null)) as Record<string, unknown> | null
    if (!u || typeof u !== "object") return null
    const id = u.id != null ? String(u.id) : null
    const email = u.email != null ? String(u.email) : ""
    const nameRaw =
      u.name ?? u.userName ?? (email ? email.split("@")[0] : "") ?? ""
    const name = String(nameRaw).trim() || email || "Usuario"
    const role =
      u.role != null && u.role !== ""
        ? String(u.role)
        : Array.isArray(u.roles) && u.roles.length > 0
          ? String(u.roles[0])
          : null
    return { id, name, email, role }
  } catch {
    return null
  }
}
