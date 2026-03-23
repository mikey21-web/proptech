/**
 * UI Interaction Tests for ClickProps CRM (Playwright E2E)
 *
 * Tests cover:
 * - Login page interactions
 * - Protected route redirects
 * - Responsive design breakpoints
 * - Component rendering validation
 * - Role-based navigation
 *
 * Run with: npx playwright test __tests__/ui.test.ts
 *
 * NOTE: These tests require a running dev server (npm run dev).
 * For CI, use `playwright test` with the webServer config in playwright.config.ts.
 *
 * Since Playwright is not yet installed, this file contains the test
 * specifications using Playwright's test API. Install with:
 *   npm install -D @playwright/test
 *   npx playwright install
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

// ---------------------------------------------------------------------------
// Login Page Tests
// ---------------------------------------------------------------------------

test.describe('Login Page', () => {
  test('renders login form with email and password fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('shows validation on empty submit', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.click('button[type="submit"]');

    // HTML5 validation or custom error should prevent submission
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const isRequired = await emailInput.getAttribute('required');
    // Either HTML5 required or the page shows an error message
    const hasError = isRequired !== null || (await page.locator('[role="alert"], .error, .text-red').count()) > 0;
    expect(hasError).toBe(true);
  });

  test('successful agent login redirects to /agent or /dashboard', async ({ page }) => {
    await login(page, 'agent@clickprops.in', 'ClickProps@2026');

    // After login, should be on a protected page
    const url = page.url();
    const isRedirected = url.includes('/agent') || url.includes('/dashboard') || url.includes('/sales-manager');
    expect(isRedirected).toBe(true);
  });

  test('successful admin login redirects appropriately', async ({ page }) => {
    await login(page, 'admin@clickprops.in', 'ClickProps@2026');

    const url = page.url();
    const isRedirected = !url.includes('/login');
    expect(isRedirected).toBe(true);
  });

  test('invalid credentials show error message', async ({ page }) => {
    await login(page, 'admin@clickprops.in', 'WrongPassword');

    // Should still be on login page or show error
    const hasError =
      page.url().includes('/login') ||
      page.url().includes('error') ||
      (await page.locator('[role="alert"], .error, .text-red, .text-destructive').count()) > 0;
    expect(hasError).toBe(true);
  });

  test('successful admin login redirects appropriately', async ({ page }) => {
    await login(page, 'admin@srisaibuilders.com', 'Admin@123');

    const url = page.url();
    const isRedirected = !url.includes('/login');
    expect(isRedirected).toBe(true);
  });

  test('invalid credentials show error message', async ({ page }) => {
    await login(page, 'admin@srisaibuilders.com', 'WrongPassword');

    // Should still be on signin page or show error
    const hasError =
      page.url().includes('/login') ||
      page.url().includes('error') ||
      (await page.locator('[role="alert"], .error, .text-red, .text-destructive').count()) > 0;
    expect(hasError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Protected Route Tests
// ---------------------------------------------------------------------------

test.describe('Protected Routes', () => {
  test('unauthenticated user accessing /admin redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toContain('/login');
  });

  test('unauthenticated user accessing /agent redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/agent`);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toContain('/login');
  });

  test('unauthenticated user accessing /dashboard redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toContain('/login');
  });

  test('unauthenticated user accessing /agent redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/agent`);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toContain('/login');
  });

  test('unauthenticated user accessing /dashboard redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toContain('/login');
  });

  test('public route / is accessible without auth', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/`);
    expect(response?.status()).toBeLessThan(400);
  });

  test('login page is accessible without auth', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/login`);
    expect(response?.status()).toBeLessThan(400);
  });
});

// ---------------------------------------------------------------------------
// Responsive Design Tests
// ---------------------------------------------------------------------------

test.describe('Responsive Design', () => {
  test('mobile viewport (375px): page renders without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/login`);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
  });

  test('tablet viewport (768px): page renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/login`);

    const loginForm = page.locator('form, [data-testid="login-form"]');
    await expect(loginForm).toBeVisible();
  });

  test('desktop viewport (1440px): page renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/login`);

    const loginForm = page.locator('form, [data-testid="login-form"]');
    await expect(loginForm).toBeVisible();
  });

  test('mobile viewport: login form is usable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/login`);

    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Fields should be interactable
    await emailInput.click();
    await emailInput.fill('test@example.com');
    expect(await emailInput.inputValue()).toBe('test@example.com');
  });
});

// ---------------------------------------------------------------------------
// Component Rendering Tests
// ---------------------------------------------------------------------------

test.describe('Component Rendering', () => {
  test('login page has ClickProps branding', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Check for app title/branding in page
    const pageText = await page.textContent('body');
    const hasBranding =
      pageText?.includes('ClickProps') ||
      pageText?.includes('Sri Sai') ||
      pageText?.includes('Sign in') ||
      pageText?.includes('Login');
    expect(hasBranding).toBe(true);
  });

  test('home page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Filter out expected Next.js hydration warnings
    const criticalErrors = errors.filter(
      (e) => !e.includes('hydration') && !e.includes('Warning:')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('page has proper meta tags', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const title = await page.title();
    expect(title).toBeTruthy();

    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('page has lang attribute set', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en');
  });
});

// ---------------------------------------------------------------------------
// Navigation Tests (authenticated)
// ---------------------------------------------------------------------------

test.describe('Authenticated Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@clickprops.in', 'ClickProps@2026');
  });

  test('after login, page shows user info or navigation', async ({ page }) => {
    // Authenticated page should have some navigation or user indicator
    const hasNav =
      (await page.locator('nav, [role="navigation"], aside, .sidebar').count()) > 0 ||
      (await page.locator('header').count()) > 0;
    expect(hasNav).toBe(true);
  });

  test('page does not show login form when authenticated', async ({ page }) => {
    const url = page.url();
    expect(url).not.toContain('/login');
  });
});

// ---------------------------------------------------------------------------
// Accessibility Tests
// ---------------------------------------------------------------------------

test.describe('Accessibility', () => {
  test('login page: form inputs have associated labels or aria-labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const inputs = page.locator('input[type="email"], input[type="password"], input[name="email"], input[name="password"]');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.getAttribute('aria-label');
      const hasLabelledBy = await input.getAttribute('aria-labelledby');
      const id = await input.getAttribute('id');

      // Input should have aria-label, aria-labelledby, or a matching <label>
      const hasAssociatedLabel =
        hasLabel !== null ||
        hasLabelledBy !== null ||
        (id !== null && (await page.locator(`label[for="${id}"]`).count()) > 0) ||
        (await input.locator('xpath=ancestor::label').count()) > 0;

      expect(hasAssociatedLabel).toBe(true);
    }
  });

  test('login page: submit button is keyboard accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    // Should be focusable
    await submitButton.focus();
    const isFocused = await submitButton.evaluate((el) => document.activeElement === el);
    expect(isFocused).toBe(true);
  });
});
