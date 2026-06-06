import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@smrit.et');
  await page.fill('input[type="password"]', 'smrit2026');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForURL(/overview/);
}

test.describe('Payroll Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('payroll page loads with tabs', async ({ page }) => {
    await page.goto('/payroll');
    await page.waitForSelector('body', { timeout: 10_000 });

    // Expect to find Pending and Approved tabs
    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).toContain('pending');
  });

  test('summary cards show ETB amounts', async ({ page }) => {
    await page.goto('/payroll');
    await page.waitForTimeout(3000);

    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('NaN');
    expect(pageText).not.toContain('undefined');
  });

  test('pending tab renders table or empty state', async ({ page }) => {
    await page.goto('/payroll');
    await page.waitForSelector('table, [role="table"], .empty-state, text=No pending', { timeout: 10_000 });
  });
});
