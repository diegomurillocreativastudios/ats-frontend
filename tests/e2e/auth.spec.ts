import { test, expect } from "@playwright/test"
import { fillLoginForm, loginAsDemoUser } from "./helpers/auth"
import { readE2EAuthState } from "./helpers/e2e-auth-state"

const e2eAuth = readE2EAuthState()

test.describe("@smoke Auth", () => {
  test("muestra el formulario de iniciar sesión", async ({ page }) => {
    await page.goto("/auth/iniciar-sesion")
    await expect(
      page.getByRole("heading", { name: /iniciar sesión/i })
    ).toBeVisible()
    await expect(page.getByTestId("auth-login-form")).toBeVisible()
    await expect(page.getByTestId("auth-login-email")).toBeVisible()
    await expect(page.getByTestId("auth-login-password")).toBeVisible()
    await expect(page.getByTestId("auth-login-submit")).toBeVisible()
  })

  test("credenciales inválidas muestran un mensaje de error y no redirigen", async ({
    page,
  }) => {
    await page.goto("/auth/iniciar-sesion")
    await fillLoginForm(page, "no-existe@test.invalid", "WrongPass123!")
    const snackbar = page.getByTestId("app-snackbar")
    await expect(snackbar).toBeVisible()
    await expect(snackbar).toContainText(
      /correo o contraseña|incorrect|credencial|inválid|invalid/i,
    )
    await expect(page).toHaveURL(/\/auth\/iniciar-sesion/)
  })

  test("ruta /auth/restablecer-contrasena sin token muestra aviso (enlace del mail)", async ({
    page,
  }) => {
    await page.goto("/auth/restablecer-contrasena")
    await expect(page.getByTestId("auth-reset-invalid-link")).toBeVisible()
  })

  test("restablecer solo con ?email= no abre el formulario (token-only)", async ({
    page,
  }) => {
    await page.goto(
      "/auth/restablecer-contrasena?email=usuario@ejemplo.com",
    )
    await expect(page.getByTestId("auth-reset-invalid-link")).toBeVisible()
    await expect(page.getByTestId("auth-reset-form")).toHaveCount(0)
  })

  test("ruta vieja /restablecer-contrasena redirige a /auth y conserva la query", async ({
    page,
  }) => {
    await page.goto("/restablecer-contrasena?token=demo-token")
    await expect(page).toHaveURL(
      /\/auth\/restablecer-contrasena\?token=demo-token/,
    )
    await expect(page.getByTestId("auth-reset-form")).toBeVisible()
  })

  test("muestra el formulario de olvidaste tu contraseña", async ({ page }) => {
    await page.goto("/auth/olvidaste-tu-contrasena")
    await expect(page.getByTestId("auth-forgot-form")).toBeVisible()
    await expect(page.getByTestId("auth-forgot-email")).toBeVisible()
    await expect(page.getByTestId("auth-forgot-submit")).toBeVisible()
  })

  test("ruta vieja /auth/forgot-password redirige a /auth/olvidaste-tu-contrasena", async ({
    page,
  }) => {
    await page.goto("/auth/forgot-password")
    await expect(page).toHaveURL(/\/auth\/olvidaste-tu-contrasena/)
    await expect(page.getByTestId("auth-forgot-form")).toBeVisible()
  })

  test("login demo completa sesión (selector o portal según rol)", async ({
    page,
  }) => {
    if (process.env.CI) {
      expect(
        e2eAuth.isAuthAvailable,
        e2eAuth.message || "Auth E2E no disponible en CI (fail-closed)"
      ).toBe(true)
    } else {
      test.skip(!e2eAuth.isAuthAvailable, e2eAuth.message)
    }
    await loginAsDemoUser(page)
    const pathname = new URL(page.url()).pathname
    if (pathname.startsWith("/seleccion-portal")) {
      await expect(page.getByTestId("portal-selector-candidato")).toBeVisible()
      await expect(page.getByTestId("portal-selector-rrhh")).toBeVisible()
      return
    }
    await expect(page).toHaveURL(/\/portal-(rrhh|candidato|admin)/)
  })
})
