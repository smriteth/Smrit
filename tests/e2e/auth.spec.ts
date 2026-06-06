import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page renders SMRIT branding', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=SMRIT')).toBeVisible();
  });

  test('login with valid credentials redirects to overview', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@smrit.et');
    await page.fill('input[type="password"]', 'smrit2026');
    await page.click('button[type="submit"], button:has-text("Sign In")');
    await expect(page).toHaveURL(/overview/);
  });

  test('login with wrong password shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@smrit.et');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"], button:has-text("Sign In")');
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/login/);
  });

  test('unauthenticated access to /overview redirects to login', async ({ page }) => {
    // Clear storage to ensure no token
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/overview');
    await expect(page).toHaveURL(/login/);
  });

  test('token stored in localStorage after login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@smrit.et');
    await page.fill('input[type="password"]', 'smrit2026');
    await page.click('button[type="submit"], button:has-text("Sign In")');
    await page.waitForURL(/overview/);

    const token = await page.evaluate(() => localStorage.getItem('smrit_token'));
    expect(token).toBeTruthy();
    expect(token?.split('.')).toHaveLength(3); // valid JWT format
  });
});
