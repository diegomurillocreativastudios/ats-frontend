import { test, expect } from "@playwright/test"

import {
  loginAsDemoUser,
  openPruebasPortalFromSelector,
} from "./helpers/auth"
import { readE2EAuthState } from "./helpers/e2e-auth-state"

const e2eAuth = readE2EAuthState()

test.describe("Portal Pruebas demo E2E (UI-15)", () => {
  test.beforeEach(async ({ page }) => {
    if (process.env.CI) {
      expect(
        e2eAuth.isAuthAvailable,
        e2eAuth.message || "Auth E2E no disponible en CI (fail-closed)",
      ).toBe(true)
    } else {
      test.skip(!e2eAuth.isAuthAvailable, e2eAuth.message)
    }
    await loginAsDemoUser(page)
    // Prefer direct entry; gallery selector is covered separately when needed.
    await page.goto("/portal-pruebas")
    if (!/\/portal-pruebas(\/|$)/.test(new URL(page.url()).pathname)) {
      await openPruebasPortalFromSelector(page)
    }
  })

  test("recorre dashboard, asignaciones con retorno y resolución demo", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", {
        name: /dashboard de pruebas|assessments dashboard/i,
      }),
    ).toBeVisible()

    await page.goto(
      "/portal-pruebas/asignaciones?returnTo=%2Fportal-rrhh%2Fvacantes",
    )
    await expect(
      page.getByRole("heading", { name: /asignaciones|assignments/i }),
    ).toBeVisible()
    const backLink = page.getByTestId("assignments-back-to-rrhh")
    await expect(backLink).toBeVisible()
    await expect(backLink).toHaveAttribute("href", "/portal-rrhh/vacantes")

    await page.goto("/pruebas/asg-maria-dup")
    await expect(page.getByTestId("candidate-welcome")).toBeVisible()
    await expect(
      page.getByRole("heading", {
        name: /razonamiento lógico|logical reasoning/i,
      }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /comenzar|start/i }),
    ).toBeVisible()

    await page.goto("/pruebas/asg-carlos-expired")
    await expect(
      page.getByRole("heading", {
        name: /asignación vencida|assignment expired|expired/i,
      }),
    ).toBeVisible()
  })

  test("no desborda horizontalmente en viewport móvil", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/portal-pruebas")
    await expect(
      page.getByRole("heading", {
        name: /dashboard de pruebas|assessments dashboard/i,
      }),
    ).toBeVisible()

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement
      return doc.scrollWidth > doc.clientWidth + 1
    })
    expect(overflow).toBe(false)

    await page.getByRole("button", { name: /abrir menú|open menu/i }).click()
    await expect(
      page.getByRole("dialog", { name: /menú de navegación|navigation menu/i }),
    ).toBeVisible()
  })
})
