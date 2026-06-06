import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@smrit.et');
  await page.fill('input[type="password"]', 'smrit2026');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForURL(/overview/);
}

test.describe('Fleet Lifecycle (golden path)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Overview page shows KPI cards with numeric values', async ({ page }) => {
    await page.goto('/overview');
    // Wait for KPI cards to load
    await page.waitForSelector('[data-testid="kpi-active-trucks"], .kpi-card, h3, .text-3xl', {
      timeout: 10_000,
    });

    // Check that numeric KPI values are visible (not NaN, not undefined)
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('NaN');
    expect(pageText).not.toContain('undefined');
  });

  test('Fleet page renders truck table', async ({ page }) => {
    await page.goto('/fleet');
    // Wait for table to appear
    await page.waitForSelector('table, [role="table"]', { timeout: 10_000 });
    const tableText = await page.textContent('body');
    // Either has trucks or shows empty state
    expect(tableText).toBeTruthy();
  });

  test('Drivers page renders driver table', async ({ page }) => {
    await page.goto('/drivers');
    await page.waitForSelector('table, [role="table"]', { timeout: 10_000 });
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('Error');
  });

  test('Trips page renders with filter controls', async ({ page }) => {
    await page.goto('/trips');
    await page.waitForSelector('table, select, [role="combobox"]', { timeout: 10_000 });
  });

  test('Sidebar navigation works for all links', async ({ page }) => {
    const routes = ['/overview', '/map', '/fleet', '/drivers', '/trips', '/maintenance', '/fuel', '/alerts', '/payroll', '/analytics'];

    for (const route of routes) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route.replace('/', '')));
      // Check page doesn't show a crash error
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('Cannot read properties');
      expect(bodyText).not.toContain('TypeError');
    }
  });

  test('Live map renders Leaflet container', async ({ page }) => {
    await page.goto('/map');
    // Leaflet creates a .leaflet-container div
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 10_000 });
  });
});
