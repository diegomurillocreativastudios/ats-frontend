import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api-error"

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || ""

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl().replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        data.message ||
        data.detail ||
        (typeof data === 'string' ? data : 'Credenciales inválidas');
      return NextResponse.json(
        { message: Array.isArray(message) ? message[0] : message },
        { status: res.status }
      );
    }

    const accessToken = data.accessToken ?? data.token;
    const refreshToken = data.refreshToken;
    const expiresIn = Number(data.expiresIn) || 3600;

    if (!accessToken) {
      return NextResponse.json(
        { message: 'La respuesta del servidor no incluye token' },
        { status: 502 }
      );
    }

    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    const isProd = process.env.NODE_ENV === 'production';

    const response = NextResponse.json({ success: true });

    response.cookies.set(AUTH_COOKIES.access, accessToken, {
      path: AUTH_COOKIES.path,
      maxAge: expiresIn,
      sameSite: 'lax',
      secure: isProd,
      httpOnly: false,
    });

    response.cookies.set(AUTH_COOKIES.expires, String(expiresAt), {
      path: AUTH_COOKIES.path,
      maxAge: expiresIn,
      sameSite: 'lax',
      secure: isProd,
      httpOnly: false,
    });

    if (refreshToken) {
      response.cookies.set(AUTH_COOKIES.refresh, refreshToken, {
        path: AUTH_COOKIES.path,
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
        secure: isProd,
        httpOnly: true,
      });
    }

    let userPayload;
    if (data.user && typeof data.user === 'object') {
      const u = data.user;
      const fullName = u.name ?? u.fullName ?? [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
      userPayload = {
        id: u.id,
        name: fullName || u.email || '',
        email: u.email ?? '',
        role: u.role ?? u.type ?? null,
      };
    } else {
      userPayload = {
        id: null,
        name: '',
        email: String(email || '').trim(),
        role: null,
      };
    }
    response.cookies.set(AUTH_COOKIES.user, JSON.stringify(userPayload), {
      path: AUTH_COOKIES.path,
      maxAge: expiresIn,
      sameSite: 'lax',
      secure: isProd,
      httpOnly: false,
    });

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { message: getApiErrorMessage(err) || "Error al iniciar sesión" },
      { status: 500 }
    )
  }
}
