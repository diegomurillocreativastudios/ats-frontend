import { NextResponse } from 'next/server'
import { buildAuthLoginResponse } from '@/lib/auth-login-response'

/**
 * Sets session cookies from a backend login JSON body (after client called the API directly).
 */
export async function POST(request) {
  try {
    const data = await request.json()
    const accessToken = data.accessToken ?? data.token

    if (!accessToken) {
      return NextResponse.json(
        { message: 'Body inválido: falta accessToken' },
        { status: 400 }
      )
    }

    const email = data.email != null ? String(data.email).trim() : ''
    return buildAuthLoginResponse(data, email)
  } catch (err) {
    return NextResponse.json(
      { message: err.message || 'Error al guardar la sesión' },
      { status: 500 }
    )
  }
}
