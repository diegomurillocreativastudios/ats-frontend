import { expect, type Page } from "@playwright/test"

/**
 * Credenciales de prueba para E2E (validación client-side + API `/login`).
 * Obligatorias vía `E2E_DEMO_EMAIL` y `E2E_DEMO_PASSWORD` (secrets en GitHub Actions).
 * Sin defaults débiles (`admin`/`admin`).
 */
export function getE2EDemoCredentials(): { email: string; password: string } {
  const email = process.env.E2E_DEMO_EMAIL?.trim() ?? ""
  const password = process.env.E2E_DEMO_PASSWORD ?? ""
  if (!email || !password) {
    throw new Error(
      "E2E_DEMO_EMAIL y E2E_DEMO_PASSWORD son obligatorias para login demo. " +
        "Definilas en el entorno o en secrets de GitHub Actions."
    )
  }
  return { email, password }
}

const LOGIN_REDIRECT_TIMEOUT_MS = process.env.CI ? 90_000 : 30_000

/**
 * Completa el formulario de iniciar sesión y envía.
 */
export async function fillLoginForm(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.getByTestId("auth-login-email").fill(email)
  await page.getByTestId("auth-login-password").fill(password)
  await page.getByTestId("auth-login-submit").click()
}

/**
 * Tras login exitoso, la app puede mostrar `/seleccion-portal` o redirigir al portal
 * si el usuario ya tiene rol (ver `proxy.ts`).
 */
export async function loginAsDemoUser(page: Page): Promise<void> {
  const { email, password } = getE2EDemoCredentials()
  await page.goto("/auth/iniciar-sesion")
  await fillLoginForm(page, email, password)

  const redirectPattern =
    /\/(seleccion-portal|portal-rrhh|portal-candidato|portal-admin)/
  /** Error toast only (`role=alert`); success uses `role=status` and must not abort the race. */
  const loginErrorSnackbar = page
    .getByTestId("app-snackbar")
    .and(page.getByRole("alert"))

  await Promise.race([
    page.waitForURL(redirectPattern, { timeout: LOGIN_REDIRECT_TIMEOUT_MS }),
    loginErrorSnackbar
      .waitFor({ state: "visible", timeout: LOGIN_REDIRECT_TIMEOUT_MS })
      .then(async () => {
        const message = (await loginErrorSnackbar.textContent())?.trim()
        throw new Error(
          message
            ? `Login demo falló: ${message}`
            : "Login demo falló: el API rechazó las credenciales configuradas."
        )
      }),
  ])

  await expect(page).toHaveURL(redirectPattern)
}

/**
 * Desde `/seleccion-portal`, entra al portal RRHH. Si el login ya dejó al usuario en RRHH, no hace nada.
 */
export async function openRRHHPortalFromSelector(page: Page): Promise<void> {
  const pathname = new URL(page.url()).pathname
  if (/^\/portal-rrhh(\/|$)/.test(pathname)) return

  await page.getByTestId("portal-selector-rrhh").click()
  await page.waitForURL(/\/portal-rrhh(\/|$)/, { timeout: 15_000 })
}

/**
 * Desde `/seleccion-portal`, entra al portal Admin. Si el login ya dejó al usuario en Admin, no hace nada.
 */
export async function openAdminPortalFromSelector(page: Page): Promise<void> {
  const pathname = new URL(page.url()).pathname
  if (/^\/portal-admin(\/|$)/.test(pathname)) return

  await page.getByTestId("portal-selector-admin").click()
  await page.waitForURL(/\/portal-admin(\/|$)/, { timeout: 15_000 })
}
