import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api-error"

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || '';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value;
    if (!accessToken) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const baseUrl = getBaseUrl().replace(/\/$/, '');
    const endpoints = [
      '/api/auth/session',
      '/me',
      '/user/me',
      '/users/me',
      '/auth/me',
    ];
    let lastError: unknown = null

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const user = data.user ?? data;
          if (user && (user.id != null || user.email || user.name)) {
            const rolesArr = Array.isArray(user.roles) ? user.roles : [];
            const payload = {
              id: user.id != null ? String(user.id) : null,
              name:
                user.name ??
                user.userName ??
                user.fullName ??
                (user.email ? String(user.email).split("@")[0] : "") ??
                "",
              email: user.email ?? "",
              role:
                user.role ??
                user.type ??
                (rolesArr.length > 0 ? rolesArr[0] : null) ??
                null,
            };
            return NextResponse.json(payload);
          }
        }
      } catch (err) {
        lastError = err;
      }
    }

    const userCookie = cookieStore.get(AUTH_COOKIES.user)?.value;
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie);
        return NextResponse.json(user);
      } catch {
        // ignore
      }
    }

    return NextResponse.json(
      {
        message:
          getApiErrorMessage(lastError) || "No se pudo obtener el usuario",
      },
      { status: 404 }
    )
  } catch (err: unknown) {
    return NextResponse.json(
      { message: getApiErrorMessage(err) || "Error al obtener usuario" },
      { status: 500 }
    )
  }
}
