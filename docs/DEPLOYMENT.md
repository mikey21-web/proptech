# ClickProps CRM Deployment Guide

Complete guide for deploying ClickProps to Hetzner VPS using Docker.

## Prerequisites

- Hetzner VPS (Ubuntu 22.04, 4GB+ RAM)
- Domain name with DNS access
- SSH access to VPS
- Docker & Docker Compose installed locally
- GitHub personal access token (for private registry)

## First-Time Server Setup

### 1. SSH into VPS
```bash
ssh root@your.vps.ip.address
```

### 2. Install Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
apt install -y git

# Test installation
docker --version
docker-compose --version
```

### 3. Clone Repository
```bash
cd /opt
git clone https://github.com/your-org/clickprops.git
cd clickprops
```

### 4. Configure Environment
```bash
# Copy example
cp .env.example .env.local

# Edit with production values
nano .env.local
```

**Critical Production Settings:**
```env
NODE_ENV=production
NEXTAUTH_SECRET="generate-new-secret"
NEXTAUTH_URL="https://your-domain.com"
DATABASE_URL="postgresql://user:pass@db:5432/clickprops"
REDIS_URL="redis://redis:6379"
LOG_LEVEL=warn
```

### 5. Set Up SSL Certificate
```bash
# Using Let's Encrypt with Certbot
apt install -y certbot python3-certbot-nginx

# Generate certificate
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Certificate stored in:
# /etc/letsencrypt/live/your-domain.com/
```

### 6. Configure Nginx
```bash
# Create nginx config
cat > /etc/nginx/sites-available/clickprops << 'EOF'
upstream app {
  server app:3000;
}

server {
  listen 80;
  server_name your-domain.com www.your-domain.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name your-domain.com www.your-domain.com;

  ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  location / {
    proxy_pass http://app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  location /health {
    access_log off;
    proxy_pass http://app;
  }
}
EOF

# Enable config
ln -s /etc/nginx/sites-available/clickprops /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 7. Start Services
```bash
docker-compose -f docker-compose.prod.yml up -d

# Verify services running
docker-compose ps

# Check logs
docker-compose logs -f app
```

### 8. Run Migrations
```bash
docker-compose exec app npx prisma migrate deploy

# Seed database (optional)
docker-compose exec app npx prisma db seed
```

### 9. Health Check
```bash
curl https://your-domain.com/api/health

# Expected response:
# {"status":"healthy","database":"ok","redis":"ok"}
```

---

## Database Migrations

### Pre-Deployment (on Dev)
```bash
# Create new migration
npx prisma migrate dev --name add_new_field

# Review migration file
cat prisma/migrations/*/migration.sql

# Commit to git
git add prisma/migrations/
git commit -m "add migration: add_new_field"
```

### Production Deployment
```bash
# On VPS after git pull
docker-compose exec app npx prisma migrate deploy

# Verify migration ran
docker-compose exec app npx prisma migrate status

# Rollback (if needed — caution!)
docker-compose exec db psql -U clickprops -d clickprops << SQL
DELETE FROM "_prisma_migrations" WHERE name = 'migration_name';
SQL
```

---

## Docker Build & Push

### Build Production Image
```bash
# Build locally
docker build -t clickprops:v1.0.0 .

# Tag for registry
docker tag clickprops:v1.0.0 ghcr.io/your-org/clickprops:v1.0.0
docker tag clickprops:v1.0.0 ghcr.io/your-org/clickprops:latest

# Login to registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Push image
docker push ghcr.io/your-org/clickprops:v1.0.0
docker push ghcr.io/your-org/clickprops:latest
```

### On VPS (Pull & Deploy)
```bash
# Login to registry
docker login ghcr.io

# Pull latest image
docker pull ghcr.io/your-org/clickprops:latest

# Update docker-compose.prod.yml
# Change: image: clickprops:latest
# To: image: ghcr.io/your-org/clickprops:latest

# Restart service
docker-compose -f docker-compose.prod.yml up -d --no-deps app

# Verify update
docker-compose ps
curl https://your-domain.com/api/health
```

---

## Monitoring Setup

### Enable Prometheus Metrics
```bash
# Metrics available at
curl https://your-domain.com/api/metrics

# Prometheus scrape config
cat >> /etc/prometheus/prometheus.yml << 'EOF'
  - job_name: 'clickprops'
    static_configs:
      - targets: ['localhost:443']
    scheme: 'https'
    tls_config:
      insecure_skip_verify: true
EOF

systemctl restart prometheus
```

### Import Grafana Dashboard
1. Open Grafana: https://your-grafana.com
2. Dashboard → Import
3. Upload: `monitoring/grafana-dashboard.json`
4. Select Prometheus as datasource

### Health Check
```bash
# API health endpoint
curl https://your-domain.com/api/health

# Response:
# {
#   "status": "healthy",
#   "database": "ok",
#   "redis": "ok",
#   "uptime": 12345
# }
```

---

## Database Backups

### Automated Daily Backups
```bash
# Create backup script
cat > /opt/clickprops/scripts/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/clickprops/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T db pg_dump -U clickprops clickprops > "$BACKUP_DIR/backup_$DATE.sql"
find "$BACKUP_DIR" -name "backup_*.sql" -mtime +30 -delete
EOF

chmod +x /opt/clickprops/scripts/backup-db.sh

# Add to crontab (runs daily at 2 AM)
crontab -e
# Add line:
# 0 2 * * * /opt/clickprops/scripts/backup-db.sh
```

### Manual Backup
```bash
docker-compose exec db pg_dump -U clickprops clickprops > backup.sql

# Verify backup
ls -lh backup.sql
```

### Restore from Backup
```bash
# Stop services
docker-compose down

# Restore database
docker-compose up -d db
docker-compose exec db psql -U clickprops clickprops < backup.sql

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Verify
curl https://your-domain.com/api/health
```

---

## Rollback Procedure

### Quick Rollback (Previous Image)
```bash
# Check available images
docker images

# Revert to previous image tag
docker pull ghcr.io/your-org/clickprops:v1.0.1

# Update docker-compose.prod.yml
sed -i 's/image: ghcr.io\/your-org\/clickprops:.*/image: ghcr.io\/your-org\/clickprops:v1.0.1/' docker-compose.prod.yml

# Restart
docker-compose -f docker-compose.prod.yml up -d --no-deps app

# Verify
curl https://your-domain.com/api/health
```

### Rollback Database Schema
```bash
# If migration caused data loss, restore from backup
./scripts/restore-db.sh backup_20240318_020000.sql

# Verify data restored
docker-compose exec app npx prisma studio
```

---

## Performance Tuning

### PostgreSQL Optimization
```sql
-- In docker-compose.prod.yml, add to db service:
environment:
  POSTGRES_INITDB_ARGS: "-c shared_buffers=256MB -c effective_cache_size=1GB"
```

### Redis Optimization
```bash
# Monitor Redis
docker-compose exec redis redis-cli info memory

# Clear cache if needed
docker-compose exec redis redis-cli FLUSHALL
```

### Application Scaling
```yaml
# docker-compose.prod.yml
services:
  app:
    deploy:
      replicas: 2  # Run 2 instances
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

---

## SSL Certificate Renewal

### Automatic Renewal
```bash
# Certbot auto-renewal every 60 days
systemctl enable certbot.timer
systemctl start certbot.timer

# Check renewal status
certbot renew --dry-run
```

### Manual Renewal
```bash
certbot renew
systemctl restart nginx
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Check app logs: `docker-compose logs app` |
| SSL certificate error | Renew cert: `certbot renew` |
| Database connection failed | Ensure db container running: `docker-compose ps` |
| Out of disk space | Check: `df -h`, clean old backups/images |
| High CPU usage | Check app logs, monitor Redis/PostgreSQL |
| Migration failed | Rollback: `docker-compose down`, restore backup |

---

## Monitoring Checklist

- [ ] Health check passing: `/api/health`
- [ ] SSL certificate valid: `curl -I https://your-domain.com`
- [ ] Prometheus scraping metrics
- [ ] Grafana dashboard displaying data
- [ ] Backup script running daily
- [ ] Log aggregation working
- [ ] Database replication (if multi-node)

---

## Post-Deployment

1. **Update DNS** → Point domain to VPS IP
2. **Verify HTTPS** → https://your-domain.com loads
3. **Create admin user** → Via `/docs/QUICKSTART.md`
4. **Test login** → Verify authentication works
5. **Monitor metrics** → Check Grafana dashboard
6. **Plan backups** → Ensure daily backup running

**Deployment complete!** 🚀
