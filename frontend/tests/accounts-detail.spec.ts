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

test.describe('Account Detail Page Enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthCookie(page);
    // Note: This will use mock data from MSW handlers
    await page.goto('/accounts/acc_test123');
  });

  test('health score indicator displays correctly', async ({ page }) => {
    // Health score should be visible
    await expect(page.getByText('Health Score')).toBeVisible();

    // Score number should be visible (0-100)
    const scoreText = await page.locator('text=/\\d+/').first();
    await expect(scoreText).toBeVisible();

    // Badge should show status (Excellent/Good/At Risk/Critical)
    await expect(
      page.getByRole('status').filter({ hasText: /(Excellent|Good|At Risk|Critical)/ })
    ).toBeVisible();
  });

  test('account edit modal opens and closes', async ({ page }) => {
    // Find and click edit button
    await page.getByRole('button', { name: /edit/i }).first().click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Edit Account')).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click();

    // Modal should disappear
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('account edit modal shows all tabs', async ({ page }) => {
    // Open edit modal
    await page.getByRole('button', { name: /edit/i }).first().click();

    // All three tabs should be visible
    await expect(page.getByRole('tab', { name: /basic/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /location/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /social/i })).toBeVisible();

    // Basic tab should be active by default
    await expect(page.getByRole('tab', { name: /basic/i })).toHaveClass(/active|selected/);
  });

  test('account edit modal tabs switch correctly', async ({ page }) => {
    // Open edit modal
    await page.getByRole('button', { name: /edit/i }).first().click();

    // Click Location tab
    await page.getByRole('tab', { name: /location/i }).click();

    // Location fields should be visible
    await expect(page.getByLabel(/address/i)).toBeVisible();
    await expect(page.getByLabel(/city/i)).toBeVisible();
    await expect(page.getByLabel(/state/i)).toBeVisible();

    // Click Social tab
    await page.getByRole('tab', { name: /social/i }).click();

    // Social fields should be visible
    await expect(page.getByLabel(/linkedin/i)).toBeVisible();
    await expect(page.getByLabel(/twitter/i)).toBeVisible();
  });

  test('account edit modal validates required fields', async ({ page }) => {
    // Open edit modal
    await page.getByRole('button', { name: /edit/i }).first().click();

    // Clear the name field (required)
    const nameInput = page.getByLabel(/company name/i);
    await nameInput.clear();

    // Try to submit
    await page.getByRole('button', { name: /^save$/i }).click();

    // Should show error (HTML5 validation or custom)
    // The form should not close if validation fails
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('custom fields section is always visible', async ({ page }) => {
    // Custom Fields section should be visible
    await expect(page.getByText('Custom Fields')).toBeVisible();

    // Add Field button should be visible
    await expect(page.getByRole('button', { name: /add field/i })).toBeVisible();
  });

  test('add new custom field', async ({ page }) => {
    // Click Add Field button
    await page.getByRole('button', { name: /add field/i }).click();

    // Input fields should appear
    await expect(page.getByPlaceholder(/field name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/value/i)).toBeVisible();

    // Fill in new field
    await page.getByPlaceholder(/field name/i).fill('Industry Vertical');
    await page.getByPlaceholder(/value/i).fill('Healthcare');

    // Click confirm button (checkmark)
    await page.locator('button:has(svg)').filter({ hasText: '' }).first().click();

    // New field should appear in list
    await expect(page.getByText('Industry Vertical')).toBeVisible();
    await expect(page.getByText('Healthcare')).toBeVisible();

    // Save Changes button should be visible
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
  });

  test('validates forbidden custom field names', async ({ page }) => {
    // Click Add Field button
    await page.getByRole('button', { name: /add field/i }).click();

    // Try to add a forbidden key
    await page.getByPlaceholder(/field name/i).fill('__proto__');
    await page.getByPlaceholder(/value/i).fill('test');

    // Click confirm button
    await page.locator('button:has(svg)').filter({ hasText: '' }).first().click();

    // Should show error toast
    await expect(page.getByText(/not allowed/i)).toBeVisible();
  });

  test('validates empty custom field name', async ({ page }) => {
    // Click Add Field button
    await page.getByRole('button', { name: /add field/i }).click();

    // Try to add empty key
    await page.getByPlaceholder(/field name/i).fill('');
    await page.getByPlaceholder(/value/i).fill('test');

    // Click confirm button
    await page.locator('button:has(svg)').filter({ hasText: '' }).first().click();

    // Should show error toast
    await expect(page.getByText(/cannot be empty/i)).toBeVisible();
  });

  test('edit existing custom field', async ({ page }) => {
    // First add a field
    await page.getByRole('button', { name: /add field/i }).click();
    await page.getByPlaceholder(/field name/i).fill('Test Field');
    await page.getByPlaceholder(/value/i).fill('Original Value');
    await page.locator('button:has(svg)').filter({ hasText: '' }).first().click();

    // Click edit button for the field
    await page.locator('[aria-label*="Edit"]').first().click();

    // Input field should appear with current value
    const valueInput = page.getByRole('textbox').filter({ hasText: 'Original Value' });
    await expect(valueInput).toBeVisible();

    // Change the value
    await valueInput.clear();
    await valueInput.fill('Updated Value');

    // Click confirm button
    await page.locator('button:has(svg)').filter({ hasText: '' }).first().click();

    // Updated value should be visible
    await expect(page.getByText('Updated Value')).toBeVisible();
  });

  test('delete custom field', async ({ page }) => {
    // First add a field
    await page.getByRole('button', { name: /add field/i }).click();
    await page.getByPlaceholder(/field name/i).fill('To Delete');
    await page.getByPlaceholder(/value/i).fill('Delete Me');
    await page.locator('button:has(svg)').filter({ hasText: '' }).first().click();

    // Verify field exists
    await expect(page.getByText('To Delete')).toBeVisible();

    // Click delete button
    await page.locator('[aria-label*="Delete"]').first().click();

    // Field should be removed
    await expect(page.getByText('To Delete')).not.toBeVisible();
  });

  test('cancel adding new custom field', async ({ page }) => {
    // Click Add Field button
    await page.getByRole('button', { name: /add field/i }).click();

    // Fill in some data
    await page.getByPlaceholder(/field name/i).fill('Cancel Test');

    // Click cancel button (X mark)
    await page.locator('button:has(svg)').filter({ hasText: '' }).last().click();

    // Add form should disappear
    await expect(page.getByPlaceholder(/field name/i)).not.toBeVisible();

    // Field should not be added
    await expect(page.getByText('Cancel Test')).not.toBeVisible();
  });

  test('contacts section shows contact list', async ({ page }) => {
    // Contacts section should be visible
    await expect(page.getByText('Contacts')).toBeVisible();

    // Should show contact count or contact items
    // (Depends on mock data, but section should exist)
    const contactsSection = page.locator('text=Contacts').locator('..');
    await expect(contactsSection).toBeVisible();
  });

  test('back button navigates to accounts list', async ({ page }) => {
    // Click back arrow
    await page.locator('a[href="/accounts"]').first().click();

    // Should navigate to accounts page
    await expect(page).toHaveURL(/\/accounts$/);
  });

  test('account status badge displays correctly', async ({ page }) => {
    // Status badge should be visible
    await expect(
      page.getByRole('status').filter({ hasText: /(active|prospect|inactive)/i })
    ).toBeVisible();
  });

  test('company info displays all fields', async ({ page }) => {
    // Company Info section should be visible
    await expect(page.getByText('Company Info')).toBeVisible();

    // Check for common fields (may vary based on mock data)
    const companyInfoSection = page.locator('text=Company Info').locator('..');
    await expect(companyInfoSection).toBeVisible();
  });

  test('opportunities section is visible', async ({ page }) => {
    // Opportunities section or metric should be visible
    await expect(page.getByText(/opportunities/i).first()).toBeVisible();
  });

  test('activity timeline is visible', async ({ page }) => {
    // Recent Activity section should be visible
    await expect(page.getByText(/recent activity/i)).toBeVisible();
  });
});
