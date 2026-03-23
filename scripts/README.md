# ClickProps CRM - Infrastructure Scripts

This directory contains deployment and infrastructure management scripts for ClickProps CRM.

## Scripts

### `deploy.sh`
**Purpose:** Full deployment script for production/staging environments  
**Usage:** `./scripts/deploy.sh [environment]`  
**Environment:** `production` (default) or `staging`  
**Prerequisites:**
- Docker and Docker Compose installed
- `.env` file configured
- Git repository cloned at `/opt/clickprops`

**Features:**
- Zero-downtime deployment
- Database migration handling
- Health checks with automatic rollback
- Docker image cleanup
- Multi-environment support

### `backup.sh`
**Purpose:** Database backup and restore management  
**Usage:** `./scripts/backup.sh [backup_directory]`  
**Default backup directory:** `/opt/clickprops/backups`  
**Features:**
- Automatic backup rotation (7-day retention)
- Support for local Docker and remote PostgreSQL
- Backup verification
- Restore instructions generation
- Compressed backups (.sql.gz)

### `setup-hetzner.sh`
**Purpose:** Initial VPS setup for Hetzner Ubuntu servers  
**Usage:** Run on fresh Hetzner Ubuntu 22.04 instance  
**Prerequisites:** Root access to a fresh Ubuntu server  
**Installs:**
- Docker and Docker Compose
- Nginx with SSL (Let's Encrypt)
- PostgreSQL client tools
- Redis tools
- Firewall (UFW) configuration
- Systemd service for auto-start
- Cron jobs for backups and maintenance

### `start-workers.js`
**Purpose:** Start BullMQ background workers for runtime automation  
**Usage:** `node scripts/start-workers.js` or `npm run workers:start`  
**Processes:**
- WhatsApp queue
- Email queue
- PDF/receipt artifact queue
- Notification queue
- Transcription placeholder queue

### `monitoring-setup.sh` *(planned)*
**Purpose:** Deploy monitoring stack (Prometheus, Grafana, Loki, Alertmanager)  
**Status:** Integrated into `docker-compose.prod.yml`

## Deployment Workflow

### 1. Initial Server Setup
```bash
# On fresh Hetzner Ubuntu 22.04 server
wget https://raw.githubusercontent.com/YOUR_USERNAME/ClickProps_Clone/main/scripts/setup-hetzner.sh
chmod +x setup-hetzner.sh
sudo ./setup-hetzner.sh
```

### 2. Configure Environment
```bash
cd /opt/clickprops
cp .env.example .env
# Edit .env with your database credentials, secrets, and domain
nano .env
```

### 3. Deploy Application
```bash
cd /opt/clickprops
./scripts/deploy.sh
```

### 4. Regular Maintenance
```bash
# Manual backup
./scripts/backup.sh

# View logs
tail -f logs/app/*.log

# Monitor services
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f

# Access Grafana dashboard (if monitoring enabled)
# http://your-server-ip:3001
```

## CI/CD Integration

The scripts are designed to work with GitHub Actions workflows:

1. **CI Pipeline** (`.github/workflows/ci.yml`):
   - Runs on every push/PR
   - Tests lint, typecheck, unit tests, E2E tests
   - Builds the application

2. **Deployment Pipeline** (`.github/workflows/deploy.yml`):
   - Runs on push to `main` branch
   - Builds and pushes Docker image to GitHub Container Registry
   - Deploys to Hetzner VPS using SSH
   - Zero-downtime deployment with health checks

3. **Security Scan** (`.github/workflows/security-scan.yml`):
   - Daily vulnerability scanning
   - Container image security analysis
   - Dependency vulnerability checks
   - Secret detection

## Environment Variables

Key environment variables needed for deployment:

```bash
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/clickprops
POSTGRES_USER=clickprops
POSTGRES_PASSWORD=secure_password_here

# Redis
REDIS_URL=redis://redis:6379

# NextAuth
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=https://your-domain.com

# Email (for alerts and notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Payment gateways (if enabled)
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Monitoring
GRAFANA_PASSWORD=admin_password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERT_EMAIL=admin@your-domain.com
```

## Troubleshooting

### Common Issues

1. **Deployment fails with health check**
   ```bash
   # Check app logs
   docker compose -f docker-compose.prod.yml logs app
   
   # Check database connection
   docker compose -f docker-compose.prod.yml exec postgres pg_isready
   
   # Manual health check
   curl -v http://localhost:3000/api/health
   ```

2. **Database migration failures**
   ```bash
   # View migration status
   docker compose -f docker-compose.prod.yml exec app npx prisma migrate status
   
   # Apply specific migration
   docker compose -f docker-compose.prod.yml exec app npx prisma migrate resolve --applied "migration_name"
   ```

3. **SSL certificate issues**
   ```bash
   # Renew certificate
   certbot renew --nginx
   
   # Check nginx config
   nginx -t
   ```

4. **Disk space issues**
   ```bash
   # Clean old Docker images
   docker image prune -a
   
   # Clean old backups
   find /opt/clickprops/backups -name "*.sql.gz" -mtime +30 -delete
   ```

## Monitoring & Observability

The deployment includes:
- **Prometheus** for metrics collection
- **Grafana** for dashboards (port 3001)
- **Loki** for log aggregation
- **Alertmanager** for notifications
- **Node/Postgres/Redis exporters** for infrastructure metrics

Access Grafana at `http://your-server-ip:3001` (default credentials: admin/admin)

## Backup & Recovery

### Backup Schedule
- Automatic daily backups at 2 AM (via cron)
- 7-day retention policy
- Manual backups via `./scripts/backup.sh`

### Restore Process
```bash
# Stop application
docker compose -f docker-compose.prod.yml down

# Restore from backup
gunzip -c /opt/clickprops/backups/clickprops_backup_20250101_020000.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U clickprops

# Start application
docker compose -f docker-compose.prod.yml up -d
```

## Security Notes

1. **Never commit `.env` files** to version control
2. **Use strong passwords** for database and admin accounts
3. **Enable firewall** (UFW) to restrict access
4. **Regularly update** system packages and Docker images
5. **Monitor security alerts** from GitHub Actions security scans
6. **Rotate secrets** periodically (NEXTAUTH_SECRET, database passwords)

## Support

For issues:
1. Check logs in `/opt/clickprops/logs/`
2. Review GitHub Actions workflow runs
3. Consult the ClickProps documentation
4. Open an issue on GitHub repository
