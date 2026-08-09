# Sprint Plan V3

## Goal

Finish the remaining launch-critical work in a single short sprint by focusing on mobile polish, multiplayer robustness, and gameplay completion.

## Sprint priorities

### 1. Mobile lobby polish

- [ ] Adjust lobby layout to work cleanly on narrow screens
  - Collapse team panels vertically on mobile
  - Keep host action buttons easy to reach
  - Ensure copy/share room actions render without overflow
- [ ] Increase button padding and touch target size
- [ ] Verify modals, selects, and dropdowns are usable on mobile

### 2. Accessibility and feedback

- [ ] Add `aria-live` support for toast notifications
- [ ] Ensure `StatusPanel` updates announce to assistive tech
- [ ] Add accessible labels for host controls and team action buttons
- [ ] Validate focus order and keyboard behavior in the lobby

### 3. Reconnect / resume resilience

- [ ] Preserve room state across reconnects in the socket client
- [ ] Automatically rejoin the current room after a brief disconnect
- [ ] Prevent duplicate socket joins for the same user+room
- [ ] Add UI messaging for reconnecting and resumed state

### 4. Gameplay polish

- [ ] Add a board reveal animation for operatives
- [ ] Smooth transition between hidden board and revealed cards
- [ ] Improve the winner/end-game screen copy and layout
- [ ] Add a rematch/replay path in the game view
- [ ] Show basic session statistics (reveals, guesses, winner)

### 5. Final release prep

- [ ] Run full workspace build and smoke test
- [ ] Smoke test key flows on mobile viewport
- [ ] Fix any layout, toast, or socket edge cases discovered
- [ ] Update user-facing copy in lobby/game headers and buttons

## Recommended implementation order

1. Mobile lobby polish
2. Reconnect/resume support
3. Game reveal/end-game polish
4. Final build and regression pass

## Quick win tasks

- `client/src/pages/Lobby/Lobby.tsx` — simplify responsive structure and ensure host controls collapse elegantly.
- `client/src/context/ToastContext.tsx` — add `aria-live` to the toast container.
- `client/src/socket/client.ts` — implement reconnect state and automatic room resubscription.
- `client/src/pages/Game/Game.tsx` — add reveal animation and final winner modal.

## Notes

Keep the scope narrow: do not add new gameplay mechanics beyond the current hidden-board/keycard flow. The objective is launch-ready stability and polish, not feature expansion.
