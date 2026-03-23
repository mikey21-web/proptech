#!/bin/bash
set -euo pipefail

# ============================================
# ClickProps - Hetzner VPS Deployment Script
# ============================================

# Configuration
HETZNER_IP="${HETZNER_IP:?Set HETZNER_IP environment variable}"
HETZNER_USER="${HETZNER_USER:-root}"
REMOTE_DIR="/opt/clickprops"
COMPOSE_FILE="docker-compose.prod.yml"
IMAGE_TAG="${IMAGE_TAG:-latest}"
HEALTH_URL="http://localhost:3000/api/health"
MAX_RETRIES=10
RETRY_INTERVAL=5

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }
err() { log "ERROR: $1" >&2; }

# SSH helper
ssh_cmd() {
  ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "${HETZNER_USER}@${HETZNER_IP}" "$@"
}

log "Starting deployment to ${HETZNER_IP}..."

# Step 1: Save current image tag for rollback
log "Saving current state for rollback..."
PREV_TAG=$(ssh_cmd "cd ${REMOTE_DIR} && grep 'IMAGE_TAG=' .env 2>/dev/null | cut -d= -f2 || echo 'none'")
log "Previous image tag: ${PREV_TAG}"

# Step 2: Pull latest code
log "Pulling latest code..."
ssh_cmd "cd ${REMOTE_DIR} && git pull origin main"

# Step 3: Pull latest Docker image
log "Pulling Docker image (tag: ${IMAGE_TAG})..."
ssh_cmd "cd ${REMOTE_DIR} && export IMAGE_TAG=${IMAGE_TAG} && docker compose -f ${COMPOSE_FILE} pull app"

# Step 4: Deploy with zero downtime
log "Deploying new version..."
ssh_cmd "cd ${REMOTE_DIR} && export IMAGE_TAG=${IMAGE_TAG} && docker compose -f ${COMPOSE_FILE} up -d --no-deps --wait app"

# Step 5: Run database migrations
log "Running database migrations..."
ssh_cmd "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} exec -T app npx prisma migrate deploy"

# Step 6: Health check
log "Running health checks..."
HEALTHY=false
for i in $(seq 1 ${MAX_RETRIES}); do
  if ssh_cmd "curl -sf ${HEALTH_URL}" > /dev/null 2>&1; then
    log "Health check passed (attempt ${i}/${MAX_RETRIES})"
    HEALTHY=true
    break
  fi
  log "Health check attempt ${i}/${MAX_RETRIES} failed, retrying in ${RETRY_INTERVAL}s..."
  sleep ${RETRY_INTERVAL}
done

# Step 7: Rollback on failure
if [ "${HEALTHY}" = false ]; then
  err "Health checks failed after ${MAX_RETRIES} attempts!"
  log "Rolling back to previous version (${PREV_TAG})..."
  ssh_cmd "cd ${REMOTE_DIR} && export IMAGE_TAG=${PREV_TAG} && docker compose -f ${COMPOSE_FILE} up -d --no-deps app"

  # Verify rollback
  sleep 10
  if ssh_cmd "curl -sf ${HEALTH_URL}" > /dev/null 2>&1; then
    log "Rollback successful"
  else
    err "Rollback also failed! Manual intervention required."
  fi
  exit 1
fi

# Step 8: Cleanup
log "Cleaning up old images..."
ssh_cmd "docker image prune -f"

log "Deployment complete! ClickProps is live at https://${HETZNER_IP}"
