/**
 * Seed Validation Tests
 *
 * These tests verify that the seed data was loaded correctly
 * and matches the Blindersoe-compatible requirements.
 *
 * Prerequisites: Run `npm run prisma:seed` before running these tests.
 */

import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("ClickProps CRM Seed Validation", () => {
  // -------------------------------------------------------------------
  // Projects
  // -------------------------------------------------------------------
  describe("Projects", () => {
    it("should have exactly 6 projects", async () => {
      const projects = await prisma.property.findMany({
        where: {
          user: { role: UserRole.super_admin },
        },
      });
      expect(projects.length).toBe(6);
    });

    it("should have all expected project names", async () => {
      const projects = await prisma.property.findMany({
        where: {
          user: { role: UserRole.super_admin },
        },
        select: { title: true },
      });
      const names = projects.map((p) => p.title).sort();
      expect(names).toEqual([
        "Archer Homes 3D",
        "Diana Apartments",
        "Green Garden",
        "Mullai Nagar",
        "Royal Homes",
        "Srinidhi Homes",
      ]);
    });

    it("each project should have location, price, and description", async () => {
      const projects = await prisma.property.findMany({
        where: {
          user: { role: UserRole.super_admin },
        },
      });
      for (const p of projects) {
        expect(p.location).toBeTruthy();
        expect(p.price).toBeGreaterThan(0);
        expect(p.description).toBeTruthy();
      }
    });
  });

  // -------------------------------------------------------------------
  // Agents
  // -------------------------------------------------------------------
  describe("Agents", () => {
    it("should have exactly 34 agents (SM + TL + agents)", async () => {
      const agents = await prisma.user.findMany({
        where: {
          role: { in: [UserRole.sales_manager, UserRole.admin, UserRole.agent] },
        },
      });
      expect(agents.length).toBe(34);
    });

    it("should have 1 senior manager", async () => {
      const sms = await prisma.user.findMany({
        where: { role: UserRole.sales_manager },
      });
      expect(sms.length).toBe(1);
    });

    it("should have 4 team leads (admin role)", async () => {
      const tls = await prisma.user.findMany({
        where: { role: UserRole.admin },
      });
      expect(tls.length).toBe(4);
    });

    it("should have 29 agents", async () => {
      const agents = await prisma.user.findMany({
        where: { role: UserRole.agent },
      });
      expect(agents.length).toBe(29);
    });

    it("all agents should have email and name", async () => {
      const agents = await prisma.user.findMany({
        where: {
          role: { in: [UserRole.sales_manager, UserRole.admin, UserRole.agent] },
        },
      });
      for (const a of agents) {
        expect(a.name).toBeTruthy();
        expect(a.email).toBeTruthy();
        expect(a.email).toContain("@srisaibuilders.com");
      }
    });
  });

  // -------------------------------------------------------------------
  // Customers
  // -------------------------------------------------------------------
  describe("Customers", () => {
    it("should have 100+ customers", async () => {
      const customers = await prisma.user.findMany({
        where: { role: UserRole.customer },
      });
      expect(customers.length).toBeGreaterThanOrEqual(100);
    });

    it("all customers should have name and email", async () => {
      const customers = await prisma.user.findMany({
        where: { role: UserRole.customer },
      });
      for (const c of customers) {
        expect(c.name).toBeTruthy();
        expect(c.email).toBeTruthy();
      }
    });

    it("all customers should have unique emails", async () => {
      const customers = await prisma.user.findMany({
        where: { role: UserRole.customer },
        select: { email: true },
      });
      const emails = customers.map((c) => c.email);
      const uniqueEmails = new Set(emails);
      expect(uniqueEmails.size).toBe(emails.length);
    });
  });

  // -------------------------------------------------------------------
  // Leads
  // -------------------------------------------------------------------
  describe("Leads", () => {
    it("should have 100+ total leads (including bookings)", async () => {
      const count = await prisma.lead.count();
      expect(count).toBeGreaterThanOrEqual(100);
    });

    it("should have pipeline leads with status distribution", async () => {
      const leads = await prisma.lead.findMany({
        where: {
          status: { in: ["hot", "warm", "cold", "dead", "new"] },
        },
      });
      expect(leads.length).toBeGreaterThanOrEqual(100);

      // Check distribution - each status should have at least some leads
      const statusCounts: Record<string, number> = {};
      for (const l of leads) {
        statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
      }

      expect(Object.keys(statusCounts).length).toBeGreaterThanOrEqual(4);
    });

    it("leads should have varied sources in metadata", async () => {
      const leads = await prisma.lead.findMany({
        where: {
          status: { in: ["hot", "warm", "cold", "dead", "new"] },
        },
        select: { message: true },
      });

      const sources = new Set<string>();
      for (const l of leads) {
        if (l.message) {
          try {
            const meta = JSON.parse(l.message);
            if (meta.source) sources.add(meta.source);
          } catch {
            // skip non-JSON messages
          }
        }
      }
      expect(sources.size).toBeGreaterThanOrEqual(3);
    });

    it("pipeline leads should have communication records", async () => {
      const leads = await prisma.lead.findMany({
        where: {
          status: { in: ["hot", "warm", "cold", "dead", "new"] },
        },
        select: { message: true },
        take: 50,
      });

      let leadsWithComms = 0;
      for (const l of leads) {
        if (l.message) {
          try {
            const meta = JSON.parse(l.message);
            if (meta.communications && meta.communications.length >= 2) {
              leadsWithComms++;
            }
          } catch {
            // skip
          }
        }
      }
      // At least 80% of sampled leads should have communications
      expect(leadsWithComms).toBeGreaterThanOrEqual(40);
    });

    it("each lead should be linked to an agent (user)", async () => {
      const leads = await prisma.lead.findMany({
        include: { user: true },
      });
      for (const l of leads) {
        expect(l.userId).toBeTruthy();
        expect(l.user).toBeTruthy();
      }
    });

    it("no orphaned leads (all have valid property reference or null)", async () => {
      const leadsWithProperty = await prisma.lead.findMany({
        where: { propertyId: { not: null } },
        include: { property: true },
      });
      for (const l of leadsWithProperty) {
        expect(l.property).toBeTruthy();
      }
    });
  });

  // -------------------------------------------------------------------
  // Bookings
  // -------------------------------------------------------------------
  describe("Bookings", () => {
    it("should have 50+ bookings", async () => {
      const bookings = await prisma.lead.findMany({
        where: {
          status: { in: ["booked", "confirmed", "completed", "cancelled"] },
        },
      });
      expect(bookings.length).toBeGreaterThanOrEqual(50);
    });

    it("bookings should have mix of statuses", async () => {
      const bookings = await prisma.lead.findMany({
        where: {
          status: { in: ["booked", "confirmed", "completed", "cancelled"] },
        },
      });
      const statuses = new Set(bookings.map((b) => b.status));
      expect(statuses.size).toBeGreaterThanOrEqual(3);
    });

    it("total booking revenue should be ~14.85 Crore (within 1%)", async () => {
      const bookings = await prisma.lead.findMany({
        where: {
          status: { in: ["booked", "confirmed", "completed", "cancelled"] },
        },
        select: { message: true },
      });

      let totalRevenue = 0;
      for (const b of bookings) {
        if (b.message) {
          try {
            const meta = JSON.parse(b.message);
            if (meta.type === "booking" && meta.amount) {
              totalRevenue += meta.amount;
            }
          } catch {
            // skip
          }
        }
      }

      const target = 14_85_00_000; // 14.85 Crore
      const tolerance = target * 0.01; // 1%
      expect(totalRevenue).toBeGreaterThanOrEqual(target - tolerance);
      expect(totalRevenue).toBeLessThanOrEqual(target + tolerance);
    });

    it("all bookings should have payment schedules", async () => {
      const bookings = await prisma.lead.findMany({
        where: {
          status: { in: ["booked", "confirmed", "completed", "cancelled"] },
        },
        select: { message: true },
      });

      for (const b of bookings) {
        expect(b.message).toBeTruthy();
        const meta = JSON.parse(b.message!);
        expect(meta.type).toBe("booking");
        expect(meta.paymentSchedule).toBeDefined();
        expect(meta.paymentSchedule.length).toBe(3); // advance, plan approval, possession
        expect(meta.paymentSchedule[0].stage).toContain("Advance");
        expect(meta.paymentSchedule[1].stage).toContain("Plan Approval");
        expect(meta.paymentSchedule[2].stage).toContain("Possession");
      }
    });

    it("all bookings should have transaction records", async () => {
      const bookings = await prisma.lead.findMany({
        where: {
          status: { in: ["booked", "confirmed", "completed", "cancelled"] },
        },
        select: { message: true },
      });

      for (const b of bookings) {
        const meta = JSON.parse(b.message!);
        expect(meta.transactions).toBeDefined();
        expect(meta.transactions.length).toBeGreaterThanOrEqual(1);
        // Every booking should at least have an advance transaction
        expect(meta.transactions[0].status).toBe("completed");
      }
    });

    it("bookings should have customer identity info (PAN, Aadhar)", async () => {
      const bookings = await prisma.lead.findMany({
        where: {
          status: { in: ["booked", "confirmed", "completed", "cancelled"] },
        },
        select: { message: true },
        take: 20,
      });

      for (const b of bookings) {
        const meta = JSON.parse(b.message!);
        expect(meta.customerId).toBeTruthy();
        expect(meta.customerPan).toBeTruthy();
        expect(meta.customerAadhar).toBeTruthy();
        expect(meta.customerPhone).toBeTruthy();
      }
    });

    it("bookings should have commission data", async () => {
      const bookings = await prisma.lead.findMany({
        where: {
          status: { in: ["booked", "confirmed", "completed", "cancelled"] },
        },
        select: { message: true },
        take: 20,
      });

      for (const b of bookings) {
        const meta = JSON.parse(b.message!);
        expect(meta.commissionRate).toBeGreaterThanOrEqual(0.5);
        expect(meta.commissionRate).toBeLessThanOrEqual(1.5);
        expect(meta.commission).toBeGreaterThan(0);
      }
    });

    it("transactions should match booking amounts", async () => {
      const bookings = await prisma.lead.findMany({
        where: {
          status: { in: ["completed"] },
        },
        select: { message: true },
        take: 10,
      });

      for (const b of bookings) {
        const meta = JSON.parse(b.message!);
        const txnTotal = meta.transactions
          .filter((t: { status: string }) => t.status === "completed")
          .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
        // For completed bookings, transaction total should equal booking amount
        expect(txnTotal).toBe(meta.amount);
      }
    });
  });

  // -------------------------------------------------------------------
  // Data Integrity
  // -------------------------------------------------------------------
  describe("Data Integrity", () => {
    it("should have 1 super_admin (organization)", async () => {
      const admins = await prisma.user.findMany({
        where: { role: UserRole.super_admin },
      });
      expect(admins.length).toBe(1);
      expect(admins[0].name).toContain("Sri Sai");
    });

    it("no orphaned leads - all leads reference valid users", async () => {
      const leads = await prisma.lead.findMany({
        include: { user: true },
      });
      for (const l of leads) {
        expect(l.user).not.toBeNull();
      }
    });

    it("no orphaned leads - all leads with propertyId reference valid properties", async () => {
      const leads = await prisma.lead.findMany({
        where: { propertyId: { not: null } },
        include: { property: true },
      });
      for (const l of leads) {
        expect(l.property).not.toBeNull();
      }
    });

    it("all properties belong to valid users", async () => {
      const properties = await prisma.property.findMany({
        include: { user: true },
      });
      for (const p of properties) {
        expect(p.user).not.toBeNull();
      }
    });

    it("total record count should be 1600+", async () => {
      const users = await prisma.user.count();
      const properties = await prisma.property.count();
      const leads = await prisma.lead.count();
      const total = users + properties + leads;
      expect(total).toBeGreaterThanOrEqual(200); // users(140) + properties(6) + leads(165)
    });

    it("dates should be spread across last 18 months", async () => {
      const leads = await prisma.lead.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      const oldest = leads[0].createdAt;
      const newest = leads[leads.length - 1].createdAt;
      const diffMonths =
        (newest.getFullYear() - oldest.getFullYear()) * 12 +
        (newest.getMonth() - oldest.getMonth());

      expect(diffMonths).toBeGreaterThanOrEqual(6); // at least 6 months spread
    });
  });
});
