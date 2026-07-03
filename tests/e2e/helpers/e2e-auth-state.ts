import fs from "node:fs"
import path from "node:path"

interface E2EAuthState {
  apiUrl: string
  isAuthAvailable: boolean
  message: string
}

const AUTH_STATE_FILE = path.join(
  process.cwd(),
  "tests/e2e/.e2e-auth-state.json"
)

const DEFAULT_STATE: E2EAuthState = {
  apiUrl: "",
  isAuthAvailable: true,
  message: "",
}

/**
 * Lee el estado de autenticación calculado en `global-setup`.
 */
export function readE2EAuthState(): E2EAuthState {
  if (!fs.existsSync(AUTH_STATE_FILE)) {
    return DEFAULT_STATE
  }

  try {
    return JSON.parse(fs.readFileSync(AUTH_STATE_FILE, "utf8")) as E2EAuthState
  } catch {
    return DEFAULT_STATE
  }
}
