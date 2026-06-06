/**
 * Full dashboard journey e2e test.
 * Covers the golden path a fleet manager takes on first use.
 * Requires: backend running on port 3016, dashboard on port 5173 (npm run dev).
 */
import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@smrit.et';
const ADMIN_PASS = process.env.ADMIN_PASS ?? 'smrit2026';

test.describe('Dashboard golden path', () => {
  test('login → overview → fleet → drivers → trips → analytics → settings', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"], button:has-text("Sign In")');
    await expect(page).toHaveURL(/overview/, { timeout: 10_000 });

    // 2. Overview KPIs render
    await expect(page.locator('h1, [data-testid="overview-title"], text=Overview')).toBeVisible();

    // 3. Navigate to Fleet
    await page.click('a[href*="fleet"], nav >> text=Fleet');
    await expect(page).toHaveURL(/fleet/);
    await expect(page.getByText('Fleet Management')).toBeVisible();

    // 4. Navigate to Drivers
    await page.click('a[href*="drivers"], nav >> text=Drivers');
    await expect(page).toHaveURL(/drivers/);
    await expect(page.getByText('Driver')).toBeVisible();

    // 5. Navigate to Trips
    await page.click('a[href*="trips"], nav >> text=Trips');
    await expect(page).toHaveURL(/trips/);

    // 6. Navigate to Analytics
    await page.click('a[href*="analytics"], nav >> text=Analytics');
    await expect(page).toHaveURL(/analytics/);

    // 7. Settings — must NOT show Traccar branding
    await page.click('a[href*="settings"], nav >> text=Settings');
    await expect(page).toHaveURL(/settings/);
    const settingsText = await page.content();
    expect(settingsText).not.toContain('Traccar OsmAnd');
    expect(settingsText).not.toContain('GPS powered by Traccar');
    expect(settingsText).not.toContain('(hidden backend)');
    // Should show neutral SMRIT branding
    await expect(page.getByText(/GPS tracking powered by SMRIT/i)).toBeVisible();
  });

  test('unauthenticated access to /overview redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/overview');
    await expect(page).toHaveURL(/login/);
  });

  test('wrong password shows error, stays on login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', 'definitely_wrong');
    await page.click('button[type="submit"], button:has-text("Sign In")');
    await expect(page.locator('text=Invalid, text=error')).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/login/);
  });

  test('live map page renders without crashing', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"], button:has-text("Sign In")');
    await page.waitForURL(/overview/);

    await page.click('a[href*="live"], nav >> text=Live Map');
    await expect(page).toHaveURL(/live/);
    // Map container should exist (Leaflet or fallback)
    await expect(page.locator('.leaflet-container, [data-testid="map"]')).toBeVisible({ timeout: 8_000 });
  });

  test('logout clears token', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"], button:has-text("Sign In")');
    await page.waitForURL(/overview/);

    // Confirm token is set
    const tokenBefore = await page.evaluate(() => localStorage.getItem('smrit_token'));
    expect(tokenBefore).toBeTruthy();

    // Find and click logout
    await page.click('button:has-text("Logout"), button:has-text("Sign out"), [data-testid="logout"]');
    await expect(page).toHaveURL(/login/, { timeout: 5_000 });

    const tokenAfter = await page.evaluate(() => localStorage.getItem('smrit_token'));
    expect(tokenAfter).toBeNull();
  });
});
