#!/bin/bash
set -e

# ClickProps CRM Hetzner VPS Setup Script
# Usage: Run on fresh Hetzner Ubuntu 22.04 server

echo "🖥️  ClickProps CRM Hetzner VPS Setup"
echo "===================================="

# Update system
echo "🔄 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt install -y \
    curl \
    git \
    docker.io \
    docker-compose \
    nginx \
    certbot \
    python3-certbot-nginx \
    postgresql-client \
    redis-tools \
    htop \
    ufw

# Configure firewall
echo "🛡️  Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Configure Docker
echo "🐳 Configuring Docker..."
usermod -aG docker $USER
systemctl enable docker
systemctl start docker

# Create project directory
echo "📁 Creating project directory..."
mkdir -p /opt/clickprops/{backups,logs,nginx/ssl}
chmod 755 /opt/clickprops

# Clone repository (if not already)
if [[ ! -d "/opt/clickprops/.git" ]]; then
    echo "📥 Cloning ClickProps repository..."
    git clone https://github.com/YOUR_USERNAME/ClickProps_Clone.git /opt/clickprops
else
    echo "📁 Repository already exists at /opt/clickprops"
fi

cd /opt/clickprops

# Create environment file if not exists
if [[ ! -f ".env" ]]; then
    echo "📄 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual values!"
fi

# Create nginx config
echo "🌐 Setting up Nginx configuration..."
cat > /etc/nginx/sites-available/clickprops << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name YOUR_DOMAIN.com;
    
    ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/clickprops /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Setup SSL certificate
echo "🔐 Setting up SSL certificate..."
read -p "Enter your domain name (e.g., clickprops.example.com): " DOMAIN
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN

# Setup systemd service for auto-start
echo "⚙️  Creating systemd service..."
cat > /etc/systemd/system/clickprops.service << 'EOF'
[Unit]
Description=ClickProps CRM
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/clickprops
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable clickprops.service

# Create cron jobs
echo "⏰ Setting up cron jobs..."
# Daily backup at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/clickprops/scripts/backup.sh >> /opt/clickprops/logs/backup.log 2>&1") | crontab -
# Log rotation weekly
(crontab -l 2>/dev/null; echo "0 0 * * 0 docker exec clickprops-app prune-logs") | crontab -

# Create log directories
mkdir -p /opt/clickprops/logs/{app,nginx,postgres,redis}
chmod 755 /opt/clickprops/logs

echo "✅ Setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit /opt/clickprops/.env with your database credentials and secrets"
echo "2. Run: cd /opt/clickprops && ./scripts/deploy.sh"
echo "3. Access your CRM at: https://$DOMAIN"
echo "4. Grafana dashboard at: https://$DOMAIN:3001"
echo ""
echo "🔧 Useful commands:"
echo "  sudo systemctl start clickprops    # Start services"
echo "  sudo systemctl stop clickprops     # Stop services"
echo "  sudo systemctl status clickprops   # Check status"
echo "  tail -f /opt/clickprops/logs/app/* # View logs"
echo ""
echo "🚀 Happy deploying!"