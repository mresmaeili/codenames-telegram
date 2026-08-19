# Codenames Telegram Mini App Roadmap V4

## Goal

Move the current playable MVP from development-complete to production-ready for Telegram users. V4 focuses on release hardening, mobile reliability, security, and operational confidence rather than adding new game modes.

## Current State

The app currently supports:

- Telegram authentication with development-mode fake users.
- Room creation, joining, leaving, ownership, owner transfer, and team/role assignment.
- Host settings for timer, language, word pack, and game mode.
- Real-time room and game updates through Socket.IO.
- Server-authoritative Codenames gameplay.
- Random starting team with 9 cards for the starting team and 8 for the other team.
- Spymaster clue submission with validation and hint history.
- Operative selection, explicit confirmation, and double-click confirmation.
- One extra guess beyond the clue number.
- Manual pass and timer-based turn passing.
- Correct, wrong, neutral, and assassin reveal handling.
- Winner/completion metadata and full board reveal after game completion.
- Owner replay/reset to lobby while preserving player teams and roles.
- Mobile-oriented reference styling for the game board and player cards.
- Development toolbar, fake users, keycard inspection, reconnect controls, and socket event logging.

## V4 Priorities

### 1. Production Security and Configuration

- [ ] Rotate all credentials that have appeared in local or shared configuration.
- [ ] Remove production secrets from tracked or exposed files.
- [ ] Provide separate documented development and production environment setup.
- [ ] Ensure `DEV_MODE` tooling cannot be enabled in production.
- [ ] Verify CORS, Telegram authentication, and reverse-proxy headers in production.
- [ ] Add startup validation with actionable configuration errors.

### 2. Multiplayer Reliability

- [ ] Verify reconnect and resume behavior on mobile networks.
- [ ] Prevent duplicate room joins after reconnect and refresh.
- [ ] Make all game mutations atomic or reject stale mutations safely.
- [ ] Add explicit connection, reconnecting, and resumed-state UI feedback.
- [ ] Test two clients receiving every room and game event consistently.
- [ ] Add host migration behavior for owner disconnects.

### 3. Gameplay Verification

- [ ] Add integration coverage for a complete game through Socket.IO.
- [ ] Cover timer expiration, manual pass, wrong-team reveal, neutral reveal, assassin reveal, and all-card victory in one regression suite.
- [ ] Verify finished-game views expose colors to operatives but active-game views do not.
- [ ] Verify replay creates a new board and preserves assignments.
- [ ] Add protection against duplicate confirmations and simultaneous selections.

### 4. Mobile and Accessibility

- [ ] Test portrait layouts on representative Android and iOS viewport sizes.
- [ ] Verify touch targets, safe areas, scrolling, and keyboard behavior.
- [ ] Add `aria-live` announcements for turn changes, hints, errors, and completion.
- [ ] Ensure all icon-only controls have accessible labels and tooltips where needed.
- [ ] Remove development inspector space from production layouts.
- [ ] Fix remaining Tailwind and TypeScript editor diagnostics.

### 5. Operations and Release

- [ ] Run the full workspace build in a clean environment.
- [ ] Run the complete server test suite without database timeouts.
- [ ] Add health/readiness checks for HTTP, Socket.IO, and MongoDB.
- [ ] Verify PM2/Nginx deployment and secure WebSocket forwarding.
- [ ] Add a release smoke-test checklist for Telegram, desktop browser, Android, and iOS.
- [ ] Update README and deployment documentation with the current environment flow.

## Deferred Scope

The following are intentionally outside V4 unless launch requirements change:

- AI opponents.
- Ranked games, leaderboards, achievements, and match history.
- Voice chat and social graph features.
- Tournament mode and custom themes.
- Advanced game statistics beyond basic winner and completion state.

## Release Criteria

V4 is ready to ship when:

- A clean production build starts with documented environment variables.
- No credentials are exposed in the repository or deployment artifacts.
- Two or more mobile clients can complete a full game without stale state.
- Reconnect resumes the correct room and game state.
- Replay returns every client to the lobby and preserves assignments.
- Full tests, typechecks, and the production build pass.
- Telegram Mini App smoke tests pass on Android, iOS, and desktop.
