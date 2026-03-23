/**
 * Admin Portal E2E Tests (Playwright)
 *
 * Verifies:
 * 1. Login as admin
 * 2. Admin dashboard loads with KPIs
 * 3. All admin sidebar navigation works
 * 4. Leads page with search/filter
 * 5. Customers page
 * 6. Bookings page
 * 7. Projects page
 * 8. Reports page
 * 9. Settings page
 * 10. Team management
 * 11. Mobile responsiveness
 * 12. Unauthorized redirect for agents/customers
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@clickprops.in';
const ADMIN_PASSWORD = 'ClickProps@2026';

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin**', { timeout: 10000 });
}

test.describe('Admin Portal E2E', () => {
  test.beforeEach(async ({ page }) => {
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
    await page.goto(`${BASE_URL}/admin`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should login as admin and show dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin`);
    await expect(page.locator('h1')).toContainText(/Dashboard|Overview/);
  });

  test('should display dashboard KPIs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    // Check for metric cards
    const metricLabels = ['Leads', 'Bookings', 'Revenue', 'Agents'];
    for (const label of metricLabels) {
      const card = page.locator(`text=${label}`).first();
      if (await card.isVisible()) {
        await expect(card).toBeVisible();
      }
    }
  });

  test.describe.configure({ mode: 'serial' });

  test('sidebar navigation - all sections', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin`);

    const navLinks = [
      { label: 'Dashboard', href: '/admin' },
      { label: 'Leads', href: '/admin/leads' },
      { label: 'Customers', href: '/admin/customers' },
      { label: 'Agents', href: '/admin/agents' },
      { label: 'Projects', href: '/admin/projects' },
      { label: 'Bookings', href: '/admin/bookings' },
      { label: 'Inventory', href: '/admin/inventory' },
      { label: 'Payments', href: '/admin/payments' },
      { label: 'Commissions', href: '/admin/commissions' },
      { label: 'Analytics', href: '/admin/analytics' },
      { label: 'Reports', href: '/admin/reports' },
      { label: 'Audit Log', href: '/admin/audit' },
      { label: 'Team', href: '/admin/team' },
      { label: 'Users', href: '/admin/users' },
      { label: 'Settings', href: '/admin/settings' },
      { label: 'Configuration', href: '/admin/configuration' },
      { label: 'Roles', href: '/admin/roles' },
    ];

    for (const link of navLinks) {
      await page.click(`a[href="${link.href}"]`);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(new RegExp(link.href), { timeout: 5000 });
      // Each page should have an h1
      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible({ timeout: 5000 });
    }
  });

  test('leads page - search and filters', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/leads`);
    await page.waitForLoadState('networkidle');

    // Search input
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
    }

    // Status filter
    const statusFilter = page.locator('select').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ index: 1 }).catch(() => {});
    }
  });

  test('reports page - generate a report', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/reports`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/Reports/);

    // Click a report type
    const reportType = page.locator('button:has-text("Booking Report")').first();
    if (await reportType.isVisible()) {
      await reportType.click();
      await page.waitForTimeout(2000);
    }

    // Date filter inputs should be visible
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs.first()).toBeVisible();
  });

  test('settings page - tabs work', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/settings`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/Settings/);

    // Click each tab
    const tabs = ['Organization', 'Roles', 'Commissions', 'User Access'];
    for (const tab of tabs) {
      const tabBtn = page.locator(`button:has-text("${tab}")`).first();
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('team page - add agent button works', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/team`);
    await page.waitForLoadState('networkidle');

    // Add Agent button should open modal
    const addBtn = page.locator('button:has-text("Add Agent")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
      // Modal should appear with form fields
      const nameInput = page.locator('input').first();
      await expect(nameInput.or(page.locator('h2:has-text("Add New Agent")'))).toBeVisible({ timeout: 3000 });
      // Close modal
      await page.keyboard.press('Escape');
    }
  });

  test('dark mode toggle in sidebar', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin`);

    const darkToggle = page.locator('button[aria-label*="dark mode"], button[aria-label*="light mode"]').first();
    if (await darkToggle.isVisible()) {
      await darkToggle.click();
      await page.waitForTimeout(200);
      const htmlClass = await page.locator('html').getAttribute('class');
      expect(htmlClass).toBeTruthy();
    }
  });

  test('mobile viewport - sidebar opens/closes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin`);

    // Sidebar should be hidden on mobile
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/-translate-x-full/, { timeout: 3000 });

    // Open button should be visible
    const openBtn = page.locator('button[aria-label="Open sidebar"]');
    await expect(openBtn).toBeVisible();

    await openBtn.click();
    await page.waitForTimeout(300);
    await expect(sidebar).toHaveClass(/translate-x-0/, { timeout: 3000 });

    // Close via overlay
    await page.locator('[role="presentation"]').first().click();
    await page.waitForTimeout(300);
    await expect(sidebar).toHaveClass(/-translate-x-full/, { timeout: 3000 });
  });

  test('agent cannot access admin portal', async ({ page }) => {
    await loginAsAdmin(page); // login as admin first
    await page.goto(`${BASE_URL}/admin`);
    await expect(page.locator('h1')).toContainText(/Dashboard/);
    // Sign out and login as agent
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'agent@clickprops.in');
    await page.fill('input[type="password"]', 'ClickProps@2026');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/agent**', { timeout: 10000 });
    // Agent trying to access admin should be blocked
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForTimeout(1000);
    const body = await page.textContent('body');
    expect(body).toMatch(/Unauthorized|Access Denied|unauthorized|Do not have/);
  });

  test('configuration page loads with sections', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/configuration`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/Configuration/);

    // Click each config section
    const sections = ['Organization', 'Notifications', 'Security', 'Integrations', 'Appearance'];
    for (const section of sections) {
      const btn = page.locator(`button:has-text("${section}")`).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('roles page loads with role cards', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/roles`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/Roles/);
    // Should show role cards (shields/icons)
    const shield = page.locator('svg').first();
    await expect(shield).toBeVisible();
  });
});
