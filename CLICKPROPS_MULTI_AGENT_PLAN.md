# ClickProps Multi-Agent Orchestration Plan
**Date:** 2026-03-17
**Budget:** 200K tokens
**Goal:** Build production-ready ClickProps application (Blindersoe replacement) with 5 specialized agents working in parallel with inter-agent communication.

---

## Executive Summary

**Project:** ClickProps (Real Estate CRM for Sri Sai Builders)
**Scope:** 3 portals, 9 modules, 35+ database tables, 11 sessions of work
**Live Data:** ₹14.85 Crore revenue, 34 agents, 6 projects, 50+ bookings, 100+ leads
**Deployment:** Hetzner VPS (production)
**Team:** 5 specialized agents (DA, BE, FE, QA, DO)

---

## Agent Roles & Token Allocation

### 1. Database Architect (DA) — 25K tokens
**Responsibilities:**
- Design Prisma schema (35+ models across 8 groups)
- Create migrations and seed data (1,600+ records, ₹14.85 Cr)
- Define relationships, indexes, constraints
- Validate data integrity

**Deliverables:**
- `prisma/schema.prisma` (production-ready)
- `prisma/migrations/` (initial migration)
- `prisma/seed.ts` (complete seed data)
- Schema validation tests

**Communication:**
- Publishes: Schema structure → BE, FE, QA
- Receives: Feedback on table structure from BE
- Checkpoint: "Schema complete. Ready for API development."

---

### 2. Backend Engineer (BE) — 40K tokens
**Responsibilities:**
- Implement API routes for all entities (CRUD, filtering, transactions)
- Set up NextAuth.js v5 with 6 roles (super_admin, admin, sales_manager, backoffice, agent, customer)
- Implement RBAC middleware and access control
- Handle business logic (commissions, payments, bookings)
- Integrate BullMQ + Redis for job queues
- Set up request validation with Zod

**Deliverables:**
- `app/api/auth/[...nextauth]/route.ts` (auth setup)
- `middleware.ts` (RBAC enforcement)
- `app/api/leads/`, `/bookings/`, `/projects/`, `/agents/` (CRUD routes)
- Business logic handlers (commission calculation, payment processing)
- API integration tests

**Communication:**
- Consumes: Schema from DA
- Publishes: API spec → FE, QA
- Receives: Frontend requirements from FE
- Checkpoint: "API foundation complete. 15 core endpoints ready. FE can start consuming."

---

### 3. Frontend Engineer (FE) — 45K tokens
**Responsibilities:**
- Build 3 portals (Agent, Customer, Admin)
- Implement 9 modules with responsive UI
- Use Next.js 14, shadcn/ui, Tailwind CSS
- Create forms, dashboards, data tables
- Implement client-side auth flow
- Handle real-time updates (WebSocket/polling)

**Deliverables:**
- **Portal 1 (Agent):** Dashboard, lead management, commission tracker, team hierarchy
- **Portal 2 (Customer):** Dashboard, booking tracker, payment history, documents
- **Portal 3 (Admin):** Dashboard, analytics, user management, configuration
- Component library (reusable UI components)
- UI integration tests

**Communication:**
- Consumes: API spec from BE, schema from DA
- Publishes: UI requirements → BE (API extensions)
- Receives: Test feedback from QA
- Checkpoint: "Agent Portal complete. QA: run integration tests."

---

### 4. QA Engineer (QA) — 25K tokens
**Responsibilities:**
- Write integration & E2E tests
- Validate schema integrity and data relationships
- Test API contract compliance
- Test UI interactions and user flows
- Performance testing (N+1 queries, load testing)
- Security validation (RBAC, auth flows)

**Deliverables:**
- Schema validation tests (`__tests__/schema.test.ts`)
- API contract tests (`__tests__/api.test.ts`)
- Integration tests for each portal
- E2E test suite with Playwright
- Performance & security test reports

**Communication:**
- Consumes: Schema from DA, API from BE, UI from FE
- Publishes: Test results, blockers, readiness sign-off
- Receives: Code fixes from BE/FE when tests fail
- Checkpoint: "Agent Portal: all tests passing. Ready for production."

---

### 5. DevOps Engineer (DO) — 15K tokens
**Responsibilities:**
- Set up Docker and containerization
- Provision Hetzner VPS
- Configure PostgreSQL, Redis, BullMQ
- Set up CI/CD pipeline (GitHub Actions)
- Configure monitoring, logging, alerting
- SSL/TLS setup, environment management

**Deliverables:**
- `Dockerfile` and `docker-compose.yml`
- `.github/workflows/` (CI/CD pipeline)
- Hetzner provisioning script
- Monitoring dashboard setup
- Production deployment guide

**Communication:**
- Receives: Code from BE, FE, QA sign-off
- Publishes: Deployment status, monitoring links
- Coordinates: Final production launch
- Checkpoint: "Infrastructure ready. Deploy Agent Portal to staging."

---

## Communication Protocol

### Phase 1: Foundation (Session 1)
**Timeline:** Sequential with overlap allowed once DA completes schema

1. **DA starts:** Creates schema, migrations, seed data
2. **DA publishes schema:** BE receives table definitions
3. **BE starts:** Implements auth, core API routes (uses schema)
4. **BE publishes API spec:** FE receives endpoint definitions
5. **FE starts:** Builds UI using API specs (mock endpoints initially)
6. **QA starts:** Writes tests for schema, auth, API contracts
7. **All checkpoint:** Schema ✅, Auth ✅, API foundation ✅, UI skeleton ✅

### Phase 2: Portal Development (Sessions 2-10)
**Timeline:** Full parallelization

- **FE builds:** Portal UI + interactions
- **BE extends:** API routes + business logic
- **QA validates:** Integration tests, UI tests, performance tests
- **All checkpoint per portal:** Portal ✅ → Production ready

### Phase 3: Production (Session 11)
**Timeline:** Sequential coordination

1. **DO deploys:** Docker to Hetzner staging
2. **QA smoke tests:** Staging validation
3. **DA validates:** Production schema, backups
4. **DO launches:** Production deployment
5. **All checkpoint:** Live on production ✅

---

## Session-by-Session Breakdown

### Session 1: Foundation (All agents, sequential start)
- **DA:** Prisma schema (35+ models), migrations, seed data (₹14.85 Cr)
- **BE:** NextAuth.js v5, auth routes, core API (leads, bookings, projects, agents)
- **FE:** Layout component, auth UI, dashboard skeleton
- **QA:** Schema + auth + API tests
- **Deliverable:** Production DB, auth working, API foundation, basic UI

### Sessions 2-4: Agent Portal (FE, BE, QA parallel)
- **FE:** Agent dashboard, lead management UI, commission tracker, team view
- **BE:** Lead CRUD API, commission calculations, team routes, filtering
- **QA:** Portal integration tests, UI tests, API performance tests
- **Deliverable:** Full Agent Portal production-ready

### Sessions 5-7: Customer Portal (FE, BE, QA parallel)
- **FE:** Customer dashboard, booking tracker, payment history, document upload
- **BE:** Customer API, booking API, payment tracking, document endpoints
- **QA:** Payment flow tests, security validation, integration tests
- **Deliverable:** Full Customer Portal production-ready

### Sessions 8-10: Admin Portal (FE, BE, QA parallel)
- **FE:** Admin dashboard, analytics, user management, configuration UI
- **BE:** Admin API, reporting endpoints, configuration management
- **QA:** Admin Portal tests, full system integration, load testing
- **Deliverable:** Full Admin Portal production-ready

### Session 11: Production Deployment (DO, QA, DA)
- **DO:** Docker, Hetzner setup, CI/CD, monitoring
- **QA:** Staging smoke tests, production validation
- **DA:** Production schema verification, backup validation
- **Deliverable:** Live on production with monitoring

---

## File Structure

```
clickprops/
├── prisma/
│   ├── schema.prisma          (DA)
│   ├── migrations/            (DA)
│   └── seed.ts                (DA)
├── lib/
│   ├── prisma.ts              (DA + BE)
│   └── auth.ts                (BE)
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts    (BE)
│   │   ├── leads/             (BE)
│   │   ├── bookings/          (BE)
│   │   ├── projects/          (BE)
│   │   └── agents/            (BE)
│   ├── agent/                 (FE Portal 1)
│   ├── customer/              (FE Portal 2)
│   ├── admin/                 (FE Portal 3)
│   └── layout.tsx             (FE)
├── middleware.ts              (BE)
├── __tests__/
│   ├── schema.test.ts         (QA)
│   ├── api.test.ts            (QA)
│   ├── agent-portal.test.ts   (QA)
│   └── e2e.test.ts            (QA)
├── Dockerfile                 (DO)
├── docker-compose.yml         (DO)
├── .github/workflows/         (DO)
├── .env.example               (BE + DO)
└── package.json               (All)
```

---

## Success Criteria

✅ All 35+ Prisma models created, indexed, validated
✅ NextAuth.js v5 with 6 roles working end-to-end
✅ All API CRUD routes implemented with RBAC
✅ 3 portals fully functional (Agent, Customer, Admin)
✅ 9 modules complete across all portals
✅ 100% test coverage on critical paths
✅ Seeded with live data: 6 projects, 34 agents, ₹14.85 Cr revenue
✅ Production deployed to Hetzner with monitoring
✅ Zero critical bugs, performance optimized
✅ Ready for Sri Sai Builders live launch

---

## Token Budget Summary

| Role | Budget | Allocation | Status |
|------|--------|-----------|--------|
| DA (Database Architect) | 25K | Schema, migrations, seed | Pending |
| BE (Backend Engineer) | 40K | Auth, API, business logic | Pending |
| FE (Frontend Engineer) | 45K | 3 portals, 9 modules | Pending |
| QA (QA Engineer) | 25K | Integration, E2E, performance tests | Pending |
| DO (DevOps Engineer) | 15K | Docker, Hetzner, CI/CD, monitoring | Pending |
| **Reserve (fixes, coordination)** | **50K** | Buffer for unforeseen issues | Pending |
| **TOTAL** | **200K** | All work streams | Ready to execute |

---

## Ready to Execute

Dispatch 5 agents to start work according to this orchestration plan.

**Start:** Phase 1, Session 1
**First agents:** DA, BE, FE, QA (in parallel, with DA leading)
**Coordination:** Real-time updates as phases progress
