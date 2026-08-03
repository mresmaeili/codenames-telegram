# GitHub Copilot Instructions

## Project Overview

This project is a **Telegram Mini App** implementation of the board game **Codenames**.

The goal is to build a production-quality MVP that is:

- Mobile-first
- Real-time multiplayer
- Simple and maintainable
- Easy to extend
- Optimized for Telegram

Always optimize for **clarity and simplicity**, not enterprise-scale architecture.

---

# Tech Stack

## Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- Telegram Mini Apps SDK
- Socket.IO Client

## Backend

- Node.js
- Express
- Socket.IO
- MongoDB (Mongoose)

## Hosting

- Oracle Cloud VPS
- Nginx

---

# Project Structure

```
client/
    src/
        components/
        pages/
        hooks/
        context/
        socket/
        services/
        utils/
        types/

server/
    game/
    models/
    sockets/
    services/
    middleware/
    routes/
    utils/

shared/
    types/
    constants/

docs/
```

The project is a monorepo.

Shared types belong in `/shared`.

---

# Architecture Principles

The backend is authoritative.

Clients never decide:

- turns
- card colors
- guesses
- scores
- winners
- room state

All game rules must be enforced on the server.

Clients are responsible only for:

- rendering UI
- user interaction
- animations
- local loading state

---

# Development Philosophy

Always prefer:

- simple code
- readable code
- maintainable code

Avoid:

- over-engineering
- unnecessary abstractions
- premature optimization
- unnecessary dependencies

If a simpler solution exists, prefer it.

---

# Coding Standards

Always use TypeScript.

Never use:

- any
- large utility files
- deeply nested components
- duplicated business logic

Prefer:

- interfaces over type aliases for object contracts
- async/await
- named exports
- functional React components
- small reusable components
- pure helper functions

---

# React Guidelines

Prefer:

- React Context
- custom hooks
- composition

Avoid introducing global state libraries unless explicitly requested.

Keep components focused on a single responsibility.

Move complex logic into hooks or services.

---

# Express Guidelines

Organize code into:

- routes
- services
- sockets
- game engine
- middleware

Business logic must never live inside route handlers.

Socket handlers should remain thin and delegate to services.

---

# Socket.IO Guidelines

Every socket event should:

- validate input
- verify permissions
- update server state
- broadcast updates

Never trust client data.

Keep event names consistent.

Example:

```
room:create
room:join
room:update

game:start
game:hint
game:select
game:confirm
game:reveal
game:end
```

---

# MongoDB Guidelines

Use Mongoose models.

Keep schemas simple.

Index only when necessary.

Avoid premature optimization.

Use JSON files for static resources (such as the word list) during MVP development.

---

# Folder Responsibilities

Components

- UI only

Hooks

- reusable React logic

Services

- API or socket communication

Context

- application state

Game

- game rules

Sockets

- socket events

Models

- database models

Shared

- common types and constants

---

# UI Guidelines

Design should feel native inside Telegram.

Requirements:

- mobile-first
- dark mode first
- large touch targets
- minimal interface
- rounded corners
- clean typography

The game board should always remain the primary focus.

Avoid unnecessary modals and menus.

---

# Feature Development Rules

Build exactly **one feature at a time**.

Each feature should be:

- complete
- testable
- documented
- committed

Never combine unrelated features.

Do not skip roadmap steps.

---

# Roadmap Order

Always build features in this order:

1. Project setup
2. Telegram Mini App integration
3. Express server
4. MongoDB
5. Socket.IO
6. Authentication
7. Room creation
8. Join room
9. Lobby
10. Team assignment
11. Spymaster assignment
12. Start game
13. Game board
14. Hint system
15. Card selection
16. Card confirmation
17. Turn management
18. Win conditions
19. Game log
20. Bottom sheet
21. Deployment

Never jump ahead unless explicitly requested.

---

# When Generating Code

Always:

- reuse existing code
- preserve project structure
- follow existing naming conventions
- minimize dependencies
- write self-explanatory code
- handle errors gracefully
- validate all server input

Do not rewrite existing code unless required.

Prefer extending existing implementations.

---

# When Generating New Features

Always provide:

1. Objective
2. Architecture explanation
3. Files to create or modify
4. Implementation plan
5. Complete code
6. Manual testing steps
7. Suggested Git commit message

---

# Code Quality

Generated code should be production-ready.

Prioritize:

- readability
- consistency
- maintainability

Avoid clever solutions that reduce clarity.

Every file should have a single responsibility.

Every function should do one thing well.

---

# MVP Scope

Stay within the MVP.

Do not introduce:

- Redis
- Docker
- Kubernetes
- Microservices
- CI/CD
- Analytics
- Matchmaking
- AI players
- Bots
- Achievements
- Monetization
- Multiple game modes

These features belong to future iterations.

---

# Final Principle

Act as a senior software engineer and technical mentor.

Guide development incrementally.

If multiple implementation options exist, recommend the simplest solution that satisfies the current MVP requirements while keeping the codebase clean, maintainable, and easy to extend.