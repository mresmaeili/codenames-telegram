# Launch Checklist

## Release Gate

Use this checklist before shipping the Telegram Mini App to production. Each item should be verified in a clean environment and signed off by the relevant owner.

---

## 1. Security and configuration

- [ ] Rotate any credentials or secrets that appeared in local, tracked, or shared config files.
- [ ] Remove production secrets from the repo, deployment artifacts, and local environment copies.
- [ ] Confirm all production env vars are documented and stored only in approved deployment channels.
- [ ] Verify `DEV_MODE` and fake-user tooling cannot be activated in production.
- [ ] Confirm Telegram auth validation is enabled and using the correct origin/headers.
- [ ] Verify CORS, reverse proxy headers, and deployment trust settings are correct.
- [ ] Add startup validation with explicit errors for missing or unsafe config values.
- [ ] Document the exact production startup order and required environment variables.

## 2. Build and code quality

- [ ] Run the full workspace build in a clean environment.
- [ ] Run the complete server test suite without database timeout or buffering issues.
- [ ] Run client and server typechecks successfully.
- [ ] Confirm no editor diagnostics remain for the release branch.
- [ ] Verify no debug-only UI or hidden inspector paths remain in production layouts.
- [ ] Confirm no accidental test or fake-user paths are exposed in the live app.

## 3. Multiplayer reliability

- [ ] Verify reconnect and resume behavior on mobile networks and refresh scenarios.
- [ ] Confirm duplicate room joins are prevented after reconnect or page refresh.
- [ ] Confirm stale or duplicate game actions are rejected safely by the server.
- [ ] Validate reconnect UI states are visible and understandable for users.
- [ ] Test multi-client room sync and game sync under disconnect and recovery conditions.
- [ ] Verify room owner disconnect handling and host migration behavior.
- [ ] Validate admin promotion/revocation behavior with multiple clients.

## 4. Gameplay regression checks

- [ ] Confirm a full room flow works from lobby to finished game with multiple clients.
- [ ] Validate random starting team assignment and correct card distribution.
- [ ] Confirm clue submission, guess counting, and extra guess behavior are correct.
- [ ] Validate manual pass, timer pass, wrong-team reveal, neutral reveal, and assassin reveal.
- [ ] Verify full-game completion and board reveal for operatives.
- [ ] Validate replay returns players to the lobby and creates a fresh board.
- [ ] Confirm duplicate confirmation and simultaneous selection protections are enforced.

## 5. Mobile and accessibility

- [ ] Validate portrait layout on representative Android and iOS viewport sizes.
- [ ] Verify touch targets, safe-area spacing, scrolling, and keyboard interaction.
- [ ] Check the production flow for horizontal overflow or clipped content.
- [ ] Add and test `aria-live` or equivalent announcements for turn changes, hints, and errors.
- [ ] Ensure icon-only controls have accessible labels or tooltips.
- [ ] Remove or hide development inspector and debug tooling in production.

## 6. Deployment and operations

- [ ] Confirm the production deployment uses the documented environment values.
- [ ] Validate PM2 or equivalent process startup config.
- [ ] Verify Nginx reverse proxy and WebSocket forwarding are configured correctly.
- [ ] Add HTTP, Socket.IO, and MongoDB readiness or health checks.
- [ ] Confirm logs are readable and errors are actionable in production.
- [ ] Verify the app can start cleanly and recover from a process restart.
- [ ] Test a production smoke flow for Telegram, desktop browser, Android, and iOS.

## 7. Documentation and release signoff

- [ ] Update README and deployment docs to match the current production path.
- [ ] Confirm the release instructions are clear for local setup and production startup.
- [ ] Share the final launch checklist with the team and capture signoff.
- [ ] Approve the release only after all required boxes are checked.

---

## Signoff

- Product/owner: ********\_\_\_\_********
- Backend: ********\_\_\_\_********
- Frontend/mobile QA: ********\_\_\_\_********
- DevOps/release: ********\_\_\_\_********
- Date: ********\_\_\_\_********
