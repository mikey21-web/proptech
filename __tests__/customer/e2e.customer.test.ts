/**
 * Customer Portal E2E Test Specification
 *
 * These are Playwright-based E2E tests for the customer portal flow.
 * Requires a running dev server and seeded database.
 *
 * Run with: npx playwright test __tests__/customer/e2e.customer.test.ts
 */

import { test, expect } from '@playwright/test';

// Test customer credentials (from seed data)
const CUSTOMER_EMAIL = 'customer@clickprops.in';
const CUSTOMER_PASSWORD = 'ClickProps@2026';

test.describe('Customer Portal E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as customer
    await page.goto('/login');
    await page.fill('input[type="email"]', CUSTOMER_EMAIL);
    await page.fill('input[type="password"]', CUSTOMER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/customer**');
  });

  test('Dashboard shows correct overview', async ({ page }) => {
    await page.goto('/customer');

    // Dashboard elements should be visible
    await expect(page.getByText('Welcome back')).toBeVisible();

    // Stat cards
    await expect(page.getByText('Active Bookings')).toBeVisible();
    await expect(page.getByText('Total Paid')).toBeVisible();
    await expect(page.getByText('Outstanding')).toBeVisible();
    await expect(page.getByText('Documents')).toBeVisible();
  });

  test('View bookings list', async ({ page }) => {
    await page.goto('/customer/bookings');

    await expect(page.getByText('My Bookings')).toBeVisible();

    // Should show search and filters
    await expect(page.getByPlaceholder('Search bookings...')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'All' })).toBeVisible();
  });

  test('View booking detail with timeline', async ({ page }) => {
    await page.goto('/customer/bookings');

    // Click first booking card
    const firstBooking = page.locator('a[href^="/customer/bookings/"]').first();
    if (await firstBooking.isVisible()) {
      await firstBooking.click();

      // Timeline should be visible
      await expect(page.getByText('Booking Timeline')).toBeVisible();
      await expect(page.getByText('Booking Created')).toBeVisible();

      // Document checklist
      await expect(page.getByText('Document Checklist')).toBeVisible();
    }
  });

  test('View payments page', async ({ page }) => {
    await page.goto('/customer/payments');

    await expect(page.getByText('Payments')).toBeVisible();
    await expect(page.getByText('Total Paid')).toBeVisible();
    await expect(page.getByText('Outstanding')).toBeVisible();
  });

  test('View documents page and upload', async ({ page }) => {
    await page.goto('/customer/documents');

    await expect(page.getByText('Documents')).toBeVisible();
    await expect(page.getByText('Required Documents')).toBeVisible();

    // Click upload button
    const uploadBtn = page.getByRole('button', { name: /Upload/i }).first();
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();

      // Upload modal should appear
      await expect(page.getByText('Click or drag file to upload')).toBeVisible();
    }
  });

  test('View messages and submit query', async ({ page }) => {
    await page.goto('/customer/messages');

    await expect(page.getByText('Messages & Support')).toBeVisible();

    // Click new query button
    await page.click('button:has-text("New Query")');

    // Form should appear
    await expect(page.getByLabel('Subject')).toBeVisible();
    await expect(page.getByLabel('Description')).toBeVisible();

    // Fill and submit
    await page.fill('input#ticket-title', 'Test query from E2E');
    await page.fill('textarea#ticket-desc', 'This is a test query submitted from the E2E test suite for verification purposes.');
    await page.click('button:has-text("Submit Query")');

    // Success message
    await expect(page.getByText('Query Submitted')).toBeVisible({ timeout: 10000 });
  });

  test('FAQ section is accessible', async ({ page }) => {
    await page.goto('/customer/messages');

    // Click FAQ tab
    await page.click('button[role="tab"]:has-text("FAQ")');

    // FAQ items should be visible
    await expect(page.getByText('How do I make a payment?')).toBeVisible();
    await expect(page.getByText('When will my documents be verified?')).toBeVisible();

    // Click an FAQ item
    await page.click('button:has-text("How do I make a payment?")');
    await expect(page.getByText('Go to the Payments page')).toBeVisible();
  });

  test('Dark mode toggle works', async ({ page }) => {
    await page.goto('/customer');

    // Toggle dark mode
    const darkModeBtn = page.getByLabel(/Switch to dark mode|Switch to light mode/);
    await darkModeBtn.click();

    // Verify dark class is applied
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    // Toggle back
    await darkModeBtn.click();
    await expect(html).not.toHaveClass(/dark/);
  });

  test('Mobile navigation works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/customer');

    // Sidebar should be hidden initially
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/-translate-x-full/);

    // Open sidebar
    await page.getByLabel('Open sidebar').click();
    await expect(sidebar).toHaveClass(/translate-x-0/);

    // Navigate
    await page.click('a:has-text("Payments")');
    await page.waitForURL('/customer/payments');
  });

  test('Customer cannot access admin routes', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1500);
    const url = page.url();
    const body = await page.textContent('body');
    expect(
      url.includes('/login') ||
      (body && /Unauthorized|Access Denied|unauthorized|Do not have/.test(body))
    ).toBeTruthy();
  });
});
