import { NextResponse } from 'next/server'
import { AUTH_COOKIES } from '@/lib/auth'

/**
 * Builds a JSON success response and sets auth cookies from a backend login payload.
 * @param {Record<string, unknown>} data - Backend JSON (accessToken, refreshToken, expiresIn, user, etc.)
 * @param {string} [emailHint] - Email for user cookie when backend omits user
 * @returns {NextResponse}
 */
export function buildAuthLoginResponse(data, emailHint) {
  const accessToken = data.accessToken ?? data.token
  const refreshToken = data.refreshToken
  const expiresIn = Number(data.expiresIn) || 3600

  if (!accessToken) {
    return NextResponse.json(
      { message: 'La respuesta del servidor no incluye token' },
      { status: 502 }
    )
  }

  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn
  const isProd = process.env.NODE_ENV === 'production'
  const email = String(emailHint ?? data.email ?? '').trim()

  const response = NextResponse.json({ success: true })

  response.cookies.set(AUTH_COOKIES.access, accessToken, {
    path: AUTH_COOKIES.path,
    maxAge: expiresIn,
    sameSite: 'lax',
    secure: isProd,
    httpOnly: false
  })

  response.cookies.set(AUTH_COOKIES.expires, String(expiresAt), {
    path: AUTH_COOKIES.path,
    maxAge: expiresIn,
    sameSite: 'lax',
    secure: isProd,
    httpOnly: false
  })

  if (refreshToken) {
    response.cookies.set(AUTH_COOKIES.refresh, refreshToken, {
      path: AUTH_COOKIES.path,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      secure: isProd,
      httpOnly: true
    })
  }

  let userPayload
  if (data.user && typeof data.user === 'object') {
    const u = data.user
    const fullName =
      u.name ?? u.fullName ?? [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
    userPayload = {
      id: u.id,
      name: fullName || u.email || '',
      email: u.email ?? '',
      role: u.role ?? u.type ?? null
    }
  } else {
    userPayload = {
      id: null,
      name: '',
      email: email,
      role: null
    }
  }

  response.cookies.set(AUTH_COOKIES.user, JSON.stringify(userPayload), {
    path: AUTH_COOKIES.path,
    maxAge: expiresIn,
    sameSite: 'lax',
    secure: isProd,
    httpOnly: false
  })

  return response
}
