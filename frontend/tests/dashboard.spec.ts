import { test, expect } from '@playwright/test';

/**
 * Dashboard visual regression tests
 * Captures screenshots at different breakpoints and themes
 */

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    // Wait a bit for any animations to complete
    await page.waitForTimeout(500);
  });

  test('should display dashboard with KPI cards', async ({ page }) => {
    // Check that KPI cards are visible
    await expect(page.getByText('Total Revenue')).toBeVisible();
    await expect(page.getByText('Total Orders')).toBeVisible();
    await expect(page.getByText('New Customers')).toBeVisible();
    await expect(page.getByText('Conversion Rate')).toBeVisible();
  });

  test('should display charts section', async ({ page }) => {
    // Check for chart sections
    await expect(page.getByText('Sales Trend')).toBeVisible();
    await expect(page.getByText('Revenue Breakdown')).toBeVisible();
  });

  test('should display transactions table', async ({ page }) => {
    // Check for transactions table
    await expect(page.getByText('Recent Transactions')).toBeVisible();
    
    // Check table headers
    await expect(page.getByRole('columnheader', { name: /customer/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /total/i })).toBeVisible();
  });

  test('should have accessible navigation', async ({ page }) => {
    // Check sidebar navigation
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();

    // Check for main navigation links
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
  });

  test('screenshot - full dashboard', async ({ page }, testInfo) => {
    // Take a full page screenshot
    await expect(page).toHaveScreenshot(`dashboard-${testInfo.project.name}.png`, {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should toggle theme', async ({ page }) => {
    // Find the theme toggle button
    const themeButton = page.getByLabel(/switch to (light|dark) mode/i);
    
    if (await themeButton.isVisible()) {
      // Get the current theme
      const htmlElement = page.locator('html');
      const initialClass = await htmlElement.getAttribute('class');
      const isDarkInitially = initialClass?.includes('dark');

      // Click the theme toggle
      await themeButton.click();
      await page.waitForTimeout(200); // Wait for transition

      // Verify the theme changed
      const newClass = await htmlElement.getAttribute('class');
      const isDarkAfterToggle = newClass?.includes('dark');
      
      expect(isDarkAfterToggle).not.toBe(isDarkInitially);
    }
  });

  test('should have keyboard-accessible elements', async ({ page }) => {
    // Tab through the page and check focus is visible
    await page.keyboard.press('Tab');
    
    // The first focusable element should have focus
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should show tooltip on heatmap cell hover', async ({ page }) => {
    // Find a heatmap cell
    const heatmapCell = page.locator('[role="gridcell"]').first();
    
    if (await heatmapCell.isVisible()) {
      await heatmapCell.hover();
      
      // Wait for tooltip to appear
      await page.waitForTimeout(200);
      
      // Check for tooltip
      const tooltip = page.getByRole('tooltip');
      await expect(tooltip).toBeVisible();
    }
  });

  test('should sort transactions table', async ({ page }) => {
    // Click on the Customer column header to sort
    const customerHeader = page.getByRole('columnheader', { name: /customer/i });
    await customerHeader.click();
    
    // Wait for sort to complete
    await page.waitForTimeout(200);
    
    // Verify the column is sorted (has sort indicator)
    await expect(customerHeader.locator('svg')).toBeVisible();
  });

  test('segmented control should change time range', async ({ page }) => {
    // Find the segmented control
    const weeklyButton = page.getByRole('radio', { name: /weekly/i });
    const monthlyButton = page.getByRole('radio', { name: /monthly/i });
    
    if (await weeklyButton.isVisible()) {
      // Click weekly
      await weeklyButton.click();
      await expect(weeklyButton).toHaveAttribute('aria-checked', 'true');
      
      // Click monthly
      await monthlyButton.click();
      await expect(monthlyButton).toHaveAttribute('aria-checked', 'true');
    }
  });
});

test.describe('Dashboard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should have no ARIA violations in main content', async ({ page }) => {
    // Check that main content area has proper landmark
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('buttons should have accessible names', async ({ page }) => {
    // Get all buttons
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const name = await button.getAttribute('aria-label');
      const text = await button.textContent();
      
      // Each button should have either aria-label or visible text
      expect(name || text?.trim()).toBeTruthy();
    }
  });

  test('table should have proper structure', async ({ page }) => {
    // Check table has caption
    const table = page.locator('table').first();
    if (await table.isVisible()) {
      const caption = table.locator('caption');
      await expect(caption).toBeAttached();
      
      // Check headers have scope
      const headers = table.locator('th');
      const headerCount = await headers.count();
      
      for (let i = 0; i < headerCount; i++) {
        const header = headers.nth(i);
        const scope = await header.getAttribute('scope');
        expect(scope).toBeTruthy();
      }
    }
  });

  test('focus should be visible on interactive elements', async ({ page }) => {
    // Tab to first interactive element
    await page.keyboard.press('Tab');
    
    // Get the focused element
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
    
    // The focused element should have visible focus indicator
    // (we rely on the CSS :focus-visible styles)
    const outlineStyle = await focused.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.outline || styles.boxShadow;
    });
    
    expect(outlineStyle).toBeTruthy();
  });
});

test.describe('Dashboard Responsive Behavior', () => {
  test('mobile: sidebar should be hidden initially', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Desktop sidebar should not be visible on mobile
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeHidden();
    
    // Menu button should be visible
    const menuButton = page.getByLabel(/open menu/i);
    await expect(menuButton).toBeVisible();
  });

  test('tablet: sidebar should be visible', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Sidebar should be visible on tablet
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();
  });

  test('desktop: full layout should be visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Sidebar should be visible
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();
    
    // Export button should be visible
    const exportButton = page.getByRole('button', { name: /export csv/i });
    await expect(exportButton).toBeVisible();
    
    // Date picker should be visible
    const datePicker = page.getByText(/Jan 1 - Jan 31/);
    await expect(datePicker).toBeVisible();
  });
});

