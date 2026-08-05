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

# 3. Build the frontend
info "Building frontend..."
cd "${PROJECT_ROOT}/client"

# Install dependencies idempotently
info "Installing frontend dependencies (npm install)..."
npm install --no-audit --no-fund

info "Running frontend build (npm run build)..."
npm run build

# 4. Verify client/dist/index.html exists
if [[ ! -f "dist/index.html" ]]; then
  error "Frontend build failed: 'client/dist/index.html' not found."
  exit 3
fi
success "Frontend built and 'dist/index.html' verified."

# 5. Deploy the frontend
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

# 6. Build the backend
info "Building backend..."
cd "${PROJECT_ROOT}/server"

info "Installing backend dependencies (npm install)..."
npm install --no-audit --no-fund

# Check if package.json defines a build script
HAS_BUILD_SCRIPT=$(node -e "const pkg=require('./package.json'); console.log(Boolean(pkg.scripts && pkg.scripts.build))")
if [[ "${HAS_BUILD_SCRIPT}" == "true" ]]; then
  info "Found backend build script; running 'npm run build'"
  npm run build
  success "Backend build completed."
else
  info "No backend build script found; skipping build step."
fi

# 7. Restart only the backend with PM2
info "Restarting backend process 'codenames-server' with pm2..."
pm exec --yes pm2 restart codenames-server || {
  error "pm2 restart failed. Ensure a PM2 process named 'codenames-server' exists.";
  exit 4;
}
success "Backend process restarted via PM2."

# 8. Verify backend health
info "Waiting briefly for backend to become healthy..."
sleep 2
info "Checking backend health at http://localhost:3001/health"
if ! curl -fsS --max-time 5 http://localhost:3001/health -o /dev/null; then
  error "Health check failed for http://localhost:3001/health"
  exit 5
fi
success "Backend health check passed."

# 9. Test Nginx configuration
info "Testing Nginx configuration (sudo nginx -t)..."
if ! sudo nginx -t; then
  error "Nginx configuration test failed.";
  exit 6;
fi
success "Nginx configuration test passed."

# 10. Reload Nginx
info "Reloading Nginx (sudo systemctl reload nginx)..."
if ! sudo systemctl reload nginx; then
  error "Failed to reload Nginx.";
  exit 7;
fi
success "Nginx reloaded successfully."

# 11. Deployment summary
echo
success "Deployment completed successfully."
echo -e "${YELLOW}Summary:${NO_COLOR}"
echo "- Frontend deployed: ${TARGET_DIR}"
echo "- Backend restarted: pm2 (codenames-server)"
echo "- Health check: http://localhost:3001/health (OK)"
echo "- Nginx reloaded"

exit 0
