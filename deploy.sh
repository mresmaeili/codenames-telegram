#!/usr/bin/env bash
# deploy.sh - Build and deploy frontend and backend for production
# Assumptions:
# - Run from project root (contains client/ and server/)
# - User will pull updates manually before running this script
# - Nginx, Cloudflare Tunnel, and system packages are managed outside this script
# - PM2 process name for backend is `codenames-server`

set -euo pipefail

# Colors for output
GREEN="\033[0;32m"
BLUE="\033[0;34m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NO_COLOR="\033[0m"

info() {
  echo -e "${BLUE}[INFO]${NO_COLOR} $*"
}

success() {
  echo -e "${GREEN}[SUCCESS]${NO_COLOR} $*"
}

error() {
  echo -e "${RED}[ERROR]${NO_COLOR} $*" >&2
}

# Print and exit on error with a message
on_error() {
  local rc=$?
  error "Deployment failed with exit code ${rc}."
  exit ${rc}
}
trap on_error ERR

# Ensure script is run from the project root that contains client/ and server/
info "Verifying project root..."
if [[ ! -d "client" || ! -d "server" ]]; then
  error "This script must be run from the project root containing 'client/' and 'server/'."
  exit 2
fi
success "Project root verified."

# Save current working directory
PROJECT_ROOT="$(pwd)"
info "Project root: ${PROJECT_ROOT}"

# 2. Clean workspace build artifacts
info "Cleaning workspace build artifacts..."
rm -rf node_modules .turbo

# Install root workspace dependencies first (monorepo setup)
info "Installing root workspace dependencies..."
cd "${PROJECT_ROOT}"
npm install --no-audit --no-fund

# 3. Load environment variables from .env (production deployment)
if [[ -f ".env" ]]; then
  info "Loading environment variables from .env..."
  # Use grep + export to safely load .env without bash syntax errors
  set -a
  # shellcheck disable=SC1091
  eval "$(grep -v '^\s*#' .env | grep -v '^\s*$' | sed 's/^/export /')"
  set +a
  success "Environment variables loaded."
else
  info "No .env file found; using system environment variables."
fi

# 4. Build the frontend
info "Building frontend..."
cd "${PROJECT_ROOT}/client"

# Clean only local build artifacts (node_modules already clean from root)
info "Cleaning client build artifacts..."
rm -rf dist .turbo tsconfig.tsbuildinfo

info "Running frontend build with environment variables..."
VITE_APP_NAME="${VITE_APP_NAME:-Codenames Telegram Mini App}" \
VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://codenames.example.com}" \
VITE_SOCKET_URL="${VITE_SOCKET_URL:-https://codenames.example.com}" \
npm run build

# 5. Verify client/dist/index.html exists
if [[ ! -f "dist/index.html" ]]; then
  error "Frontend build failed: 'client/dist/index.html' not found."
  exit 3
fi
success "Frontend built and 'dist/index.html' verified."

# 6. Deploy the frontend
TARGET_DIR="/var/www/codenames"
info "Deploying frontend to ${TARGET_DIR}..."

# Ensure target directory exists
sudo mkdir -p "${TARGET_DIR}"

# Use rsync for idempotent copy and deletion of old files
info "Syncing files to ${TARGET_DIR}..."
sudo rsync -a --delete --chown=www-data:www-data "${PROJECT_ROOT}/client/dist/" "${TARGET_DIR}/"

# Ensure ownership and permissions
info "Setting ownership to www-data:www-data and permissions..."
sudo chown -R www-data:www-data "${TARGET_DIR}"
# Directories 755, files 644
sudo find "${TARGET_DIR}" -type d -exec chmod 755 {} +
sudo find "${TARGET_DIR}" -type f -exec chmod 644 {} +

success "Frontend deployed to ${TARGET_DIR}."

# 7. Build the backend
info "Building backend..."
cd "${PROJECT_ROOT}/server"

# Clean only local build artifacts (node_modules already clean from root)
info "Cleaning backend build artifacts..."
rm -rf dist .turbo tsconfig.tsbuildinfo

# Check if package.json defines a build script
HAS_BUILD_SCRIPT=$(node -e "const pkg=require('./package.json'); console.log(Boolean(pkg.scripts && pkg.scripts.build))")
if [[ "${HAS_BUILD_SCRIPT}" == "true" ]]; then
  info "Found backend build script; running 'npm run build'"
  npm run build
  success "Backend build completed."
else
  info "No backend build script found; skipping build step."
fi

# 8. Restart only the backend with PM2 (verify pm2 exists and process state)
info "Ensuring PM2 is available on the system..."
if ! command -v pm2 >/dev/null 2>&1; then
  error "pm2 is not installed or not on PATH. Install PM2 and ensure it's available.";
  exit 4;
fi

info "Checking if PM2 process 'codenames-server' is already registered..."
if pm2 describe codenames-server >/dev/null 2>&1; then
  info "PM2 process found; restarting 'codenames-server'..."
  if ! pm2 restart codenames-server; then
    error "Failed to restart 'codenames-server' via pm2.";
    exit 5;
  fi
  success "PM2 process 'codenames-server' restarted."
else
  info "PM2 process 'codenames-server' not found. Attempting to start it using project's start command..."

  # Prefer using package.json 'start' script if present
  HAS_START_SCRIPT=$(node -e "const pkg=require('./package.json'); console.log(Boolean(pkg.scripts && pkg.scripts.start))")
  if [[ "${HAS_START_SCRIPT}" == "true" ]]; then
    info "Using 'npm run start' under PM2 to launch the process."
    if ! pm2 start npm --name codenames-server -- run start; then
      error "Failed to start 'codenames-server' via 'pm2 start npm -- run start'.";
      exit 6;
    fi
    success "PM2 started 'codenames-server' via npm start."
  else
    # Fallback: try to start built JS file if present
    if [[ -f "dist/server/src/server.js" ]]; then
      info "Found built server file; starting via PM2: 'dist/server/src/server.js'"
      if ! pm2 start dist/server/src/server.js --name codenames-server; then
        error "Failed to start 'codenames-server' via PM2 using the built server file.";
        exit 7;
      fi
      success "PM2 started 'codenames-server' using built server file."
    else
      error "No 'start' script in package.json and built server file not found. Please start 'codenames-server' manually or add a start script.";
      exit 8;
    fi
  fi
fi

# 9. Verify backend health (poll until healthy, up to timeout)
info "Waiting for backend to become healthy at http://localhost:3001/health"
START_TIME=$(date +%s)
TIMEOUT=30
INTERVAL=1
HEALTH_URL="http://localhost:3001/health"

while true; do
  if curl -fsS --max-time 5 "${HEALTH_URL}" -o /dev/null; then
    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))
    success "Backend health check passed after ${ELAPSED}s."
    break
  fi

  sleep ${INTERVAL}

  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TIME))
  if [[ ${ELAPSED} -ge ${TIMEOUT} ]]; then
    error "Backend did not become healthy within ${TIMEOUT}s (checked ${HEALTH_URL})."
    info "Printing last PM2 logs for 'codenames-server' to help diagnose the issue..."
    # Print recent PM2 logs to aid debugging
    if command -v pm2 >/dev/null 2>&1; then
      pm2 logs codenames-server --lines 200 || true
    else
      error "pm2 is not available to print logs."
    fi
    exit 5
  fi
done

# Report elapsed startup time
TOTAL_ELAPSED=$ELAPSED
info "Backend startup elapsed time: ${TOTAL_ELAPSED}s"

# 10. Test Nginx configuration
info "Testing Nginx configuration (sudo nginx -t)..."
if ! sudo nginx -t; then
  error "Nginx configuration test failed.";
  exit 6;
fi
success "Nginx configuration test passed."

# 11. Reload Nginx
info "Reloading Nginx (sudo systemctl reload nginx)..."
if ! sudo systemctl reload nginx; then
  error "Failed to reload Nginx.";
  exit 7;
fi
success "Nginx reloaded successfully."

# 12. Deployment summary
echo
success "Deployment completed successfully."
echo -e "${YELLOW}Summary:${NO_COLOR}"
echo "- Frontend deployed: ${TARGET_DIR}"
echo "  - VITE_API_BASE_URL: ${VITE_API_BASE_URL:-https://codenames.example.com}"
echo "  - VITE_SOCKET_URL: ${VITE_SOCKET_URL:-https://codenames.example.com}"
echo "- Backend restarted: pm2 (codenames-server)"
echo "- Health check: http://localhost:3001/health (OK)"
echo "- Nginx reloaded"

exit 0
