#!/usr/bin/env bash
# deploy.sh — deploy the Gamebot backend to EC2
#
# ONE-TIME SETUP (read before first run):
# ────────────────────────────────────────
# 1. Launch an EC2 instance:
#      - AMI:          Ubuntu 22.04 LTS
#      - Instance:     t3.small minimum; t3.medium recommended
#      - Storage:      20 GB gp3 root volume
#      - Key pair:     download the .pem file to ~/Downloads/hq.pem
#      - Security group inbound rules:
#          Port 22  (SSH)   — your IP or 0.0.0.0/0
#          Port 80  (HTTP)  — 0.0.0.0/0   (required for HTTPS cert issuance)
#          Port 443 (HTTPS) — 0.0.0.0/0   (when using --domain)
#          Port 8000        — 0.0.0.0/0   (when NOT using --domain)
#
# USAGE:
#   Plain HTTP (port 8000):
#     ./deploy.sh ubuntu@<ec2-ip>
#
#   HTTPS via Nginx + Let's Encrypt (auto-generates <ip>.nip.io domain):
#     ./deploy.sh ubuntu@<ec2-ip> --https
#
#   Override PEM file:
#     PEM_FILE=~/path/to/key.pem ./deploy.sh ubuntu@<ec2-ip>
#
# SUBSEQUENT DEPLOYS:
#   Same command — secrets and database are preserved.

set -euo pipefail

# ─── Args ────────────────────────────────────────────────────────────────────
EC2_HOST="${1:-${EC2_HOST:-}}"
if [[ -z "$EC2_HOST" ]]; then
    echo "Usage: $0 ubuntu@<ec2-ip> [--domain <domain>]"
    exit 1
fi

USE_HTTPS=false
shift
while [[ $# -gt 0 ]]; do
    case "$1" in
        --https) USE_HTTPS=true; shift ;;
        *) echo "Unknown argument: $1"; exit 1 ;;
    esac
done

APP_DIR="/opt/gamebot"
COMPOSE_FILE="docker-compose.prod.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PEM_FILE="${PEM_FILE:-$HOME/Downloads/hq.pem}"

if [[ ! -f "$PEM_FILE" ]]; then
    echo "ERROR: PEM file not found at $PEM_FILE"
    echo "       Set PEM_FILE=/path/to/key.pem to override."
    exit 1
fi

SSH="ssh -i $PEM_FILE -o StrictHostKeyChecking=accept-new"

# Derive EC2 IP from the host argument (strip any user@ prefix)
EC2_IP="${EC2_HOST##*@}"
DOMAIN=""
if [[ "$USE_HTTPS" == true ]]; then
    DOMAIN="${EC2_IP}.nip.io"
fi

echo "==> Target: $EC2_HOST"
echo "==> Key:    $PEM_FILE"
if [[ -n "$DOMAIN" ]]; then
    echo "==> Domain: $DOMAIN (HTTPS)"
else
    echo "==> Mode:   HTTP on port 8000"
fi

# ─── PHASE 1: Bootstrap (idempotent) ─────────────────────────────────────────
echo ""
echo "==> [1/6] Bootstrapping EC2 instance..."
$SSH "$EC2_HOST" bash <<'BOOTSTRAP'
set -euo pipefail

if ! command -v docker &>/dev/null; then
    echo "  Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER"
    echo "  Docker installed."
else
    echo "  Docker already installed."
fi

if ! docker compose version &>/dev/null 2>&1; then
    echo "  Installing Docker Compose plugin..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-compose-plugin
    echo "  Docker Compose plugin installed."
else
    echo "  Docker Compose already installed."
fi

if ! groups | grep -q docker; then
    sudo usermod -aG docker "$USER"
    echo "  Added $USER to docker group."
fi

sudo mkdir -p /opt/gamebot
sudo chown "$USER":"$USER" /opt/gamebot
echo "  App directory ready: /opt/gamebot"
BOOTSTRAP

# ─── PHASE 2: Sync code ───────────────────────────────────────────────────────
echo ""
echo "==> [2/6] Syncing code..."
rsync -az --delete \
    --exclude='.git' \
    --exclude='frontend/' \
    --exclude='backend/.venv' \
    --exclude='backend/__pycache__' \
    --exclude='**/__pycache__' \
    --exclude='**/*.pyc' \
    --exclude='.env.local' \
    --exclude='.env.prod' \
    --exclude='node_modules' \
    -e "$SSH" \
    "$SCRIPT_DIR/" "$EC2_HOST:$APP_DIR/"
echo "  Code synced."

# ─── PHASE 3: First-time secrets ─────────────────────────────────────────────
echo ""
echo "==> [3/6] Configuring secrets..."
$SSH "$EC2_HOST" bash <<SECRETS
set -euo pipefail
ENV_FILE="$APP_DIR/.env.prod"

if [ ! -f "\$ENV_FILE" ]; then
    echo "  Generating new .env.prod..."
    DB_PASS=\$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
    SECRET_KEY=\$(python3 -c "import secrets; print(secrets.token_hex(32))")

    cat > "\$ENV_FILE" <<EOF
POSTGRES_USER=gamebot
POSTGRES_PASSWORD=\$DB_PASS
POSTGRES_DB=gamebot
SECRET_KEY=\$SECRET_KEY
ALLOWED_ORIGINS=http://localhost:3000
EOF
    chmod 600 "\$ENV_FILE"
    echo ""
    echo "  ╔══════════════════════════════════════════════════════════╗"
    echo "  ║  .env.prod created with random credentials.             ║"
    echo "  ║                                                          ║"
    echo "  ║  ACTION REQUIRED: set your Vercel frontend URL in       ║"
    echo "  ║  $APP_DIR/.env.prod                             ║"
    echo "  ║                                                          ║"
    echo "  ║  Edit the ALLOWED_ORIGINS line to:                      ║"
    echo "  ║    ALLOWED_ORIGINS=https://your-app.vercel.app          ║"
    echo "  ║                                                          ║"
    echo "  ║  Then re-run deploy.sh to apply.                        ║"
    echo "  ╚══════════════════════════════════════════════════════════╝"
    echo ""
else
    echo "  .env.prod already exists — preserving secrets."
fi
SECRETS

# ─── PHASE 4: Nginx + HTTPS (only when --domain is passed) ───────────────────
if [[ -n "$DOMAIN" ]]; then
    echo ""
    echo "==> [4/6] Setting up Nginx + Let's Encrypt for $DOMAIN..."
    $SSH "$EC2_HOST" bash <<NGINX_SETUP
set -euo pipefail

# Install Nginx and Certbot if not present
if ! command -v nginx &>/dev/null; then
    echo "  Installing Nginx..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq nginx
fi

if ! command -v certbot &>/dev/null; then
    echo "  Installing Certbot..."
    sudo apt-get install -y -qq certbot python3-certbot-nginx
fi

# Write Nginx config (HTTP first — needed for certbot's HTTP-01 challenge)
sudo tee /etc/nginx/sites-available/gamebot > /dev/null <<'NGINXCONF'
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass         http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGINXCONF

sudo ln -sf /etc/nginx/sites-available/gamebot /etc/nginx/sites-enabled/gamebot
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload-or-restart nginx

# Obtain cert (skipped if already exists)
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "  Obtaining Let's Encrypt certificate for $DOMAIN..."
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@$DOMAIN --redirect
    echo "  Certificate obtained."
else
    echo "  Certificate already exists — renewing if needed..."
    sudo certbot renew --quiet
fi

echo "  Nginx + HTTPS configured."
NGINX_SETUP
else
    echo ""
    echo "==> [4/6] Skipping Nginx (no --domain provided, using port 8000 directly)."
fi

# ─── PHASE 5: Build bot runner images ────────────────────────────────────────
echo ""
echo "==> [5/6] Building bot runner images (uses cache — fast on re-deploys)..."
$SSH "$EC2_HOST" bash <<BOTBUILD
set -euo pipefail
cd $APP_DIR/backend

echo "  Building gamebot-python..."
docker build -q -t gamebot-python:latest -f docker/python/Dockerfile . && echo "  gamebot-python done."

echo "  Building gamebot-javascript..."
docker build -q -t gamebot-javascript:latest -f docker/javascript/Dockerfile . && echo "  gamebot-javascript done."

echo "  Building gamebot-java..."
docker build -q -t gamebot-java:latest -f docker/java/Dockerfile . && echo "  gamebot-java done."
BOTBUILD

# ─── PHASE 6: Build backend and start services ───────────────────────────────
echo ""
echo "==> [6/6] Building backend image and starting services..."
$SSH "$EC2_HOST" bash <<DEPLOY
set -euo pipefail
cd $APP_DIR

set -a; source .env.prod; set +a

docker compose -f $COMPOSE_FILE build backend
docker compose -f $COMPOSE_FILE up -d --remove-orphans

echo ""
echo "  Waiting for postgres health check..."
for i in \$(seq 1 30); do
    STATUS=\$(docker compose -f $COMPOSE_FILE ps --format json postgres 2>/dev/null \
        | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0].get('Health','unknown'))" 2>/dev/null \
        || echo "starting")
    if [ "\$STATUS" = "healthy" ]; then
        echo "  Postgres is healthy."
        break
    fi
    printf "  (%d/30) status: %s\r" "\$i" "\$STATUS"
    sleep 2
done
DEPLOY

# ─── Smoke test ───────────────────────────────────────────────────────────────
echo ""
echo "==> Smoke test..."
sleep 3
HEALTH=$($SSH "$EC2_HOST" "curl -sf http://127.0.0.1:8000/health 2>/dev/null || echo FAILED")
if echo "$HEALTH" | grep -q '"status"'; then
    echo "  Backend health check: OK ($HEALTH)"
else
    echo "  WARNING: health check returned: $HEALTH"
    echo "  Check logs with:"
    echo "    ssh -i $PEM_FILE $EC2_HOST 'cd $APP_DIR && docker compose -f $COMPOSE_FILE logs backend'"
    exit 1
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
if [[ -n "$DOMAIN" ]]; then
    API_URL="https://$DOMAIN"
else
    API_URL="http://$EC2_IP:8000"
fi

echo ""
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║  Deploy complete!                                        ║"
echo "  ║                                                          ║"
echo "  ║  API:    $API_URL"
echo "  ║  Health: $API_URL/health"
echo "  ║                                                          ║"
echo "  ║  Set in Vercel:                                          ║"
echo "  ║    NEXT_PUBLIC_API_URL=$API_URL"
echo "  ║                                                          ║"
echo "  ║  Logs:                                                   ║"
echo "  ║    ssh -i $PEM_FILE $EC2_HOST \\"
echo "  ║    'cd $APP_DIR && docker compose -f $COMPOSE_FILE logs -f'"
echo "  ╚══════════════════════════════════════════════════════════╝"
