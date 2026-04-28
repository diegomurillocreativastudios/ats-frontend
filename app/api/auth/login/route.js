import { NextResponse } from 'next/server'
import { buildAuthLoginResponse } from '@/lib/auth-login-response'

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || ''

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    const baseUrl = getBaseUrl().replace(/\/$/, '')
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        data.message ||
        data.detail ||
        (typeof data === 'string' ? data : 'Credenciales inválidas')
      return NextResponse.json(
        { message: Array.isArray(message) ? message[0] : message },
        { status: res.status }
      )
    }

    return buildAuthLoginResponse(data, email)
  } catch (err) {
    return NextResponse.json(
      { message: err.message || 'Error al iniciar sesión' },
      { status: 500 }
    )
  }
}
