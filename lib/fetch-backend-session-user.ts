/**
 * Obtiene id, nombre y rol del usuario autenticado en el API
 * (.NET Identity no envía `user` en el JSON de POST /login).
 */

export interface BackendSessionUserPayload {
  id: string | null
  name: string
  email: string
  role: string | null
}

export type BackendSessionLookupResult =
  | { status: "ok"; user: BackendSessionUserPayload }
  | { status: "unauthenticated" }
  | { status: "unavailable" }

function parseSessionUser(
  u: Record<string, unknown>
): BackendSessionUserPayload | null {
  if (u.id == null && !u.email && !u.name && !u.userName) return null

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
}

/**
 * Consulta `/api/auth/session` y discrimina sesión válida, no autorizado y backend caído.
 */
export async function fetchBackendSessionUser(
  baseUrl: string,
  accessToken: string
): Promise<BackendSessionLookupResult> {
  const clean = baseUrl.replace(/\/$/, "")
  if (!clean || !accessToken) return { status: "unavailable" }

  try {
    const res = await fetch(`${clean}/api/auth/session`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (res.status === 401 || res.status === 403) {
      return { status: "unauthenticated" }
    }

    if (!res.ok) return { status: "unavailable" }

    const body = (await res.json().catch(() => null)) as
      | Record<string, unknown>
      | null
    if (!body || typeof body !== "object") return { status: "unavailable" }

    const raw =
      body.user && typeof body.user === "object"
        ? (body.user as Record<string, unknown>)
        : body
    const user = parseSessionUser(raw)
    if (!user) return { status: "unavailable" }

    return { status: "ok", user }
  } catch {
    return { status: "unavailable" }
  }
}
