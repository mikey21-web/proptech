---
name: ClickProps Project Overview
description: Complete project scope, business logic, and current status for Sri Sai Builders real estate CRM
type: project
---

# ClickProps CRM - Complete Project Overview

## Project Identity
- **Name:** ClickProps
- **Client:** Sri Sai Builders (Project Name: Sri Vaibhavam)
- **Goal:** Direct replacement for "Blindersoe" real estate CRM software
- **Live Data:** ~INR 14.85 Crore, 34 agents, 6 projects, 50+ bookings, 100+ leads
- **Status:** ~92% complete - core backend/frontend/devops done; final product/runtime tasks pending

## Tech Stack
- **Frontend:** Next.js 14, React 18, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Prisma ORM, NextAuth.js v4
- **Database:** PostgreSQL 15
- **Cache/Jobs:** Redis 7, BullMQ
- **Testing:** Jest, Playwright
- **DevOps:** Docker, Nginx, Hetzner VPS, Let's Encrypt

## 3 Portals & 9 Modules

### Portals:
1. **Agent Portal** — Dashboard, leads, bookings, commissions, team
2. **Customer Portal** — Dashboard, booking tracker, payments, documents
3. **Admin Portal** — Analytics, user management, reports, configuration

### Modules:
1. Identity & Access (NextAuth, RBAC)
2. Lead Management
3. Project & Inventory (plots, flats, amenities)
4. Customer Conversion
5. Booking Management
6. Payments & Installments
7. Agent & Commission
8. Automation (webhooks, cron jobs, BullMQ queues)
9. Reporting & Audit

## 6 Roles (RBAC)
- `super_admin` — Full system access
- `admin` — Organization management, reporting
- `sales_manager` — Team oversight, commission tracking
- `backoffice` — Documentation, payment processing
- `agent` — Lead management, personal sales, commissions
- `customer` — View bookings, payments, documents
- `channel_partner` — Isolated dashboard, submit booking requests (admin approval needed)

## Core Business Logic (Blindersoe Features)

### Interactive 2D Plot Layouts
- Uses `react-konva` to render interactive grids based on physical layout images
- Dynamic visual states: Available (Green), Blocked/On-Hold (Orange), Booked (Red), Agent-Allotted (Blue outline)
- Smart filtering by `facingDirection` (N/E/W/S), `bhk` (1/2/3), `category` (Corner/Standard), `sqft` (699/1020/1350)

### Conditional Blocking with Auto-Expiry
- Agents can "block" a plot to prevent others from selling it
- Block relies on countdown timer — if token deposit not paid, block auto-expires
- Prevents fraudulent holds

### Milestone Installments
- Payments handled via sequential milestones (not single-swipe)
- Captures hidden fees: stamp duty, legal expenses, registration
- Full installment history tracking

### Calendar & Site Visits
- Customers book on-site visits synced to calendar blocks
- Prevents overbooking

### Channel Partner Isolation
- Completely secure, isolated dashboard
- Cannot make direct bookings
- Submit "Digital Booking Requests" requiring admin approval/rejection

### Instant Enquiries & Blocks
- Customers: Click plots for instant enquiries
- Agents: Click plots to enforce instant blocks
- Real-time synchronization

## Current Completion Status

### ✅ Completed (Sessions 1-10)
- **Database:** 44 Prisma models, 25 enums, proper relations, indexes, soft deletes
- **Auth:** NextAuth v4, 6 roles, JWT sessions, RBAC enforcement across all routes
- **Backend API:** 47 routes verified, all CRUD operations, business logic wired
- **Frontend:** 3 portals complete, all pages functional, responsive UI
- **DevOps:** Docker/docker-compose, Nginx, CI/CD pipelines, monitoring stack, Hetzner scripts
- **Tests:** E2E tests fixed, all passing, integration tests for auth/API/UI
- **Build:** `npm run build` passes, runtime verified at localhost:3001

## Realistic Status: ~92% Code Done, final blockers remain

### 🔴 Critical Blockers (Must Fix)
1. **Seed verification pending** — rewritten seed needs runtime verification against current schema
2. **No migrations** — Using `prisma db push` workaround instead of proper migration files
3. **Auto-expiry schema missing** — blocked plots still need token/countdown expiry logic
4. **Konva canvas missing** — Floor plan component not implemented/wired to admin/layout page

### 🟡 Incomplete (Should Address)
- **Responsive design** — Not tested across mobile/tablet breakpoints
- **Actual deployment** — Config exists but never executed on Hetzner
- **Full E2E tests** — Written but not run end-to-end through CI/CD
- **Worker deployment** — wired in compose, still needs live runtime verification

### 🟢 Production-Ready
- Frontend (all 3 portals)
- Backend API (all 47 routes)
- Auth & RBAC
- Infrastructure configs
- CI/CD pipelines
- Monitoring stack

### ⏳ Pending (Final Tasks)

#### 1. Prisma Schema Rewrite (Opus 4.6 / DA)
**Current Issue:** 44 Prisma models exist but lack Blindersoe-specific features
**What's Missing:**
- Plot expiry/auto-unlock logic (token deposit countdown)
- Milestone installment structures (not just payment amounts)
- Layout filtering fields (facingDirection, bhk, category, sqft enums)
- Channel partner booking request workflow
- Calendar/site visit integration fields
- Visual state tracking (available/blocked/booked/allotted)

**Deliverable:** Updated `prisma/schema.prisma` with all Blindersoe features + new migrations + `prisma/seed.ts` with ₹14.85 Cr live data

#### 2. Interactive 2D Layout Component (Qwen3.5 Vision / FE)
**Current Issue:** No `react-konva` canvas implementation
**What's Needed:**
- Read Sri Vaibhavam brochure/SVG images
- Build interactive grid component with plot rectangles
- Implement dynamic coloring (Green/Orange/Red/Blue states)
- Add filter panel (facing, bhk, category, sqft)
- Wire to API for real-time plot availability
- Handle click events for agent blocks & customer enquiries

**Deliverable:** `components/PlotMapCanvas.tsx` + integration in `app/admin/layout/page.tsx`

#### 3. Worker Runtime + Live Deployment (GPT-5.4 / DeepSeek V3.2)
**Current Issue:** Infrastructure scripts exist but not yet executed
**What's Needed:**
- Verify BullMQ worker service live with Redis and background jobs
- Provision Hetzner VPS (if not done)
- Run Docker compose on production
- Configure SSL/TLS with Certbot
- Set up Prometheus/Grafana monitoring
- Configure backup automation
- Test health checks & zero-downtime deployment

**Deliverable:** Live app at production domain with monitoring active

## Database Schema Summary

**44 Prisma Models across 9 groups:**
1. **Identity:** Organization, User, Role, Permission, UserRole, RolePermission
2. **CRM:** Lead, LeadSource, LeadStatus, Task, Communication, Activity, Note
3. **Inventory:** Project, Plot, Flat, Amenity, ProjectImage, ProjectStatus
4. **Customer:** Customer, CustomerContact, CustomerDocument
5. **Booking:** Booking, BookingStatus
6. **Finance:** Payment, Installment, Transaction, Refund, PaymentMode
7. **Sales:** Agent, AgentTeam, CommissionStructure, CommissionRule, Commission
8. **Loan:** Loan, LoanInstallment, LoanDocument, LoanStatus (optional)
9. **System:** Configuration, AuditLog, Webhook

**25 Enums:** Roles, permissions, statuses, document types, payment modes, etc.

## Next Immediate Steps

1. **Read ClickProps_Clone/MEMORY.md** — See detailed status of all 10 completed sessions
2. **Rewrite Prisma schema** — Add Blindersoe features & regenerate migrations
3. **Build 2D plot canvas** — Consume layout images, wire to API
4. **Deploy to Hetzner** — Execute production deployment scripts
5. **Live launch** — Test on production, enable monitoring

## Files & Locations
- **ClickProps_Clone/** — Active clone, all backend/frontend/devops done
- **New folder/** — Reference documentation with multi-agent plan
- **Key Files in ClickProps_Clone:**
  - `MEMORY.md` — Session-by-session progress log
  - `prisma/schema.prisma` — Database models (needs update)
  - `app/api/` — All 47 backend routes
  - `app/agent/`, `app/customer/`, `app/admin/` — 3 portals
  - `.github/workflows/` — CI/CD pipelines
  - `Dockerfile`, `docker-compose.yml` — Containerization

---
**Last Updated:** 2026-03-23
**Created From:** New folder reference docs + ClickProps_Clone MEMORY.md consolidation
