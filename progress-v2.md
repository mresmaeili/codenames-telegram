# Progress V2

## Current status

This project is now beyond the Milestone 1 bootstrap and is actively moving through the Milestone 2 lobby UX redesign. The current codebase includes the developer experience tooling and a room-share, team, spectator, and readiness-oriented lobby layout.

## Completed since last update

- Added frontend dev mode support:
  - `DEV_MODE` environment flag
  - fake Telegram auth via URL param `?dev=1&user=alice`
  - dev toolbar with quick fake user session launch buttons
- Added backend dev-mode support:
  - server-side `DEV_MODE` env detection
  - dev-safe fake user creation for room join and room creation flows
- Added in-app dev tooling:
  - dev mode skips Telegram SDK initialization locally
  - developer toolbar appears in app shell
- Added bot player support for dev testing:
  - `room:addBot` socket event in development
  - lobby button to spawn bots in a room
  - bot auto-joins, gets a generated name, team, and role balance
- Added developer inspector tooling:
  - `DevToolbar` socket state and reconnect/disconnect actions
  - lobby raw room JSON inspector with manual refresh
  - game page refresh button with raw room/game JSON output
- Added lightweight toast notifications for host actions and lobby events
- Implemented milestone-2 lobby UX continuity:
  - dedicated team panels for red/blue
  - spectator panel
  - role assignment and spymaster flow inside cards
  - room code / invite clipboard flow
  - navigator share flow
  - join QR-style room visual
  - lobby readiness feedback and player readiness badges
- Verified builds for the current workspace

## Verified build status

- `npm run build` ✅ (shared, server, and client compiling + Vite bundling)

## Next focus

The immediate priorities and remaining work items (ordered by importance):

1. Finish host-only controls and UX

- Game mode, timer, language, and word-pack selection (persisted via `room:updateSettings`).
- Shuffle teams and Reset teams (already implemented server-side; wire full UX feedback).

2. Hidden board & spymaster keycard (implemented)

- Show a colorized keycard for spymasters and a hidden board view for operatives.
- Add reveal animations and improved board transitions.

3. Mobile optimization and accessibility

- Ensure lobby layout collapses gracefully on small screens.
- Add aria-live feedback for status messages and ensure buttons have sufficient touch targets.

4. Reconnect, presence, and resume

- Improve reconnection handling, presence detection, and the ability to resume mid-game after transient disconnects.

5. UX polish and observability

- Toast notifications for successful/failed host actions implemented.
- Consider small audit entries for host actions on the room document for moderation and debugging.

6. Remaining Milestone 3 gameplay items

- Assassin behavior, neutral cards handling, and end-game replay/statistics.

## Notes

- Current progress is aligned with Roadmap V2: the developer experience layer has been materially delivered, and the lobby redesign is now visible in the UI.
- The remaining roadmap items are mostly front-end UX / visual fidelity, host settings, and official gameplay completion rather than backend architecture shape.
