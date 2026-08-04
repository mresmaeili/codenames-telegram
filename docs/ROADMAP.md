# ROADMAP.md

# Codenames Telegram Mini App (MVP)

This roadmap defines the implementation order for the project.

The project should be built **incrementally**, with one milestone completed, tested, and committed before moving to the next.

**Guiding Principles**

- Build one feature at a time.
- Keep the architecture simple.
- Prefer readability over cleverness.
- Avoid premature optimization.
- Every milestone should leave the project in a working state.
- Never begin the next milestone until the current one is fully functional.

---

# Phase 1 — Project Foundation

## Goal

Establish a clean, maintainable project structure without implementing any game functionality.

### Milestone 1.1 — Repository Structure

- [ ] Create monorepo structure
- [ ] Create `client/`
- [ ] Create `server/`
- [ ] Create `shared/`
- [ ] Create `docs/`
- [ ] Configure Git repository
- [ ] Add MIT License (optional)

**Deliverable**

A clean repository ready for development.

---

### Milestone 1.2 — Frontend Setup

- [ ] Initialize React
- [ ] Configure Vite
- [ ] Configure TypeScript
- [ ] Configure Tailwind CSS
- [ ] Configure path aliases
- [ ] Verify development server

**Deliverable**

A working React application.

---

### Milestone 1.3 — Backend Setup

- [ ] Initialize Express
- [ ] Configure TypeScript
- [ ] Configure tsx
- [ ] Configure dotenv
- [ ] Create `/health` endpoint
- [ ] Verify development server

**Deliverable**

A working Express server.

---

### Milestone 1.4 — Shared Code

- [ ] Create shared TypeScript types
- [ ] Create shared constants
- [ ] Configure import aliases

**Deliverable**

Reusable shared models.

---

### Milestone 1.5 — Development Tooling

- [ ] Configure ESLint
- [ ] Configure Prettier
- [ ] Configure EditorConfig
- [ ] Configure npm scripts

**Deliverable**

Consistent development environment.

---

### Milestone 1.6 — Documentation

- [ ] Complete README
- [ ] Verify installation instructions
- [ ] Verify development instructions

**Exit Criteria**

- Client starts successfully.
- Server starts successfully.
- TypeScript compiles.
- Linting passes.
- Repository is ready for feature development.

---

# Phase 2 — Core Infrastructure

## Goal

Build the technical foundation required for multiplayer gameplay.

### Milestone 2.1 — Telegram Mini App

- [ ] Telegram SDK
- [ ] App initialization
- [ ] Theme integration
- [ ] Viewport handling
- [ ] User information

---

### Milestone 2.2 — MongoDB

- [ ] Configure Mongoose
- [ ] Database connection
- [ ] Environment configuration
- [ ] Connection health checks

---

### Milestone 2.3 — Socket.IO

- [ ] Configure Socket.IO server
- [ ] Configure Socket.IO client
- [ ] Connection lifecycle
- [ ] Reconnection handling

---

### Milestone 2.4 — Authentication

- [ ] Telegram authentication
- [ ] User validation
- [ ] User persistence
- [ ] Session initialization

**Exit Criteria**

- Users can open the Mini App.
- User identity is available.
- Database connection is stable.
- Socket connection is stable.

---

# Phase 3 — Lobby System

## Goal

Allow players to create and join private game rooms.

### Milestone 3.1 — Room Model

- [ ] Room schema
- [ ] Room state
- [ ] Room validation

---

### Milestone 3.2 — Room Creation

- [ ] Create room API
- [ ] Generate room code
- [ ] Persist room

---

### Milestone 3.3 — Join Room

- [ ] Join by room code
- [ ] Player validation
- [ ] Room capacity

---

### Milestone 3.4 — Lobby Interface

- [ ] Lobby screen
- [ ] Player list
- [ ] Owner controls

---

### Milestone 3.5 — Team Assignment

- [ ] Team selection
- [ ] Spymaster selection
- [ ] Team validation

---

### Milestone 3.6 — Room Settings

- [ ] Basic settings
- [ ] Start button
- [ ] Ready validation

**Exit Criteria**

- Players can create rooms.
- Players can join rooms.
- Teams can be assigned.
- Game can be started.

---

# Phase 4 — Game Engine

## Goal

Implement the complete Codenames gameplay.

### Milestone 4.1 — Game Initialization

- [ ] Generate game
- [ ] Select random words
- [ ] Assign card colors
- [ ] Determine starting team

---

### Milestone 4.2 — Board Rendering

- [ ] Display board
- [ ] Card component
- [ ] Responsive layout

---

### Milestone 4.3 — Spymaster View

- [ ] Hidden card colors
- [ ] Role visibility
- [ ] Spymaster board

---

### Milestone 4.4 — Hint System

- [ ] Submit hint
- [ ] Validate hint
- [ ] Broadcast hint
