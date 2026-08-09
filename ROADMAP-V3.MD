# Codenames Telegram Mini App Roadmap V3

> Goal: Finish the app for launch by closing the remaining multiplayer, mobile, and gameplay polish work.

---

# Current Status

## ✅ Completed

### Core platform

- React + Vite frontend
- Express backend
- MongoDB persistence
- Socket.IO real-time communication
- Shared TypeScript types
- Telegram Mini App authentication

### Lobby and host flow

- Create/join/leave room
- Room ownership + host transfer
- Host-only room settings
- Game mode, timer, language, and word pack controls
- Shuffle teams and reset teams
- Optimistic lobby update flow
- Toast notifications for host actions

### Gameplay foundation

- Board rendering
- Hidden board view for operatives
- Spymaster keycard view
- Turn/reveal/win services
- Game state sync via sockets

### Developer experience

- DEV_MODE tooling
- Fake user auth and bot support
- Developer inspector toolbar
- Manual lobby and game JSON inspection

---

# Milestone 3 — Ship-ready multiplayer experience

## Goal

Finish all remaining changes so the app is stable, usable, and launch-ready.

## Priority focus areas

### 1. Mobile + accessibility

- [ ] Responsive lobby layout for phones and portrait view
- [ ] Host controls fit small screens cleanly
- [ ] Touch-friendly buttons and spacings
- [ ] `aria-live` support for toast and status feedback
- [ ] Keyboard / screen reader friendly labels

### 2. Multiplayer robustness

- [ ] Reconnect support for transient network drops
- [ ] Presence / resume behavior after reconnect
- [ ] Duplicate socket join prevention
- [ ] Empty room cleanup and expiration
- [ ] Basic host migration safety guard

### 3. Gameplay polish

- [ ] Reveal board animation
- [ ] Smooth board state transitions
- [ ] End-game summary / winner modal polish
- [ ] Replay / rematch flow
- [ ] Basic game session statistics

### 4. Quality and release readiness

- [ ] Final functional regression pass
- [ ] Full workspace build + smoke tests
- [ ] User-facing copy clarity in lobby/game flows
- [ ] Small observability improvements for debugging

---

# Roadmap V3 workflow

## Short-term launch sprint

1. Finish mobile lobby polish and accessibility.
2. Add reconnect/resume support and guard duplicate joins.
3. Add reveal animation and end-game finish flow.
4. Run a full build and playtest session.

## Launch criteria

- A player can create a room and join on mobile without layout breakage.
- Hosts can update settings and see immediate toast feedback.
- Transient disconnects recover to the same room state.
- Operatives never see the color key directly, and spymasters can access the keycard.
- A full game can complete with a winner screen and rematch option.

---

# Notes

This V3 roadmap is intentionally narrow: keep the remaining work focused on usability, resiliency, and gameplay completion rather than adding new features.
