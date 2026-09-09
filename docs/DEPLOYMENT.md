# Deployment Guide

## Overview

This MVP is designed for deployment on an Oracle Cloud VPS with Node.js, MongoDB, and Nginx.

## Environment Variables

Create a production environment file from the repository example and keep it local to the deployment machine:

```bash
cp .env.example .env
```

Then update the values in .env:

```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/codenames
TELEGRAM_BOT_TOKEN=your-production-bot-token
CORS_ORIGIN=https://your-domain.com

VITE_APP_NAME=Codenames Telegram Mini App
VITE_API_BASE_URL=https://your-domain.com
VITE_SOCKET_URL=https://your-domain.com

# Temporary browser testing only; do not enable for public production use.
DEV_MODE=false
```

Keep the .env file outside of the repository only if you are deploying from a different host; in this repo it is already ignored by Git.

## Oracle Cloud VM Setup

1. Provision an Ubuntu 22.04+ VM.
2. Install Node.js 20, npm, Docker (optional), and Nginx.
3. Clone the repository into /opt/codenames.
4. Install dependencies with npm install.
5. Configure your environment variables in a `.env` file at the project root.
6. Start the app with `npm run build && npm run start --workspace server`.

## MongoDB Configuration

Use either a local MongoDB instance on the VM or a managed MongoDB service.

Recommended local setup:

```bash
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod
```

## Nginx Reverse Proxy

Example configuration:

```nginx
server {
  listen 80;
  server_name your-domain.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  server_name your-domain.com;

  ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## HTTPS

Use Let's Encrypt or a managed certificate provider.

## Telegram Mini App Configuration

Set the bot domain and WebApp URL in the Telegram Bot settings to the deployed HTTPS domain.

### Browser testing without Telegram

For public browser login, set `VITE_TELEGRAM_BOT_USERNAME` to the bot username
without the `@` character when building the client. The bot domain must be
configured for the deployed HTTPS domain in BotFather. Users can then choose
the Telegram Login Widget on the authentication screen.

For temporary browser testing, set `DEV_MODE=true` in the server environment and redeploy. Then open:

```text
https://your-domain.com/?dev=1&user=Alice&v=20260908
```

Use a different `user` value in another browser or tab. The server must be restarted with updated environment variables; `deploy.sh` passes `--update-env` to PM2 for this.

Disable `DEV_MODE` again after testing because it allows synthetic users without Telegram authentication.

## Docker

Build and run locally:

```bash
docker compose up --build
```

## Build and Restart Commands

```bash
npm install
npm run build
npm run start --workspace server
```

## Health Check

The application exposes `/health`. It returns HTTP `200` only when MongoDB is
connected and HTTP `503` otherwise. Verify both the browser shell and health
endpoint after deployment:

```bash
curl -f https://your-domain.com/health
curl -I https://your-domain.com/
```

The Node server serves the built `client/dist` files and falls back to
`index.html` for browser routes, while Nginx forwards HTTP and Socket.IO
WebSocket traffic to port `3001`.
