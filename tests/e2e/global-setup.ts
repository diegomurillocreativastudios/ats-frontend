import fs from "node:fs"
import path from "node:path"
import {
  authProbeFailureHint,
  isRetryableAuthProbeFailure,
} from "./helpers/auth-probe"

const AUTH_STATE_FILE = path.join(
  process.cwd(),
  "tests/e2e/.e2e-auth-state.json"
)

interface E2EAuthState {
  apiUrl: string
  isAuthAvailable: boolean
  message: string
}

const getApiBaseUrl = (): string => {
  const raw =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  return raw.replace(/\/$/, "")
}

const getDemoCredentials = ():
  | { email: string; password: string }
  | { error: string } => {
  const email = process.env.E2E_DEMO_EMAIL?.trim() ?? ""
  const password = process.env.E2E_DEMO_PASSWORD ?? ""
  if (!email || !password) {
    return {
      error:
        "E2E_DEMO_EMAIL y E2E_DEMO_PASSWORD son obligatorias. " +
        "Definilas en CI (secrets) o en el entorno local. Sin defaults admin/admin.",
    }
  }
  return { email, password }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Verifica que el API de E2E responda y que las credenciales demo funcionen.
 * Escribe el resultado en `.e2e-auth-state.json`.
 * En CI: falla cerrado si faltan secretos o el login no responde.
 * En local: marca auth no disponible para que los specs salteen solo tests de sesión.
 */
async function verifyBackendAuth(): Promise<E2EAuthState> {
  const apiUrl = getApiBaseUrl()
  if (!apiUrl) {
    return {
      apiUrl: "",
      isAuthAvailable: false,
      message:
        "NEXT_PUBLIC_API_URL / API_URL no está configurada. Definila en CI (E2E_API_URL) o en .env.local.",
    }
  }

  const credentials = getDemoCredentials()
  if ("error" in credentials) {
    return {
      apiUrl,
      isAuthAvailable: false,
      message: credentials.error,
    }
  }

  const { email, password } = credentials
  const maxAttempts = process.env.CI ? 8 : 2
  let lastDetail = "sin respuesta del servidor"
  let lastStatus: number | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(90_000),
      })

      if (response.ok) {
        return {
          apiUrl,
          isAuthAvailable: true,
          message: "Login demo disponible.",
        }
      }

      const payload = await response.json().catch(() => ({}))
      lastStatus = response.status
      lastDetail =
        (typeof payload.detail === "string" && payload.detail) ||
        (typeof payload.message === "string" && payload.message) ||
        `HTTP ${response.status}`

      if (
        isRetryableAuthProbeFailure({
          httpStatus: response.status,
          detail: lastDetail,
        }) &&
        attempt < maxAttempts
      ) {
        console.warn(
          `[e2e] Intento ${attempt}/${maxAttempts} falló (${lastDetail}). Reintentando...`
        )
        await sleep(15_000)
        continue
      }

      break
    } catch (error) {
      lastStatus = null
      lastDetail =
        error instanceof Error ? error.message : "Error de red al contactar el API"
      if (
        isRetryableAuthProbeFailure({ httpStatus: null, detail: lastDetail }) &&
        attempt < maxAttempts
      ) {
        console.warn(
          `[e2e] Intento ${attempt}/${maxAttempts} falló (${lastDetail}). Reintentando...`
        )
        await sleep(15_000)
      }
    }
  }

  return {
    apiUrl,
    isAuthAvailable: false,
    message:
      `No se pudo autenticar contra ${apiUrl} con el usuario demo (${email}). ` +
      `Detalle: ${lastDetail}. ` +
      authProbeFailureHint(lastStatus),
  }
}

async function globalSetup(): Promise<void> {
  const authState = await verifyBackendAuth()
  fs.writeFileSync(AUTH_STATE_FILE, JSON.stringify(authState, null, 2))

  if (!authState.isAuthAvailable) {
    if (process.env.CI) {
      throw new Error(`[e2e] Fail-closed: ${authState.message}`)
    }
    console.warn(`[e2e] ${authState.message}`)
  }
}

export default globalSetup
