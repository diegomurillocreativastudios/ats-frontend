import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIES } from '@/lib/auth';

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || '';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(AUTH_COOKIES.refresh)?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { message: 'No hay refresh token' },
        { status: 401 }
      );
    }

    const baseUrl = getBaseUrl().replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const response = NextResponse.json(
        { message: data.message || data.detail || 'Sesión expirada' },
        { status: res.status }
      );
      response.cookies.set(AUTH_COOKIES.access, '', { path: AUTH_COOKIES.path, maxAge: 0 });
      response.cookies.set(AUTH_COOKIES.expires, '', { path: AUTH_COOKIES.path, maxAge: 0 });
      response.cookies.set(AUTH_COOKIES.refresh, '', { path: AUTH_COOKIES.path, maxAge: 0 });
      return response;
    }

    const accessToken = data.accessToken ?? data.token;
    const newRefreshToken = data.refreshToken ?? refreshToken;
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

    response.cookies.set(AUTH_COOKIES.refresh, newRefreshToken, {
      path: AUTH_COOKIES.path,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      secure: isProd,
      httpOnly: true,
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { message: err.message || 'Error al renovar sesión' },
      { status: 500 }
    );
  }
}
