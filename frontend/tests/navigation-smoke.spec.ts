import { test, expect } from '@playwright/test';

// Helper to set auth cookie for protected routes
async function setAuthCookie(page: any) {
  // Set a mock access_token cookie to bypass auth
  await page.context().addCookies([
    {
      name: 'access_token',
      value: 'mock-test-token',
      domain: 'localhost',
      path: '/',
    },
  ]);
}

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthCookie(page);
  });

  test('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for dashboard elements
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/total revenue/i)).toBeVisible();
  });

  test('sidebar navigation works', async ({ page }) => {
    await page.goto('/dashboard');

    // Check sidebar has navigation items
    await expect(page.getByRole('link', { name: /accounts/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /contacts/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /opportunities/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /emails/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /calendar/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sequences/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /activities/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
  });
});

test.describe('CRM Pages', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthCookie(page);
  });

  test('accounts page loads', async ({ page }) => {
    await page.goto('/accounts');

    await expect(page.getByRole('heading', { name: /accounts/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add account/i })).toBeVisible();
  });

  test('contacts page loads', async ({ page }) => {
    await page.goto('/contacts');

    await expect(page.getByRole('heading', { name: /contacts/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add contact/i })).toBeVisible();
  });

  test('opportunities page loads', async ({ page }) => {
    await page.goto('/opportunities');

    await expect(page.getByRole('heading', { name: /opportunities/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add opportunity/i })).toBeVisible();
  });
});

test.describe('Engagement Pages', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthCookie(page);
  });

  test('emails page loads', async ({ page }) => {
    await page.goto('/emails');

    await expect(page.getByRole('heading', { name: /emails/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /compose/i })).toBeVisible();
  });

  test('calendar/meetings page loads', async ({ page }) => {
    await page.goto('/calendar/meetings');

    await expect(page.getByRole('heading', { name: /meetings/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /propose meeting/i })).toBeVisible();
  });

  test('sequences page loads', async ({ page }) => {
    await page.goto('/sequences');

    await expect(page.getByRole('heading', { name: /sequences/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /new sequence/i })).toBeVisible();
  });
});

test.describe('Activity & Settings Pages', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthCookie(page);
  });

  test('activities page loads', async ({ page }) => {
    await page.goto('/activities');

    await expect(page.getByRole('heading', { name: /activities/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add note/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /log call/i })).toBeVisible();
  });

  test('settings/api-keys page loads', async ({ page }) => {
    await page.goto('/settings/api-keys');

    await expect(page.getByRole('heading', { name: /api keys/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create api key/i })).toBeVisible();
  });
});

