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

test.describe('Briefing Page Enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthCookie(page);
    await page.goto('/briefing');
  });

  test.describe('Pipeline Snapshot', () => {
    test('pipeline snapshot is visible on briefing page', async ({ page }) => {
      // Pipeline Snapshot heading should be visible
      await expect(page.getByRole('heading', { name: /pipeline snapshot/i })).toBeVisible();
    });

    test('pipeline shows View Pipeline link', async ({ page }) => {
      // "View Pipeline" link should navigate to opportunities page
      const viewPipelineLink = page.getByRole('link', { name: /view pipeline/i }).first();
      await expect(viewPipelineLink).toBeVisible();
      await expect(viewPipelineLink).toHaveAttribute('href', '/opportunities');
    });

    test('pipeline stages are keyboard accessible', async ({ page }) => {
      // Find the first stage button (if any exist)
      const stageButtons = page.locator('[role="button"]').filter({ has: page.locator('text=/Prospecting|Qualification|Proposal/i') });

      const firstButton = stageButtons.first();
      const count = await stageButtons.count();

      if (count > 0) {
        // Stage should be focusable
        await firstButton.focus();
        await expect(firstButton).toBeFocused();

        // Stage should have aria-label
        const ariaLabel = await firstButton.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    });

    test('pipeline stages have proper ARIA attributes', async ({ page }) => {
      // Find stage buttons
      const stageButtons = page.locator('[role="button"]').filter({ has: page.locator('text=/Prospecting|Qualification|Proposal/i') });

      const count = await stageButtons.count();

      if (count > 0) {
        const firstButton = stageButtons.first();

        // Should have role="button"
        await expect(firstButton).toHaveAttribute('role', 'button');

        // Should have tabIndex
        const tabIndex = await firstButton.getAttribute('tabIndex');
        expect(tabIndex).toBe('0');
      }
    });

    test('empty state shows when no opportunities', async ({ page }) => {
      // This test assumes mock data might be empty
      // Check if either pipeline stages OR empty state is visible

      const emptyStateText = page.getByText(/no opportunities in your pipeline/i);
      const stageColumns = page.locator('[role="button"]').filter({ has: page.locator('text=/Prospecting|Qualification/i') });

      const hasStages = await stageColumns.count() > 0;
      const hasEmptyState = await emptyStateText.isVisible().catch(() => false);

      // Either stages OR empty state should be present
      expect(hasStages || hasEmptyState).toBe(true);
    });
  });

  test.describe('Briefing Page General', () => {
    test('greeting displays correctly', async ({ page }) => {
      // Check that a time-based greeting is shown
      const greetingText = page.getByText(/good (morning|afternoon|evening)/i);
      await expect(greetingText).toBeVisible();
    });

    test('summary cards show priority counts', async ({ page }) => {
      // High Priority card
      await expect(page.getByText('High Priority')).toBeVisible();

      // Medium Priority card
      await expect(page.getByText('Medium Priority')).toBeVisible();

      // Low Priority card
      await expect(page.getByText('Low Priority')).toBeVisible();
    });

    test('refresh button is functional', async ({ page }) => {
      // Refresh button should be visible
      const refreshButton = page.getByRole('button', { name: /refresh/i });
      await expect(refreshButton).toBeVisible();
      await expect(refreshButton).not.toBeDisabled();
    });

    test('AI Ordering toggle is present', async ({ page }) => {
      // AI Ordering toggle should be visible in Recommended Actions section
      const aiToggle = page.locator('button', { hasText: /AI Ordering|AI/i });

      // Should be visible if there are recommendations
      const recommendedActionsHeader = page.getByText('Recommended Actions');
      if (await recommendedActionsHeader.isVisible()) {
        await expect(aiToggle).toBeVisible();
      }
    });
  });
});
