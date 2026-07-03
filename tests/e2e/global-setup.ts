import fs from "node:fs"
import path from "node:path"

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

const getDemoCredentials = (): { email: string; password: string } => ({
  email: process.env.E2E_DEMO_EMAIL?.trim() || "admin",
  password: process.env.E2E_DEMO_PASSWORD ?? "admin",
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Verifica que el API de E2E responda y que las credenciales demo funcionen.
 * Escribe el resultado en `.e2e-auth-state.json` para que los tests fallen rápido con un mensaje claro.
 */
async function verifyBackendAuth(): Promise<E2EAuthState> {
  const apiUrl = getApiBaseUrl()
  if (!apiUrl) {
    return {
      apiUrl: "",
      isAuthAvailable: false,
      message:
        "NEXT_PUBLIC_API_URL no está configurada. Definila en CI o en .env.local para tests con login.",
    }
  }

  const { email, password } = getDemoCredentials()
  const maxAttempts = process.env.CI ? 6 : 2
  let lastDetail = "sin respuesta del servidor"

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
      lastDetail =
        (typeof payload.detail === "string" && payload.detail) ||
        (typeof payload.message === "string" && payload.message) ||
        `HTTP ${response.status}`

      const isLocked = lastDetail.toLowerCase().includes("bloqueada")
      if (isLocked && attempt < maxAttempts) {
        await sleep(15_000)
        continue
      }

      break
    } catch (error) {
      lastDetail =
        error instanceof Error ? error.message : "Error de red al contactar el API"
      if (attempt < maxAttempts) {
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
      "Configurá los secrets E2E_DEMO_EMAIL y E2E_DEMO_PASSWORD en GitHub, " +
      "o restablecé el usuario admin en el backend de pruebas.",
  }
}

async function globalSetup(): Promise<void> {
  const authState = await verifyBackendAuth()
  fs.writeFileSync(AUTH_STATE_FILE, JSON.stringify(authState, null, 2))

  if (!authState.isAuthAvailable) {
    console.warn(`[e2e] ${authState.message}`)
  }
}

export default globalSetup
