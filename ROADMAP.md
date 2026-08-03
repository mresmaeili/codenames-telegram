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

---

### Milestone 4.5 — Card Selection

- [ ] Select card
- [ ] Server validation
- [ ] Pending selection

---

### Milestone 4.6 — Card Confirmation

- [ ] Confirmation flow
- [ ] Reveal card
- [ ] Update board

---

### Milestone 4.7 — Turn Management

- [ ] Guess counter
- [ ] Turn switching
- [ ] Round progression

---

### Milestone 4.8 — Win Conditions

- [ ] Team victory
- [ ] Assassin card
- [ ] End game

**Exit Criteria**

The entire game is fully playable.

---

# Phase 5 — User Experience

## Goal

Improve usability without changing gameplay.

### Milestone 5.1 — Bottom Sheet

- [ ] Players
- [ ] Game Log
- [ ] Hint History

---

### Milestone 5.2 — Feedback

- [ ] Loading states
- [ ] Error messages
- [ ] Empty states

---

### Milestone 5.3 — Responsive Improvements

- [ ] Small devices
- [ ] Tablets
- [ ] Orientation support

---

### Milestone 5.4 — Performance

- [ ] Render optimization
- [ ] Component cleanup
- [ ] Network optimization

**Exit Criteria**

Smooth gameplay across supported devices.

---

# Phase 6 — Deployment

## Goal

Deploy the MVP for real users.

### Milestone 6.1 — Production Build

- [ ] Environment variables
- [ ] Production configuration
- [ ] Build verification

---

### Milestone 6.2 — Oracle Cloud

- [ ] Deploy Express
- [ ] Configure MongoDB
- [ ] Configure Nginx
- [ ] HTTPS

---

### Milestone 6.3 — Telegram

- [ ] Configure BotFather
- [ ] Configure Mini App URL
- [ ] Production testing

**Exit Criteria**

The application is publicly accessible through Telegram.

---

# Definition of Done

A milestone is considered complete only when:

- Feature implementation is complete.
- TypeScript has no errors.
- ESLint passes.
- Manual testing succeeds.
- Existing functionality remains intact.
- Documentation is updated if necessary.
- Changes are committed to Git.

---

# Git Commit Convention

Use Conventional Commits.

Examples:

```
feat(room): implement room creation

feat(game): add hint system

feat(board): render game board

fix(socket): handle reconnect

refactor(game): simplify turn logic

docs: update roadmap

chore: configure eslint
```

---

# Working Workflow

For every milestone:

1. Read the milestone requirements.
2. Ask GitHub Copilot to implement **only that milestone**.
3. Review the generated code.
4. Run and test the application.
5. Fix issues if necessary.
6. Commit the completed work.
7. Move to the next milestone.

Never work on multiple unrelated milestones simultaneously.

---

# Success Criteria

The completed MVP should:

- Run entirely inside Telegram.
- Support private multiplayer rooms.
- Synchronize gameplay in real time.
- Provide a polished mobile-first experience.
- Keep all game logic authoritative on the server.
- Maintain a clean and extensible architecture.
- Serve as a stable foundation for future releases without major refactoring.
