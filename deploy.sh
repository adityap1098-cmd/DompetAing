#!/bin/bash
# ══════════════════════════════════════════════════════════
# DompetAing — Deploy Script
#
# Usage:
#   ./deploy.sh              # Full: pull → build → migrate → restart
#   ./deploy.sh --build      # Build images only
#   ./deploy.sh --migrate    # Run migrations only
#   ./deploy.sh --restart    # Restart containers only
#   ./deploy.sh --ssl-init   # First-time SSL via certbot
#   ./deploy.sh --status     # Container status
#   ./deploy.sh --logs       # Tail all logs
#   ./deploy.sh --logs api   # Tail API logs only
# ══════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $1"; }
err()  { echo -e "${RED}[deploy]${NC} $1" >&2; }

cd "$(dirname "$0")"

# ── Checks ──
check_env() {
    if [ ! -f .env.production ]; then
        err ".env.production not found!"
        err "Copy template dan isi semua values terlebih dahulu."
        exit 1
    fi
    # Cek ada nilai yang masih xxx
    if grep -q "=xxx$" .env.production; then
        warn "Ada env vars yang masih 'xxx' di .env.production — pastikan sudah diisi sebelum production."
    fi
    log "✓ .env.production ready"
}

# ── Pull ──
pull() {
    log "Pulling latest code..."
    git pull --rebase origin main 2>/dev/null || warn "Git pull skipped"
    log "✓ Code up to date"
}

# ── Build ──
build() {
    log "Building Docker images..."
    # DB_PASSWORD dibutuhkan docker-compose.yml
    export $(grep '^DB_PASSWORD=' .env.production | xargs)
    docker compose --env-file .env.production build --parallel
    log "✓ Images built"
}

# ── Migrate ──
migrate() {
    log "Running database migrations..."
    # Pastikan postgres jalan
    export $(grep '^DB_PASSWORD=' .env.production | xargs)
    docker compose --env-file .env.production up -d postgres
    # Tunggu healthy
    log "Waiting for postgres..."
    for i in $(seq 1 15); do
        if docker compose --env-file .env.production exec -T postgres pg_isready -U dompetaing -d dompetaing >/dev/null 2>&1; then
            break
        fi
        sleep 2
    done

    # Jalankan migrate deploy di container api (one-off)
    docker compose --env-file .env.production run --rm api \
        sh -c "cd /app/apps/api && npx prisma migrate deploy"

    log "✓ Migrations applied"
}

# ── Restart ──
restart() {
    log "Starting all containers..."
    export $(grep '^DB_PASSWORD=' .env.production | xargs)
    docker compose --env-file .env.production up -d
    log "Waiting for API health..."
    sleep 5
    for i in $(seq 1 20); do
        if docker compose --env-file .env.production exec -T api wget -qO- http://localhost:3001/v1/health >/dev/null 2>&1; then
            log "✓ API healthy"
            return
        fi
        sleep 3
    done
    warn "API health check timed out — cek: ./deploy.sh --logs api"
}

# ── Full Deploy ──
deploy() {
    check_env
    pull
    build
    migrate
    restart

    echo ""
    log "══════════════════════════════════════════"
    log "  🚀 DompetAing deployed!"
    log "  Web: https://dompetaing.usahasukses.net"
    log "  API: https://api.dompetaing.usahasukses.net"
    log "══════════════════════════════════════════"
    echo ""
    status
}

# ── SSL Init ──
ssl_init() {
    check_env
    export $(grep '^DB_PASSWORD=' .env.production | xargs)

    log "Starting nginx for ACME challenge..."
    docker compose --env-file .env.production up -d nginx

    log "Requesting SSL certificate..."
    docker compose --env-file .env.production run --rm certbot certonly \
        --webroot -w /var/www/certbot \
        --email admin@usahasukses.net \
        --agree-tos \
        --no-eff-email \
        -d dompetaing.usahasukses.net \
        -d api.dompetaing.usahasukses.net

    log "✓ SSL certificate obtained!"
    echo ""
    log "Langkah selanjutnya:"
    log "  1. Edit nginx.conf:"
    log "     - Uncomment kedua blok HTTPS (web + API)"
    log "     - Hapus blok 'SEBELUM SSL' di server HTTP"
    log "     - Uncomment redirect HTTP→HTTPS"
    log "  2. Jalankan: docker compose restart nginx"
}

# ── Status ──
status() {
    echo -e "${GREEN}Containers:${NC}"
    docker compose --env-file .env.production ps 2>/dev/null || docker compose ps
}

# ── Logs ──
logs() {
    local service="${1:-}"
    if [ -n "$service" ]; then
        docker compose --env-file .env.production logs -f --tail=100 "$service"
    else
        docker compose --env-file .env.production logs -f --tail=100
    fi
}

# ── Main ──
case "${1:-}" in
    --build)    check_env; build ;;
    --migrate)  check_env; migrate ;;
    --restart)  check_env; restart ;;
    --ssl-init) ssl_init ;;
    --status)   status ;;
    --logs)     logs "${2:-}" ;;
    -h|--help)
        echo "Usage: ./deploy.sh [OPTION]"
        echo ""
        echo "  (tanpa flag)    Full deploy: pull → build → migrate → restart"
        echo "  --build         Build Docker images saja"
        echo "  --migrate       Jalankan Prisma migrations saja"
        echo "  --restart       Restart containers saja"
        echo "  --ssl-init      Setup SSL pertama kali (certbot)"
        echo "  --status        Lihat status containers"
        echo "  --logs [svc]    Tail logs (api, web, nginx, postgres)"
        echo "  --help          Tampilkan bantuan ini"
        ;;
    *)          deploy ;;
esac
