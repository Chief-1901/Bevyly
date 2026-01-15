import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for SalesOS Dashboard
 * Visual snapshot testing at multiple breakpoints and themes
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /* Test projects for different viewports and themes */
  projects: [
    // Mobile viewport - 375x812 (iPhone SE/12 mini)
    {
      name: 'mobile-light',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 375, height: 812 },
        colorScheme: 'light',
      },
    },
    {
      name: 'mobile-dark',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 375, height: 812 },
        colorScheme: 'dark',
      },
    },

    // Tablet viewport - 768x1024 (iPad)
    {
      name: 'tablet-light',
      use: {
        viewport: { width: 768, height: 1024 },
        colorScheme: 'light',
      },
    },
    {
      name: 'tablet-dark',
      use: {
        viewport: { width: 768, height: 1024 },
        colorScheme: 'dark',
      },
    },

    // Desktop viewport - 1280x800
    {
      name: 'desktop-light',
      use: {
        viewport: { width: 1280, height: 800 },
        colorScheme: 'light',
      },
    },
    {
      name: 'desktop-dark',
      use: {
        viewport: { width: 1280, height: 800 },
        colorScheme: 'dark',
      },
    },
  ],

  /* Local dev server */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

