#!/bin/bash
set -euo pipefail

# ============================================
# ClickProps - SSL Certificate Setup
# Uses Let's Encrypt via Certbot
# ============================================

DOMAIN="${1:?Usage: $0 <domain> [email]}"
EMAIL="${2:-admin@${DOMAIN}}"
NGINX_DIR="$(dirname "$0")/../nginx"

echo "Setting up SSL for domain: ${DOMAIN}"

# Create SSL directory
mkdir -p "${NGINX_DIR}/ssl"

# Initial certificate request using standalone mode
docker run --rm -it \
  -v "${NGINX_DIR}/ssl:/etc/letsencrypt" \
  -v "/var/www/certbot:/var/www/certbot" \
  -p 80:80 \
  certbot/certbot certonly \
    --standalone \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}"

echo "SSL certificate generated successfully!"
echo "Certificate location: ${NGINX_DIR}/ssl/live/${DOMAIN}/"
echo ""
echo "Update nginx.conf server_name to: ${DOMAIN}"
echo "Update ssl_certificate paths to use: /etc/nginx/ssl/live/${DOMAIN}/"
echo ""
echo "Auto-renewal is handled by the certbot container in docker-compose.prod.yml"
