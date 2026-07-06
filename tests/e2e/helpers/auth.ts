import { expect, type Page } from "@playwright/test"

/**
 * Credenciales demo para E2E (validación client-side + API `/login`).
 * Configurables con `E2E_DEMO_EMAIL` y `E2E_DEMO_PASSWORD` (p. ej. secrets de GitHub Actions).
 */
export const E2E_DEMO_EMAIL = process.env.E2E_DEMO_EMAIL?.trim() || "admin"
export const E2E_DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "admin"

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
  await page.goto("/auth/iniciar-sesion")
  await fillLoginForm(page, E2E_DEMO_EMAIL, E2E_DEMO_PASSWORD)

  const redirectPattern =
    /\/(seleccion-portal|portal-rrhh|portal-candidato|portal-admin)/
  const loginError = page.getByText(
    /credenciales|contraseña|bloqueada|error al iniciar|connection/i
  )

  await Promise.race([
    page.waitForURL(redirectPattern, { timeout: LOGIN_REDIRECT_TIMEOUT_MS }),
    loginError
      .waitFor({ state: "visible", timeout: LOGIN_REDIRECT_TIMEOUT_MS })
      .then(async () => {
        const message = (await loginError.first().textContent())?.trim()
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
