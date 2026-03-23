# ClickProps CRM

Real Estate CRM for Sri Sai Builders.

![CI](https://github.com/your-org/clickprops/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/your-org/clickprops/actions/workflows/deploy.yml/badge.svg)

## Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Auth:** NextAuth.js
- **Deployment:** Docker, Hetzner VPS, Nginx, Let's Encrypt

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development without Docker)
- Git

## Quick Start (Local Development)

```bash
# Clone the repository
git clone https://github.com/your-org/clickprops.git
cd clickprops

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Start all services with Docker
docker compose up -d

# Run database migrations
docker compose exec app npx prisma migrate deploy

# Seed the database (optional)
docker compose exec app npx prisma db seed

# App is running at http://localhost:3000
```

## Development Without Docker

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

## Building Docker Image

```bash
# Build production image
docker build -t clickprops:latest .

# Run the image
docker run -p 3000:3000 --env-file .env.local clickprops:latest
```

## Deployment to Hetzner VPS

### First-Time Server Setup

1. SSH into your Hetzner VPS
2. Install Docker and Docker Compose
3. Clone the repository to `/opt/clickprops`
4. Copy `.env.example` to `.env.local` and configure production values
5. Set up SSL: `./scripts/setup-ssl.sh your-domain.com`
6. Start services: `docker compose -f docker-compose.prod.yml up -d`

### Automated Deployment

Push to `main` branch triggers automatic deployment via GitHub Actions.

### Manual Deployment

```bash
export HETZNER_IP=your.vps.ip
export HETZNER_USER=root
export IMAGE_TAG=latest
./scripts/deploy-hetzner.sh
```

### Rollback

The deployment script automatically rolls back on health check failure. For manual rollback:

```bash
ssh root@your-vps "cd /opt/clickprops && export IMAGE_TAG=previous-tag && docker compose -f docker-compose.prod.yml up -d --no-deps app"
```

## Database Backups

Automated daily backups via cron:

```bash
# Add to crontab on VPS
0 2 * * * /opt/clickprops/scripts/backup-db.sh
```

30-day retention. Backups stored in `/opt/clickprops/backups/`.

## Monitoring

- **Health Check:** `GET /api/health` - Returns application and dependency status
- **Metrics:** `GET /api/metrics` - Prometheus-compatible metrics
- **Grafana Dashboard:** Import `monitoring/grafana-dashboard.json`
- **Logs:** JSON-structured logs via Winston, collected by Docker log driver

## Project Structure

```
clickprops/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── auth/           # NextAuth endpoints
│   │   ├── health/         # Health check endpoint
│   │   └── metrics/        # Prometheus metrics
│   ├── layout.tsx
│   └── page.tsx
├── lib/                    # Shared utilities
│   └── logger.ts           # Winston logger
├── prisma/                 # Database schema & migrations
├── __tests__/              # Jest tests
├── scripts/                # Deployment & maintenance scripts
├── monitoring/             # Grafana & Prometheus config
├── nginx/                  # Nginx reverse proxy config
├── Dockerfile              # Multi-stage production build
├── docker-compose.yml      # Local development
├── docker-compose.prod.yml # Production deployment
└── .github/workflows/      # CI/CD pipelines
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Docker build fails | Ensure `output: 'standalone'` is in `next.config.js` |
| Database connection refused | Check `DATABASE_URL` and ensure PostgreSQL is running |
| Health check failing | Verify DB and Redis are accessible from app container |
| SSL certificate issues | Run `./scripts/setup-ssl.sh` and ensure port 80 is open |
| Migration errors | Run `npx prisma migrate reset` (dev only) or check migration files |
