#!/bin/bash
# deploy/setup.sh
# Runs ON the Azure VM after files are copied.
# Idempotent — safe to run multiple times.
set -e

# Suppress interactive prompts
export DEBIAN_FRONTEND=noninteractive

APP_DIR="/opt/myapp"
DEPLOY_DIR="/tmp/deploy"
VENV_DIR="$APP_DIR/venv"
USER=$(whoami)

echo "=========================================="
echo "  Deploying Flask + React App"
echo "=========================================="

# ─── 1. Install system dependencies (first run only) ──────
echo "[1/7] Installing system dependencies..."
if ! command -v python3 &> /dev/null || ! dpkg -l | grep -q python3-venv; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3 python3-pip python3-venv
fi

if ! command -v nginx &> /dev/null; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx
fi

# ─── 2. Create app directory ───────────────────────────────
echo "[2/7] Setting up app directory..."
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER:$USER" "$APP_DIR"

# ─── 3. Copy backend files ─────────────────────────────────
echo "[3/7] Copying backend files..."
rm -rf "$APP_DIR/backend"
cp -r "$DEPLOY_DIR/backend" "$APP_DIR/backend"

# ─── 4. Copy frontend build ────────────────────────────────
echo "[4/7] Copying frontend build..."
rm -rf "$APP_DIR/frontend"
mkdir -p "$APP_DIR/frontend"
cp -r "$DEPLOY_DIR/frontend/dist" "$APP_DIR/frontend/dist"

# ─── 5. Setup Python virtual environment & install deps ────
echo "[5/7] Setting up Python virtual environment..."

# Remove old venv to ensure clean state
if [ -d "$VENV_DIR" ]; then
  rm -rf "$VENV_DIR"
fi

# Create fresh virtual environment
python3 -m venv "$VENV_DIR"

# Activate and install dependencies
source "$VENV_DIR/bin/activate"
pip install --upgrade pip -q
pip install -r "$APP_DIR/backend/requirements.txt" -q
pip install gunicorn -q
deactivate

# ─── 6. Configure Gunicorn service ─────────────────────────
echo "[6/7] Configuring Gunicorn & Nginx..."

# Gunicorn systemd service
sudo tee /etc/systemd/system/myapp.service > /dev/null <<EOF
[Unit]
Description=Flask App via Gunicorn
After=network.target

[Service]
User=$USER
Group=$(id -gn)
WorkingDirectory=$APP_DIR/backend
Environment="PATH=$VENV_DIR/bin:/usr/bin:/bin"
ExecStart=$VENV_DIR/bin/gunicorn --workers 2 --bind 127.0.0.1:5000 app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Nginx config — serves React build as static, proxies /api to Flask
sudo tee /etc/nginx/sites-enabled/myapp > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    # ── Serve React SPA ──────────────────────────────
    root $APP_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # ── Proxy API requests to Flask/Gunicorn ─────────
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Remove default Nginx config if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# ─── 7. Restart services ───────────────────────────────────
echo "[7/7] Restarting services..."
sudo systemctl daemon-reload
sudo systemctl enable myapp
sudo systemctl restart myapp
sudo systemctl enable nginx
sudo systemctl restart nginx

# ─── Cleanup staging area ──────────────────────────────────
rm -rf "$DEPLOY_DIR"

echo ""
echo "=========================================="
echo "  ✅ Deployment Complete!"
echo "  Flask runs on: http://127.0.0.1:5000"
echo "  Nginx serves app on: http://0.0.0.0:80"
echo "=========================================="