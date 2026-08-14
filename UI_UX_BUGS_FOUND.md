# UI/UX Bugs & Issues Found

## Critical Issues

### 1. **Ambiguous "Join team" Button Text** ⚠️

**File:** [LobbyAssignmentsPanel.tsx](client/src/pages/Lobby/LobbyAssignmentsPanel.tsx#L43)  
**Severity:** High  
**Issue:** All four "Join team" buttons say "Join team" regardless of whether it's operative or spymaster role.

**Current behavior:**

- Operative section button: "Join team"
- Spymaster section button: "Join team"

**Problem:** Users don't know if they're joining as an operative or spymaster until they click.

**Fix:** Change button text to be role-specific:

```
- Operatives: "Join as operative"
- Spymasters: "Join as spymaster"
```

---

### 2. **"Join team" Button Doesn't Indicate Team Color** ⚠️

**File:** [LobbyAssignmentsPanel.tsx](client/src/pages/Lobby/LobbyAssignmentsPanel.tsx#L43)  
**Severity:** Medium  
**Issue:** Buttons use the same green color (#2cc86c) for both blue and red teams, making it unclear which team you're joining.

**Current behavior:**

- Blue team → "Join team" (green button)
- Red team → "Join team" (green button)

**Problem:** Users might not realize they're joining different teams; lack of color association.

**Fix:** Make button colors match team colors or at least vary between sections:

```
- Blue team buttons: Blue-tinted color (e.g., #2f7ec7 or lighter)
- Red team buttons: Red-tinted color (e.g., #ef5b5b or lighter)
```

---

### 3. **Unused Feedback State Variable** ⚠️

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L110)  
**Severity:** Medium  
**Issue:** `feedback` state is set in error handlers but not always visible to users:

- `setFeedback("Socket connection is unavailable.")` in multiple places
- The feedback panel is conditionally rendered and may not show all error scenarios
- Users calling `handleAddBot()`, `handleAssignmentChange()` get silent failures

**Current:** Line 516-529 shows feedback is rendered but only for specific cases  
**Problem:** Socket connection errors are silently ignored instead of shown to user  
**Fix:** Replace `setFeedback` with `toast.error()` to ensure consistent error visibility

---

### 4. **Race Condition: Settings Form Initialization**

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L109-114)  
**Severity:** Medium  
**Issue:** Settings form is initialized with hardcoded defaults before room data loads:

```typescript
const [settingsForm, setSettingsForm] = useState<SettingsFormState>({
  maxPlayers: 16,
  allowSpectators: false,
  ...
});

useEffect(() => {
  if (!room) return;
  setSettingsForm(room.settings);
}, [room]);
```

**Problem:** If settings popup opens before room loads, stale defaults are shown  
**Fix:** Initialize `settingsForm` to `null` and show loading state in popup, or sync on effect with cleanup

---

### 5. **Missing "Current Player" Visual Indicator**

**File:** [LobbyAssignmentsPanel.tsx](client/src/pages/Lobby/LobbyAssignmentsPanel.tsx#L14-23)  
**Severity:** Low-Medium  
**Issue:** When displaying player avatars in the PlayerList, there's no visual distinction for the current logged-in player.

**Current:** All avatars look identical  
**Problem:** Users can't easily spot themselves in the player list  
**Fix:** Add a border/badge/glow effect to current player's avatar (e.g., green ring)

---

## UX/Workflow Issues

### 6. **Settings Panel Title Inconsistency**

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L323-330)  
**Issue:** Title map includes actions like "shuffle" and "reset" but these don't open the settings popup (they're separate buttons).

**Current mapping:**

```typescript
const titleMap: Record<HostControlAction, string> = {
  "game-mode": "Game mode",
  ...
  "shuffle": "Shuffle teams",    // Not used in popup
  "reset": "Reset teams",         // Not used in popup
};
```

**Problem:** Misleading title map suggests these actions open popups  
**Fix:** Remove "shuffle" and "reset" from `HostControlAction` type and handle them as direct button actions

---

### 7. **Spectator Display Overflow on Mobile**

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L577-593)  
**Issue:** Spectators section uses `overflow-x-auto` but spectator player cards have `whitespace-nowrap` + `text-xs` which might still overflow on small screens.

**Fix:** Consider pagination or "show more" pattern for >5 spectators

---

### 8. **Language Options Hardcoded in Component**

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L331-345)  
**Issue:** Language options are hardcoded in the component but should be centralized.

**Current:**

```typescript
{ value: "en", label: "English" },
{ value: "fa", label: "Farsi" },
...
```

**Problem:** Duplicates language map, hard to maintain  
**Fix:** Move to `shared/src/constants/` and import

---

## Additional Issues Found in Game Flow

### 9. **Missing Hint Message Persistence** ⚠️

**File:** [Game.tsx](client/src/pages/Game/Game.tsx#L556)  
**Severity:** Low  
**Issue:** `hintMessage` state is set but persists across rounds, potentially showing stale messages from previous turns.

**Problem:** Users might see "Unable to submit hint" from a previous turn even after successfully submitting  
**Fix:** Clear `hintMessage` when new hint is received or on turn change

---

### 10. **Avatar Generation Loading State Not Displayed**

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L102)  
**Issue:** `avatarGenerating` state exists but is never used in the UI.

**Fix:** Show spinner/skeleton while avatars are generating

---

### 11. **Feedback Messages Not Displayed in Home Page**

**File:** [Home.tsx](client/src/pages/Home/Home.tsx#L32)  
**Severity:** Medium  
**Issue:** `feedback` state is set on create/join room but the feedback panel rendering is cut off in provided code. Users might not see success/error messages.

**Current:**

```typescript
setFeedback("Joined room successfully.");
setFeedback("Room created successfully.");
```

**Problem:** If feedback panel isn't rendered or is hidden, users get no confirmation  
**Fix:** Ensure feedback panel is always visible, or use toast notifications

---

### 12. **Timer Format Inconsistency**

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L365-372)  
**Severity:** Low  
**Issue:** Timer options hardcoded as strings "none" | "30" | "60" | "90" but SettingsFormState type uses the same approach, making it unclear if these are milliseconds or seconds.

**Fix:** Add comment clarifying these are in seconds, or use an enum with descriptive names

---

### 13. **Word Pack Editor State Lost on Popup Close** ⚠️

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L287-L296)  
**Severity:** Low  
**Issue:** `WordPackEditor` is a component defined inside `LobbyPage` that manages its own state (`text`), but if the user types words and closes the popup without saving, the data is lost with no warning.

**Problem:** User might type custom words, accidentally close popup, and lose them all  
**Fix:** Either persist to component state or show "unsaved changes" warning

---

### 14. **"Only room owner can..." Messages Not Visible**

**File:** [Game.tsx](client/src/pages/Game/Game.tsx#L476-L479)  
**Severity:** Low  
**Issue:** When non-owner tries to reset/randomize teams, only a UI message shows, but no toast notification (for consistency with other errors)

**Problem:** Inconsistent error notification pattern  
**Fix:** Use `toast.error()` instead of just UI message

---

### 15. **Hint Submission Timeout Not Managed**

**File:** [Game.tsx](client/src/pages/Game/Game.tsx#L556)  
**Severity:** Low  
**Issue:** When submitting hint via socket, there's no timeout if server doesn't respond. Form could appear stuck.

**Fix:** Add `setTimeout` to auto-clear `hintSubmitting` after ~5s

---

## Minor Issues

### 16. **Accessibility: Missing alt text on some avatars**

**File:** [LobbyAssignmentsPanel.tsx](client/src/pages/Lobby/LobbyAssignmentsPanel.tsx#L21)  
**Issue:** Avatar images have `alt` text, which is good, but could be more descriptive for screen readers

**Fix:** Consider role-specific alt text like "Player name - Operative" or "Player name - Spymaster"

---

## Summary of Fixes Required

| Issue                           | File                      | Priority | Type          |
| ------------------------------- | ------------------------- | -------- | ------------- |
| Ambiguous button text           | LobbyAssignmentsPanel.tsx | High     | UX            |
| Button color doesn't match team | LobbyAssignmentsPanel.tsx | High     | UX            |
| Unused feedback state           | Lobby.tsx                 | Medium   | Bug           |
| Settings form race condition    | Lobby.tsx                 | Medium   | Bug           |
| Feedback not displayed          | Home.tsx                  | Medium   | Bug           |
| Hint message persistence        | Game.tsx                  | Low      | UX            |
| No current player indicator     | LobbyAssignmentsPanel.tsx | Low      | UX            |
| Title map inconsistency         | Lobby.tsx                 | Low      | Bug           |
| Spectator overflow              | Lobby.tsx                 | Low      | UX            |
| Word pack editor state          | Lobby.tsx                 | Low      | UX            |
| Room owner messages not toasted | Game.tsx                  | Low      | Bug           |
| Hint submission timeout         | Game.tsx                  | Low      | Bug           |
| Avatar generation state unused  | Lobby.tsx                 | Low      | Bug           |
| Timer format unclear            | Lobby.tsx                 | Low      | Tech Debt     |
| Avatar alt text clarity         | LobbyAssignmentsPanel.tsx | Low      | Accessibility |
