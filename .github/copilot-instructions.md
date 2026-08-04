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
