import { test, expect } from '@playwright/test';

// Helper to set auth cookie for protected routes
async function setAuthCookie(page: any) {
  await page.context().addCookies([
    {
      name: 'access_token',
      value: 'mock-test-token',
      domain: 'localhost',
      path: '/',
    },
  ]);
}

test.describe('Visual Snapshots', () => {
  test('login page visual snapshot', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.1,
    });
  });

  test('signup page visual snapshot', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('signup-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.1,
    });
  });

  test('dashboard page visual snapshot', async ({ page }) => {
    await setAuthCookie(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for any async data to load
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.1,
    });
  });

  test('accounts page visual snapshot', async ({ page }) => {
    await setAuthCookie(page);
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('accounts-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.1,
    });
  });

  test('contacts page visual snapshot', async ({ page }) => {
    await setAuthCookie(page);
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('contacts-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.1,
    });
  });
});

test.describe('Theme Switching', () => {
  test('dashboard light vs dark mode', async ({ page }) => {
    await setAuthCookie(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Light mode screenshot
    await expect(page).toHaveScreenshot('dashboard-light.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.1,
    });

    // Toggle to dark mode
    const themeSwitch = page.getByRole('button', { name: /toggle theme/i });
    if (await themeSwitch.isVisible()) {
      await themeSwitch.click();
      await page.waitForTimeout(300); // Wait for theme transition

      await expect(page).toHaveScreenshot('dashboard-dark.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.1,
      });
    }
  });
});

