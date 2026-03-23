# CLAUDE.md — ClickProps_Clone

## Memory File
- **Always** keep `MEMORY.md` up to date after every significant change
- Update it immediately after: new features, bug fixes, status changes, decisions, or completions
- MEMORY.md is the single source of truth for project state
- Before starting any new work, read MEMORY.md first

## Project
- **Name:** ClickProps (Real Estate CRM for Sri Sai Builders)
- **Location:** `C:\Users\TUMMA\OneDrive\Desktop\open code projects\ClickProps_Clone`
- **Stack:** Next.js 14, Prisma, PostgreSQL, NextAuth v4, Redis/BullMQ, Tailwind CSS, Jest, Playwright
- **Deployment Target:** Hetzner VPS

## AI Model Stack
| Role | Model | Responsibility |
|------|-------|---------------|
| DA | Claude Opus 4.6 | Schema, models, migrations, seed |
| BE | GPT-5.4 | Auth, API, business logic |
| FE | Claude Sonnet 4.6 | 3 portals, 9 modules |
| QA | Gemini Flash | Tests, validation |
| DO | DeepSeek V3.2 | Docker, CI/CD, deploy |

## Workflow Rules

### Before Any Work
1. Read `MEMORY.md`
2. Understand current state
3. Plan changes

### After Any Work
1. Update `MEMORY.md` with:
   - What was changed
   - Files modified
   - Status of affected areas
   - Any new issues found
   - Decisions made

### Backend (BE)
- Only touch: `app/api/`, `lib/`, `middleware.ts`
- Never touch: `prisma/schema.prisma` (DA ownership)
- Never touch: frontend pages/components
- Use existing schema only

### Database (DA)
- Owns: `prisma/schema.prisma`, migrations, seed
- BE can suggest schema changes but DA implements them

### Frontend (FE)
- Owns: `app/agent/`, `app/customer/`, `app/admin/`, `components/`
- Uses existing API contracts from BE

## Quick Commands

```bash
# Start local services
docker compose up -d postgres redis

# Sync database
DATABASE_URL="postgresql://clickprops:clickprops_dev@localhost:5432/clickprops?schema=public" npx prisma db push

# Start dev
npm run dev

# Build
npm run build

# Type check
npx tsc --noEmit
```

## Test Credentials
- Email: `admin@clickprops.local`
- Password: `Admin@123`
