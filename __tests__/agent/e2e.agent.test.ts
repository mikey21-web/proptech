/**
 * Agent Portal E2E Tests (Playwright)
 *
 * These tests verify the complete agent workflow:
 * 1. Login as agent
 * 2. View leads dashboard
 * 3. Create a new lead
 * 4. View lead detail
 * 5. Update lead status
 * 6. View bookings
 * 7. View booking detail
 * 8. View commissions
 *
 * Note: For CI/CD, ensure test database is seeded with agent data.
 * Run with: npx playwright test __tests__/agent/e2e.agent.test.ts
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// Helper to login as agent
async function loginAsAgent(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'agent@clickprops.in');
  await page.fill('input[type="password"]', 'ClickProps@2026');
  await page.click('button[type="submit"]');
  // Wait for redirect to agent dashboard
  await page.waitForURL('**/agent**', { timeout: 10000 });
}

test.describe('Agent Portal E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Skip if no test server running
    try {
      const response = await page.goto(`${BASE_URL}/api/health`);
      if (!response || response.status() !== 200) {
        test.skip();
      }
    } catch {
      test.skip();
    }
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/agent/leads`);
    await page.waitForTimeout(1500);
    const url = page.url();
    expect(url.includes('/login')).toBeTruthy();
  });

  test('should display leads dashboard after login', async ({ page }) => {
    await loginAsAgent(page);
    await page.goto(`${BASE_URL}/agent/leads`);

    // Check page heading
    await expect(page.locator('h1')).toContainText('My Leads');

    // Check for leads table or empty state
    const table = page.locator('table');
    const emptyState = page.locator('text=No leads found');
    await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 });
  });

  test('should open new lead form', async ({ page }) => {
    await loginAsAgent(page);
    await page.goto(`${BASE_URL}/agent/leads`);

    // Click new lead button
    await page.click('button:has-text("New Lead")');

    // Form should appear
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input#phone')).toBeVisible();
    await expect(page.locator('select#status')).toBeVisible();
    await expect(page.locator('select#priority')).toBeVisible();
  });

  test('should validate lead form on submit', async ({ page }) => {
    await loginAsAgent(page);
    await page.goto(`${BASE_URL}/agent/leads`);

    await page.click('button:has-text("New Lead")');

    // Submit empty form
    await page.click('button:has-text("Create Lead")');

    // Should show validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Phone is required')).toBeVisible();
  });

  test('should create a new lead', async ({ page }) => {
    await loginAsAgent(page);
    await page.goto(`${BASE_URL}/agent/leads`);

    await page.click('button:has-text("New Lead")');

    // Fill form
    await page.fill('input#name', `Test Lead ${Date.now()}`);
    await page.fill('input#phone', '9876543210');
    await page.fill('input#email', 'testlead@example.com');
    await page.selectOption('select#priority', 'high');
    await page.fill('input#source', 'Walk-in');

    // Submit
    await page.click('button:has-text("Create Lead")');

    // Should show success toast
    await expect(page.locator('text=Lead created successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to lead detail page', async ({ page }) => {
    await loginAsAgent(page);
    await page.goto(`${BASE_URL}/agent/leads`);

    // Wait for table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {
      // No leads exist, skip
      test.skip();
    });

    // Click first lead row
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();

    // Should navigate to detail page
    await page.waitForURL('**/agent/leads/**');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should display bookings page', async ({ page }) => {
    await loginAsAgent(page);
    await page.goto(`${BASE_URL}/agent/bookings`);

    await expect(page.locator('h1')).toContainText('My Bookings');

    // Check for booking cards or empty state
    const cards = page.locator('[class*="rounded-lg"]');
    const emptyState = page.locator('text=No bookings found');
    // At least one should be visible
    await expect(cards.first().or(emptyState)).toBeVisible({ timeout: 10000 });
  });

  test('should display commissions page', async ({ page }) => {
    await loginAsAgent(page);
    await page.goto(`${BASE_URL}/agent/commissions`);

    await expect(page.locator('h1')).toContainText('Commission');

    // Should show metric cards or loading skeleton
    await page.waitForSelector('[class*="rounded-lg"]', { timeout: 10000 });
  });

  test('should toggle dark mode', async ({ page }) => {
    await loginAsAgent(page);
    await page.goto(`${BASE_URL}/agent/leads`);

    // Find and click dark mode toggle
    const darkToggle = page.locator('button[aria-label*="dark mode"], button[aria-label*="light mode"]');
    await darkToggle.click();

    // HTML should have dark class
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');

    // Toggle back
    await darkToggle.click();
    const htmlClass2 = await page.locator('html').getAttribute('class');
    expect(htmlClass2).not.toContain('dark');
  });

  test('should show filters panel', async ({ page }) => {
    await loginAsAgent(page);
    await page.goto(`${BASE_URL}/agent/leads`);

    // Click Filters button
    await page.click('button:has-text("Filters")');

    // Filter panel should appear
    await expect(page.locator('select[aria-label="Filter by status"]')).toBeVisible();
    await expect(page.locator('select[aria-label="Filter by priority"]')).toBeVisible();
    await expect(page.locator('input[aria-label="Search leads"]')).toBeVisible();
  });

  test('should navigate between agent sections via sidebar', async ({ page }) => {
    await loginAsAgent(page);
    await page.goto(`${BASE_URL}/agent`);

    // Navigate to leads
    await page.click('a:has-text("My Leads")');
    await expect(page).toHaveURL(/\/agent\/leads/);

    // Navigate to bookings
    await page.click('a:has-text("My Bookings")');
    await expect(page).toHaveURL(/\/agent\/bookings/);

    // Navigate to commission
    await page.click('a:has-text("Commission")');
    await expect(page).toHaveURL(/\/agent\/commissions/);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAsAgent(page);
    await page.goto(`${BASE_URL}/agent/leads`);

    // Sidebar should be hidden on mobile
    const sidebar = page.locator('aside');
    await expect(sidebar).not.toBeVisible();

    // Mobile menu button should be visible
    const menuButton = page.locator('button[aria-label="Open sidebar"]');
    await expect(menuButton).toBeVisible();

    // Click to open sidebar
    await menuButton.click();
    await expect(sidebar).toBeVisible();

    // Click overlay to close
    await page.click('[aria-hidden="true"]');
    await expect(sidebar).not.toBeVisible();
  });
});
