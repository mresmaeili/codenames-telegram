# Codenames Telegram Mini App Roadmap V4

## Goal

Take the current playable multiplayer MVP to a launch-ready Telegram production state. V4 is now focused on release hardening, operational confidence, and mobile reliability rather than building out new game modes or feature breadth.

## Current State

The app has moved past the prototype phase and is now a functioning Codenames multiplayer MVP with live room flow, server-authoritative gameplay, replay, and mobile-friendly board presentation.

### Core systems in place

- Telegram-backed auth flow with development-mode fallback users.
- Real-time room lifecycle through Socket.IO: create, join, leave, transfer ownership, admin promotion, and reset.
- Server-authoritative game flow for team assignment, clues, guesses, pass handling, reveal logic, and winner/completion state.
- Replay flow that creates a fresh board while preserving player assignments and room state.
- Mobile-first board styling and compact game UI for portrait layouts.
- MongoDB-backed startup and live socket validation through browser and server test coverage.
- Workspace build and server test scripts wired into the monorepo.

### Current repo status

- Monorepo build is defined at the root and includes shared, server, and client builds.
- Server test suite is configured and runs the gameplay, room, route, and repository test set.
- The project has achieved the core gameplay milestone; the remaining risk is concentrated in production hardening and release validation.

## V4 Priorities

### 1. Production Security and Configuration

- [ ] Rotate any credentials or secrets that appeared in local, tracked, or shared configuration.
- [ ] Remove production secrets from repository, deployment artifacts, and environment docs.
- [ ] Document a clean development-vs-production environment flow for local and VPS deployment.
- [ ] Ensure development-only tooling and fake user paths cannot be activated in production.
- [ ] Validate CORS, Telegram auth verification, and reverse-proxy headers under deployment conditions.
- [ ] Add startup validation with explicit configuration errors and safe defaults.

### 2. Multiplayer Reliability

- [ ] Verify reconnect and resume behavior under real mobile network loss and refresh conditions.
- [ ] Prevent duplicate room joins after reconnect and page refresh.
- [ ] Harden mutation flow to reject stale or duplicate actions safely.
- [ ] Add explicit reconnecting/resumed-state UI states for clients.
- [ ] Add a multi-client regression test for room and game synchronization under disconnect conditions.
- [ ] Add host migration behavior when the room owner disconnects.
- [ ] Add browser automation coverage for admin promotion and reconnect/resume paths.

### 3. Gameplay Verification

- [ ] Expand Socket.IO integration coverage for a full multiplayer game from lobby to finish.
- [ ] Add regression coverage for timer expiry, manual pass, wrong-team reveal, neutral reveal, assassin reveal, and full-board victory.
- [ ] Verify finished-game views expose hidden colors to operatives while live-game views remain masked.
- [ ] Verify replay creates a new board and preserves assignments and roles correctly.
- [ ] Add duplicate-confirmation and simultaneous-selection protections at the server boundary.

### 4. Mobile and Accessibility

- [ ] Validate portrait flow on representative Android and iOS viewport sizes.
- [ ] Verify touch targets, safe-area spacing, scrolling, and keyboard behavior for the production flow.
- [ ] Add aria-live or equivalent announcements for turn changes, errors, hints, and completion.
- [ ] Ensure icon-only actions have accessible labels or tooltips.
- [ ] Remove development-only inspector layouts from production screens.
- [ ] Resolve outstanding Tailwind and TypeScript editor diagnostics.

### 5. Operations and Release

- [ ] Run the full workspace build in a clean environment before release.
- [ ] Run the complete server test suite without database timeout or buffering issues.
- [ ] Add HTTP, Socket.IO, and MongoDB health or readiness checks.
- [ ] Validate PM2/Nginx deployment and WebSocket forwarding in the actual production topology.
- [ ] Create a release smoke checklist for Telegram, desktop browser, Android, and iOS.
- [ ] Update the README and deployment docs to match the current release flow and environment variables.

## Deferred Scope

The following remain outside V4 unless launch requirements change:

- AI opponents.
- Ranked games, leaderboards, achievements, and match history.
- Voice chat and social graph features.
- Tournament mode and custom themes.
- Advanced analytics beyond winner and completion metadata.

## Release Criteria

V4 is ready to ship when:

- The production build starts cleanly with documented environment variables.
- No credentials or secrets are exposed in the repository or deployment artifacts.
- Two or more clients can complete a full game without stale state.
- Reconnect resumes the correct room and game state.
- Replay returns all clients to the lobby and preserves assignments.
- Full tests, typechecks, and the production build pass in a clean environment.
- Telegram Mini App smoke tests pass on Android, iOS, and desktop.
