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

test.describe('Settings Module', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthCookie(page);
  });

  test.describe('Settings Navigation', () => {
    test('settings redirects to profile by default', async ({ page }) => {
      await page.goto('/settings');
      await expect(page).toHaveURL(/\/settings\/profile/);
    });

    test('settings sidebar shows all navigation items', async ({ page }) => {
      await page.goto('/settings/profile');

      // All nav items should be visible
      await expect(page.getByRole('link', { name: /profile/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /team/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /integrations/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /notifications/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /appearance/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /api keys/i })).toBeVisible();
    });

    test('settings navigation links work correctly', async ({ page }) => {
      await page.goto('/settings/profile');

      // Click Team link
      await page.getByRole('link', { name: /team/i }).click();
      await expect(page).toHaveURL(/\/settings\/team/);

      // Click Integrations link
      await page.getByRole('link', { name: /integrations/i }).click();
      await expect(page).toHaveURL(/\/settings\/integrations/);

      // Click Notifications link
      await page.getByRole('link', { name: /notifications/i }).click();
      await expect(page).toHaveURL(/\/settings\/notifications/);

      // Click Appearance link
      await page.getByRole('link', { name: /appearance/i }).click();
      await expect(page).toHaveURL(/\/settings\/appearance/);

      // Click API Keys link
      await page.getByRole('link', { name: /api keys/i }).click();
      await expect(page).toHaveURL(/\/settings\/api-keys/);
    });
  });

  test.describe('Profile Settings', () => {
    test('profile page displays correctly', async ({ page }) => {
      await page.goto('/settings/profile');

      // Header should be visible
      await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
      await expect(page.getByText(/manage your personal information/i)).toBeVisible();
    });

    test('profile form fields are present', async ({ page }) => {
      await page.goto('/settings/profile');

      // Profile photo section should be visible
      await expect(page.getByText(/profile photo/i)).toBeVisible();

      // Form fields should be present
      await expect(page.getByLabel(/first name/i)).toBeVisible();
      await expect(page.getByLabel(/last name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/phone/i)).toBeVisible();
      await expect(page.getByLabel(/job title/i)).toBeVisible();
      await expect(page.getByLabel(/timezone/i)).toBeVisible();
    });

    test('email field is disabled', async ({ page }) => {
      await page.goto('/settings/profile');
      const emailInput = page.getByLabel(/email address/i);
      await expect(emailInput).toBeDisabled();
    });

    test('change password section is present', async ({ page }) => {
      await page.goto('/settings/profile');

      // Change password section should be visible
      await expect(page.getByRole('heading', { name: /change password/i })).toBeVisible();
      await expect(page.getByLabel(/current password/i)).toBeVisible();
      await expect(page.getByLabel(/^new password$/i)).toBeVisible();
      await expect(page.getByLabel(/confirm new password/i)).toBeVisible();
    });

    test('save button is present', async ({ page }) => {
      await page.goto('/settings/profile');
      await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
    });
  });

  test.describe('Team Settings', () => {
    test('team page displays correctly', async ({ page }) => {
      await page.goto('/settings/team');

      // Header should be visible
      await expect(page.getByRole('heading', { name: /team/i }).first()).toBeVisible();
      await expect(page.getByText(/manage your team members/i)).toBeVisible();
    });

    test('role permissions legend is visible', async ({ page }) => {
      await page.goto('/settings/team');

      // Role legend should be visible
      await expect(page.getByText(/role permissions/i)).toBeVisible();
      await expect(page.getByText(/admin/i).first()).toBeVisible();
      await expect(page.getByText(/manager/i).first()).toBeVisible();
      await expect(page.getByText(/sales rep/i).first()).toBeVisible();
      await expect(page.getByText(/viewer/i).first()).toBeVisible();
    });
  });

  test.describe('Integrations Settings', () => {
    test('integrations page displays correctly', async ({ page }) => {
      await page.goto('/settings/integrations');

      // Header should be visible
      await expect(page.getByRole('heading', { name: /integrations/i }).first()).toBeVisible();
      await expect(page.getByText(/connect your tools and services/i)).toBeVisible();
    });

    test('integration categories are visible', async ({ page }) => {
      await page.goto('/settings/integrations');

      // Categories should be visible
      await expect(page.getByRole('heading', { name: /email/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /calendar/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /data enrichment/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /ai.*automation/i })).toBeVisible();
    });

    test('integration cards show connect buttons', async ({ page }) => {
      await page.goto('/settings/integrations');

      // Connect buttons should be visible for disconnected integrations
      const connectButtons = page.getByRole('button', { name: /connect/i });
      await expect(connectButtons.first()).toBeVisible();
    });

    test('gmail integration card is present', async ({ page }) => {
      await page.goto('/settings/integrations');
      await expect(page.getByText('Gmail')).toBeVisible();
      await expect(page.getByText(/send and receive emails through your gmail/i)).toBeVisible();
    });

    test('apollo integration card is present', async ({ page }) => {
      await page.goto('/settings/integrations');
      await expect(page.getByText('Apollo.io')).toBeVisible();
      await expect(page.getByText(/enrich leads and find contact/i)).toBeVisible();
    });

    test('openai integration card is present', async ({ page }) => {
      await page.goto('/settings/integrations');
      await expect(page.getByText('OpenAI')).toBeVisible();
      await expect(page.getByText(/power ai-driven features/i)).toBeVisible();
    });
  });

  test.describe('Notifications Settings', () => {
    test('notifications page displays correctly', async ({ page }) => {
      await page.goto('/settings/notifications');

      // Header should be visible
      await expect(page.getByRole('heading', { name: /notifications/i }).first()).toBeVisible();
      await expect(page.getByText(/choose how and when you want to be notified/i)).toBeVisible();
    });

    test('channel legend is visible', async ({ page }) => {
      await page.goto('/settings/notifications');

      // Channel legend should be visible
      await expect(page.getByText(/email/i).first()).toBeVisible();
      await expect(page.getByText(/in-app/i).first()).toBeVisible();
      await expect(page.getByText(/push/i).first()).toBeVisible();
    });

    test('notification categories are present', async ({ page }) => {
      await page.goto('/settings/notifications');

      // Categories should be visible
      await expect(page.getByRole('heading', { name: /leads/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /deals.*opportunities/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /email.*communication/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /meetings.*calendar/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /reports.*summaries/i })).toBeVisible();
    });

    test('notification toggles are present', async ({ page }) => {
      await page.goto('/settings/notifications');

      // Toggle switches should be present
      const toggles = page.getByRole('switch');
      await expect(toggles.first()).toBeVisible();
    });
  });

  test.describe('Appearance Settings', () => {
    test('appearance page displays correctly', async ({ page }) => {
      await page.goto('/settings/appearance');

      // Header should be visible
      await expect(page.getByRole('heading', { name: /appearance/i }).first()).toBeVisible();
      await expect(page.getByText(/customize how bevyly looks/i)).toBeVisible();
    });

    test('theme options are visible', async ({ page }) => {
      await page.goto('/settings/appearance');

      // Theme section should be visible
      await expect(page.getByRole('heading', { name: /theme/i })).toBeVisible();
      await expect(page.getByText(/light/i).first()).toBeVisible();
      await expect(page.getByText(/dark/i).first()).toBeVisible();
      await expect(page.getByText(/system/i).first()).toBeVisible();
    });

    test('density options are visible', async ({ page }) => {
      await page.goto('/settings/appearance');

      // Density section should be visible
      await expect(page.getByRole('heading', { name: /display density/i })).toBeVisible();
      await expect(page.getByText(/comfortable/i)).toBeVisible();
      await expect(page.getByText(/compact/i)).toBeVisible();
    });

    test('format preferences are visible', async ({ page }) => {
      await page.goto('/settings/appearance');

      // Format preferences should be visible
      await expect(page.getByRole('heading', { name: /format preferences/i })).toBeVisible();
      await expect(page.getByLabel(/date format/i)).toBeVisible();
      await expect(page.getByLabel(/number format/i)).toBeVisible();
    });

    test('preview section is visible', async ({ page }) => {
      await page.goto('/settings/appearance');

      // Preview section should be visible
      await expect(page.getByText(/preview/i).first()).toBeVisible();
      await expect(page.getByText(/current theme/i)).toBeVisible();
      await expect(page.getByText(/sample date/i)).toBeVisible();
      await expect(page.getByText(/sample number/i)).toBeVisible();
    });

    test('theme selection works', async ({ page }) => {
      await page.goto('/settings/appearance');

      // Click dark theme button
      const darkButton = page.getByRole('button', { name: /dark/i }).first();
      await darkButton.click();

      // Dark button should be selected (have active styling)
      await expect(darkButton).toHaveClass(/primary/);
    });
  });

  test.describe('API Keys Settings', () => {
    test('api keys page displays correctly', async ({ page }) => {
      await page.goto('/settings/api-keys');

      // Header should be visible
      await expect(page.getByRole('heading', { name: /api keys/i })).toBeVisible();
      await expect(page.getByText(/manage your api keys/i)).toBeVisible();
    });

    test('create api key button is visible', async ({ page }) => {
      await page.goto('/settings/api-keys');
      await expect(page.getByRole('button', { name: /create api key/i })).toBeVisible();
    });

    test('security info card is visible', async ({ page }) => {
      await page.goto('/settings/api-keys');
      await expect(page.getByText(/keep your api keys secure/i)).toBeVisible();
    });

    test('create api key modal opens', async ({ page }) => {
      await page.goto('/settings/api-keys');

      // Click create button
      await page.getByRole('button', { name: /create api key/i }).click();

      // Modal should appear
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Create API Key')).toBeVisible();

      // Form fields should be visible
      await expect(page.getByLabel(/key name/i)).toBeVisible();
      await expect(page.getByLabel(/expiration/i)).toBeVisible();
    });

    test('create api key modal closes on cancel', async ({ page }) => {
      await page.goto('/settings/api-keys');

      // Open modal
      await page.getByRole('button', { name: /create api key/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Click cancel
      await page.getByRole('button', { name: /cancel/i }).click();

      // Modal should close
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });
});
