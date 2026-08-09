# Codenames Telegram Mini App Roadmap

> Goal: Build a production-ready Telegram Mini App that faithfully recreates the Codenames experience while providing an excellent mobile-first multiplayer UX.

---

# Current Status

## ✅ Completed

### Infrastructure

- React + Vite frontend
- Express backend
- MongoDB persistence
- Socket.IO real-time communication
- Shared TypeScript types
- Oracle Cloud deployment
- HTTPS + PM2
- Telegram Mini App authentication

### Lobby

- Create room
- Join room
- Leave room
- Room settings
- Team selection
- Role selection
- Player synchronization
- Start validation

### Game Foundation

- Board rendering
- Basic game model
- Turn services
- Reveal services
- Win condition service
- Socket events

---

# Milestone 1 — Developer Experience (Highest Priority)

## Goal

Make development and multiplayer testing effortless.

## Features

### Developer Mode

- [x] DEV_MODE environment flag
- [x] Development toolbar
- [x] Fake Telegram authentication
- [x] Skip Telegram SDK in development

### Fake Users

- [x] Spawn fake users
- [x] Multiple browser tabs
- [x] URL-based identities

Example:

```
?dev=1&user=alice
?dev=1&user=bob
?dev=1&user=charlie
```

### Bot Players

- [x] Add Bot button
- [x] Auto join room
- [x] Auto assign team
- [x] Auto assign role

Future:

- [ ] AI gameplay

### Debug Tools

- [x] Socket inspector
- [x] Room inspector
- [x] Game inspector
- [x] Event logger
- [x] Force reconnect
- [x] Reset room
- [x] Reveal keycard (DEV)

### Success Criteria

✅ Entire game testable from one computer.

---

# Milestone 2 — Lobby UX Redesign

## Goal

Reduce friction and match the official Codenames experience.

## Layout

```
Blue Team

Spectators

Game Settings

Red Team
```

Everything visible on one screen.

## Improvements

- [x] Team cards
- [x] Join team inside card
- [x] Become Spymaster button
- [x] Spectator area
- [x] Ready indicators
- [x] Better player cards
- [x] Toast notifications for lobby actions
- [x] Copy room code
- [x] Share invite
- [x] Room QR code
- [ ] Mobile optimization

### Host Controls

Only visible for host.

- [x] Game mode
- [x] Timer
- [x] Language
- [x] Word packs
- [x] Shuffle teams
- [x] Reset teams
- [x] Start game

### Success Criteria

Users understand the lobby without instructions.

---

# Milestone 3 — Complete Official Gameplay

## Goal

Implement the official Codenames rules.

## Hint Flow

- [x] Spymaster gives clue
- [x] Word validation
- [x] Number validation
- [x] Hint history

## Guess Flow

- [x] Guess counter
- [x] One extra guess
- [x] Pass turn
- [x] Automatic reveal

## Board

- [x] Hidden board for operatives
- [x] Keycard for spymasters
- [ ] Reveal animation

## Rules

- [ ] Assassin
- [ ] Neutral cards
- [ ] Wrong team cards
- [ ] Turn ending
- [ ] Victory detection

## End Game

- [x] Winner modal
- [ ] Replay
- [x] Rematch
- [ ] Statistics

### Success Criteria

Gameplay matches official Codenames.

---

# Milestone 4 — Multiplayer Robustness

## Goal

Production-ready networking.

### Connection

- [ ] Reconnect support
- [ ] Presence detection
- [ ] Offline state
- [ ] Resume game

### Host

- [ ] Host migration
- [x] Owner transfer

### Rooms

- [ ] Empty room cleanup
- [ ] Room expiration
- [ ] Duplicate socket prevention

### Synchronization

- [ ] Atomic updates
- [ ] Race condition fixes
- [ ] Single source of truth

### Success Criteria

No game is lost because someone refreshes.

---

# Milestone 5 — Telegram Polish

## Goal

Feel native inside Telegram.

### Telegram

- [ ] MainButton
- [ ] BackButton
- [ ] Haptic feedback
- [ ] Theme support
- [ ] Safe areas
- [ ] Native share

### UX

- [ ] Toast notifications
- [ ] Loading skeletons
- [ ] Better empty states
- [ ] Error handling

### Success Criteria

Feels like an official Telegram Mini App.

---

# Milestone 6 — Visual Polish

## Animations

- [ ] Card flip
- [ ] Glow effects
- [ ] Turn transition
- [ ] Winner animation
- [ ] Confetti

## Audio

- [ ] Card reveal
- [ ] Wrong guess
- [ ] Win
- [ ] Lose

## Polish

- [ ] Better typography
- [ ] Better spacing
- [ ] Accessibility
- [ ] Landscape support

---

# Milestone 7 — Social Features

## Rooms

- [ ] Invite links
- [ ] QR join
- [ ] Public rooms

## History

- [ ] Match history
- [ ] Statistics
- [ ] Achievements

## Community

- [ ] Leaderboards
- [ ] Friends
- [ ] Recent players

---

# Technical Debt

## Frontend

- [ ] Extract API layer
- [ ] useGame hook
- [ ] useSocket hook
- [ ] useRoom hook
- [ ] Component refactoring
- [ ] Shared form components

## Backend

- [ ] Remove duplicated game creation
- [ ] Consolidate validation
- [ ] Stronger socket typing
- [ ] Better DTOs

## Architecture

- [ ] Event-driven game engine
- [ ] Service isolation
- [ ] Test coverage
- [ ] Integration tests

---

# Future Ideas

- [ ] AI opponents
- [ ] Ranked mode
- [ ] Daily challenge
- [ ] Custom word packs
- [ ] Custom themes
- [ ] Spectator mode
- [ ] Tournament mode
- [ ] Replay system
- [ ] Voice chat integration
- [ ] Multiple languages

---

# Definition of Done

The project is considered production-ready when:

- [ ] Complete official gameplay
- [ ] Stable multiplayer
- [ ] Host migration
- [ ] Reconnection support
- [ ] Mobile-first UX
- [ ] Telegram-native experience
- [ ] Fast loading
- [ ] No critical bugs
- [ ] Fully playable with 2–8 players
- [ ] Successfully tested on Android, iOS, Desktop Telegram, and Web
