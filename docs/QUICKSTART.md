# ClickProps CRM Quick Start Guide

Get ClickProps running locally in 5 minutes.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose (recommended)
- Git
- PostgreSQL 15 (if running without Docker)

## Quick Setup (Docker — Recommended)

```bash
# 1. Clone repository
git clone https://github.com/your-org/clickprops.git
cd clickprops

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your values (see below)

# 3. Start services (PostgreSQL + Redis + App)
docker compose up -d

# 4. Run migrations
docker compose exec app npx prisma migrate deploy

# 5. Seed database (optional — adds sample data)
docker compose exec app npx prisma db seed

# 6. Open browser
# App running at http://localhost:3000
```

## Local Setup (Without Docker)

```bash
# 1. Install dependencies
npm install

# 2. Configure database
# Create PostgreSQL database manually:
# createdb -U postgres clickprops
# OR set DATABASE_URL in .env.local

# 3. Start Redis (separate terminal)
redis-server

# 4. Generate Prisma client
npx prisma generate

# 5. Run migrations
npx prisma migrate dev

# 6. Seed database
npx prisma db seed

# 7. Start development server
npm run dev

# App running at http://localhost:3000
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://clickprops:password@localhost:5432/clickprops?schema=public"
POSTGRES_USER=clickprops
POSTGRES_PASSWORD=your_secure_password

# Cache (Redis)
REDIS_URL=redis://localhost:6379

# Auth
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# Application
NODE_ENV=development
LOG_LEVEL=info
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

## Create First Admin User

### Via Command Line
```bash
npx ts-node scripts/create-user.ts \
  --email admin@clickprops.com \
  --password your_password \
  --name "Admin User" \
  --role admin
```

### Via Database (Manual)
```sql
INSERT INTO "User" (id, email, name, password, "orgId", status, "createdAt", "updatedAt")
VALUES (
  'user-001',
  'admin@clickprops.com',
  'Admin User',
  '$2b$10$...bcrypt_hash...',
  'org-001',
  'active',
  NOW(),
  NOW()
);

-- Create organization first:
INSERT INTO "Organization" (id, name, domain)
VALUES ('org-001', 'Sri Sai Builders', 'srisaibuilders.com');

-- Assign admin role
INSERT INTO "Role" (id, name, "orgId", "isSystem")
VALUES ('role-001', 'admin', 'org-001', true);

INSERT INTO "UserRole" ("userId", "roleId")
VALUES ('user-001', 'role-001');
```

## Login & Explore

1. **Open App:** http://localhost:3000
2. **Login Credentials:**
   - Email: `admin@clickprops.com`
   - Password: (from setup above)
3. **Dashboard:** View org overview
4. **Leads:** Create and manage leads
5. **Projects:** View projects and inventory
6. **Bookings:** Create and track bookings
7. **Agents:** Manage sales team
8. **Payments:** Record and track payments

## Seed Data Included

Running `npx prisma db seed` creates sample data:

- **6 Projects:** Sri Sai Gardens, Trinity Heights, Skyline Plaza, etc.
- **34 Agents:** Sales team across projects
- **100+ Leads:** In various statuses (new, contacted, qualified, won)
- **50+ Bookings:** With payments and installments
- **Sample Users:** Admin, Sales Manager, Backoffice, Agents

## Common Commands

```bash
# View logs
docker compose logs -f app

# Access database
docker compose exec db psql -U clickprops -d clickprops

# Stop services
docker compose down

# Reset database (dev only — WARNING: deletes all data)
npx prisma migrate reset

# Generate new migration
npx prisma migrate dev --name add_new_field

# View schema (browser UI)
npx prisma studio
```

## Prisma Studio (Browser Database UI)

```bash
npx prisma studio
# Opens http://localhost:5555
```

Browse and edit database directly in browser.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `lsof -i :3000` then kill process, or change PORT env var |
| Database connection error | Check DATABASE_URL format and PostgreSQL is running |
| Redis connection error | Ensure Redis running on localhost:6379 or update REDIS_URL |
| Migration fails | Delete prisma/migrations/lock.json and try again |
| Build fails | Run `npm install` again, clear .next folder |

## Architecture Overview

```
ClickProps CRM
├── Frontend (Next.js + React)
│   ├── Dashboard
│   ├── Leads Management
│   ├── Bookings & Payments
│   ├── Projects & Inventory
│   └── Agent Commission Tracking
├── Backend (Next.js API Routes)
│   ├── /api/auth — Authentication
│   ├── /api/leads — Lead management
│   ├── /api/bookings — Booking lifecycle
│   ├── /api/projects — Project management
│   ├── /api/agents — Agent management
│   └── /api/payments — Payment processing
├── Database (PostgreSQL)
│   └── 35+ tables with full audit trail
├── Cache (Redis)
│   └── Session & performance caching
└── Monitoring
    ├── /api/health — Health checks
    └── /api/metrics — Prometheus metrics
```

## Next Steps

1. **Read API Documentation** → `/docs/API.md`
2. **Understand Authentication** → `/docs/AUTH.md`
3. **Database Schema** → `/docs/SCHEMA.md`
4. **Deployment** → `/docs/DEPLOYMENT.md`

## Support

- Check logs: `docker compose logs app`
- Database issues: `npx prisma studio`
- API testing: Use Postman or curl
- Enable debug: Set `DEBUG=*` environment variable

Happy selling! 🎉
