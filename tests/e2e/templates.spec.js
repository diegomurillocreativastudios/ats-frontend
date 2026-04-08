import { test, expect } from '@playwright/test';

test.describe('Template Management E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Login once before each test
        await page.goto('/auth/iniciar-sesion');
        await page.fill('input[name="email"]', 'admin');
        await page.fill('input[name="password"]', 'admin');
        await page.click('button[type="submit"]');

        // Wait for redirect and ensure we are in the portal
        await page.waitForURL(/.*portal-rrhh/, { timeout: 15000 });
    });

    test('should allow a user to create and delete a Notification template', async ({ page }) => {
        // 1. Navigate to Templates
        await page.goto('/portal-rrhh/plantillas');
        await expect(page.getByRole('heading', { name: 'Plantillas' }).first()).toBeVisible();

        // 2. Create a New Template
        const templateName = `E2E Test Template ${Date.now()}`;
        await page.getByRole('button', { name: /Nueva Plantilla/i }).first().click();

        await page.locator('#plantilla-name').fill(templateName);
        await page.locator('#plantilla-subject').fill('E2E Subject');
        await page.locator('#plantilla-body').fill('E2E Body Content');

        await page.getByRole('button', { name: /Crear plantilla/i }).click();

        // 3. Verify Creation
        await expect(page.locator(`text=${templateName}`).first()).toBeVisible({ timeout: 10000 });

        // 4. Delete the Template
        const card = page.locator('article', { hasText: templateName }).first();
        await card.locator('button:has-text("Eliminar")').click();

        // Confirm delete in modal
        await page.click('button:has-text("Aceptar")');

        // 5. Verify Deletion
        await expect(page.locator(`text=${templateName}`).first()).not.toBeVisible();
    });

    test('should allow a user to create and delete a Document template', async ({ page }) => {
        // 1. Navigate to Templates
        await page.goto('/portal-rrhh/plantillas');
        await expect(page.getByRole('heading', { name: 'Plantillas' }).first()).toBeVisible();

        // 2. Create a Document Template (Testing the Dropdown)
        const docName = `E2E Doc ${Date.now()}`;
        await page.getByRole('button', { name: /Nueva Plantilla/i }).first().click();

        // Select 'Documento' from dropdown
        await page.locator('#plantilla-type').selectOption('Document');

        await page.locator('#plantilla-name').fill(docName);
        await page.locator('#plantilla-content-template').fill('<h1>Test Document</h1>');
        await page.locator('#plantilla-output-format').selectOption('PDF');

        await page.getByRole('button', { name: /Crear plantilla/i }).click();

        // 3. Verify & Cleanup
        await expect(page.locator(`text=${docName}`).first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Documento').first()).toBeVisible(); // Check badge

        const card = page.locator('article', { hasText: docName }).first();
        await card.locator('button:has-text("Eliminar")').click();
        await page.click('button:has-text("Aceptar")');
        await expect(page.locator(`text=${docName}`).first()).not.toBeVisible();
    });
});
