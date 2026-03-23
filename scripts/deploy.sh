#!/bin/bash
set -e

# ClickProps CRM Deployment Script
# Usage: ./scripts/deploy.sh [environment]

ENV="${1:-production}"
PROJECT_DIR="/opt/clickprops"
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 ClickProps CRM Deployment - $ENV environment"
echo "=========================================="

cd "$PROJECT_DIR" || exit 1

# Validate environment
if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "❌ Compose file $COMPOSE_FILE not found"
    exit 1
fi

# Check for required env files
if [[ ! -f ".env" ]]; then
    echo "⚠️  .env file not found. Using defaults from compose file."
fi

# Pull latest changes if in git repo
if [[ -d ".git" ]]; then
    echo "📥 Pulling latest code..."
    git fetch origin
    git reset --hard origin/main
fi

# Login to container registry (if using private registry)
if [[ -n "$DOCKER_REGISTRY_USER" && -n "$DOCKER_REGISTRY_PASSWORD" ]]; then
    echo "🔐 Logging into container registry..."
    echo "$DOCKER_REGISTRY_PASSWORD" | docker login "$DOCKER_REGISTRY" -u "$DOCKER_REGISTRY_USER" --password-stdin
fi

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker compose -f "$COMPOSE_FILE" pull

# Stop existing services (zero-downtime approach)
echo "⚙️  Stopping services..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans

# Start services
echo "🚀 Starting services..."
docker compose -f "$COMPOSE_FILE" up -d --wait app worker

# Run database migrations
echo "🗄️  Running database migrations..."
docker compose -f "$COMPOSE_FILE" exec -T app npx prisma migrate deploy

# Seed data if needed (first deploy)
if [[ "$ENV" == "production" && -n "$SEED_ON_DEPLOY" ]]; then
    echo "🌱 Seeding database..."
    docker compose -f "$COMPOSE_FILE" exec -T app npx prisma db seed
fi

# Health check
echo "🏥 Performing health check..."
for i in $(seq 1 10); do
    if curl -sf http://localhost:3000/api/health > /dev/null; then
        echo "✅ Health check passed"
        break
    fi
    if [[ $i -eq 10 ]]; then
        echo "❌ Health check failed after 10 attempts"
        docker compose -f "$COMPOSE_FILE" logs app
        exit 1
    fi
    sleep 5
done

# Clean up old images
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo "✅ Deployment completed successfully!"
echo "🌐 Application URL: http://$(hostname -I | awk '{print $1}')"
echo "📊 Grafana dashboard: http://$(hostname -I | awk '{print $1}'):3001"

# Show running services
echo "🔍 Running services:"
docker compose -f "$COMPOSE_FILE" ps
