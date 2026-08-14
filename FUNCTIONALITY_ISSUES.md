# Functionality & Incomplete Code Issues

## Critical Issues - Incomplete Implementation

### 1. **Missing Hint Input Form in Game Screen** 🔴

**File:** [Game.tsx](client/src/pages/Game/Game.tsx#L914-L950)  
**Severity:** CRITICAL - Game Breaking  
**Issue:** The spymaster hint submission area doesn't have input fields for entering word and number.

**Current code (Lines 914-950):**

```jsx
<div className="mt-4 flex items-center gap-3 rounded-full bg-[#2b2b2b] px-3 py-3 shadow-inner">
  <div className="flex-1 rounded-full bg-white/90 px-4 py-3 text-left text-xl font-black uppercase tracking-tight text-black">
    {state.game.currentHintWord ?? "YOUR CLUE"}  {/* <-- Display only, no input */}
  </div>
  <button type="button" className="..." onClick={() => setHintDraft(...)>
    −
  </button>
  <button type="button" onClick={handleSubmitHintClick} ...>
    ↑
  </button>
  <button type="button" onClick={handlePassTurn} ...>
    ⏭
  </button>
</div>
```

**Problem:**

- The display div is hard-coded to show `currentHintWord` (the hint that was ALREADY submitted)
- No input fields exist for the spymaster to TYPE the hint
- The minus/plus buttons have handlers that try to update `hintDraft` state, but no way to interact with them
- State shows `hintDraft: { word: "", number: "" }` exists but has nowhere to be modified by user

**Missing Components:**

1. Input field for hint word (text input)
2. Input field for hint number (number input)
3. Logic to show form only when `canSubmitHint = true`
4. Logic to show submitted hint when `hasActiveHint = true`

**Fix:** Need to add conditional rendering:

```jsx
{
  canSubmitHint ? (
    /* Show input form for spymaster to enter hint */
    <form onSubmit={handleSubmitHint}>
      <input
        type="text"
        value={hintDraft.word}
        onChange={(e) =>
          setHintDraft((current) => ({ ...current, word: e.target.value }))
        }
        placeholder="Enter word"
      />
      <input
        type="number"
        value={hintDraft.number}
        onChange={(e) =>
          setHintDraft((current) => ({ ...current, number: e.target.value }))
        }
        placeholder="Number"
      />
      <button type="submit">Submit</button>
    </form>
  ) : (
    /* Show submitted hint */
    <div>
      {state.game.currentHintWord} ({state.game.currentHintNumber})
    </div>
  );
}
```

---

### 2. **Hint Controls Are Non-Functional Without Input** 🔴

**File:** [Game.tsx](client/src/pages/Game/Game.tsx#L920-L932)  
**Severity:** CRITICAL  
**Issue:** Minus/submit buttons have no visible input fields to control

**Current code:**

```jsx
<button onClick={() => setHintDraft((current) => ({ ...current, word: current.word || "" }))}>
  − {/* What does this do with no input? */}
</button>
<button onClick={handleSubmitHintClick} aria-label="Submit clue">
  ↑ {/* Submit what? */}
</button>
```

**Problem:** The button handlers don't make sense without visible inputs

---

## Medium Priority Issues

### 3. **Lobby Assignment Handler Not Sending Toast Feedback**

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L399-L413)  
**Severity:** MEDIUM - Silent Failures  
**Issue:** `handleAssignmentChange` uses `setFeedback()` instead of `toast` for errors

**Current code:**

```typescript
function handleAssignmentChange(...) {
  if (!socket || !room || !user) {
    setFeedback("Socket connection is unavailable.");  // Hidden if feedback panel not shown
    return;
  }
  socket.emit("room:updateTeam", {...});
  // NO SUCCESS FEEDBACK
}
```

**Problem:**

- User won't see confirmation when joining team
- Silent failures if socket is disconnected
- Inconsistent with other handlers that use `toast`

**Fix:** Use `toast` for all feedback:

```typescript
function handleAssignmentChange(...) {
  if (!socket || !room || !user) {
    toast.error("Socket connection is unavailable.");
    return;
  }
  socket.emit("room:updateTeam", {...});
  toast.info("Joining team...");  // Add success feedback
}
```

---

### 4. **Word Pack Editor Doesn't Save to Form State**

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L287-L296)  
**Severity:** MEDIUM - Feature Incomplete  
**Issue:** `WordPackEditor` component manages its own state (`text`) but never updates parent `settingsForm.wordPack`

**Current code:**

```typescript
function WordPackEditor() {
  const [text, setText] = useState("");  // Local state only
  return (
    <textarea value={text} onChange={(e) => setText(e.target.value)} />
  );
}
```

**Problem:**

- User types words but they're not saved anywhere
- No "Save" button or submit handler
- Closing popup loses all typed text
- Form state never gets updated

**Fix:** Need to either:

1. Accept `onSave` callback and parent state, OR
2. Save to `settingsForm` when popup closes

---

### 5. **Lobby Settings Popup Title Map Includes Unused Actions**

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L318-L330)  
**Severity:** MEDIUM - Code Quality  
**Issue:** `titleMap` includes "shuffle" and "reset" but these aren't used in popup (they're separate buttons)

**Current code:**

```typescript
const titleMap: Record<HostControlAction, string> = {
  "game-mode": "Game mode",
  timer: "Timer",
  language: "Language",
  "word-pack": "Word pack",
  shuffle: "Shuffle teams", // ← Not used, separate button outside
  reset: "Reset teams", // ← Not used, separate button outside
};
```

**Problem:**

- Misleading code - suggests these open popups but they don't
- HostControlAction type includes unused values
- Confusing for maintenance

**Fix:** Remove "shuffle" and "reset" from both type and titleMap

---

### 6. **handleAddBot() Sends Silent Error**

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L245-L254)  
**Severity:** MEDIUM - Inconsistent Error Handling  
**Issue:** `handleAddBot()` uses `setFeedback()` while similar handlers use `toast.error()`

**Current code:**

```typescript
function handleAddBot() {
  if (!socket || !room) {
    setFeedback("Socket connection is unavailable.");  // Hidden
    return;
  }
  socket.emit("room:addBot", {...});
  toast.info("Adding bot to the room...");  // Only success message
}
```

**Fix:** Use `toast` for all errors consistently:

```typescript
if (!socket || !room) {
  toast.error("Socket connection is unavailable.");
  return;
}
```

---

### 7. **Game Screen "News" Button Not Implemented**

**File:** [Game.tsx](client/src/pages/Game/Game.tsx#L730-L740)  
**Severity:** MEDIUM - Placeholder UI  
**Issue:** "News" button with badge has no functionality

**Current code:**

```jsx
<button type="button" className="...">
  News
  <span className="...">25</span> {/* Hard-coded "25" */}
</button>
```

**Problem:**

- Button does nothing on click
- Badge number is hard-coded
- Unclear if this is a placeholder or incomplete feature

---

### 8. **Game Screen "Rules" Button Not Implemented**

**File:** [Game.tsx](client/src/pages/Game/Game.tsx#L741-L748)  
**Severity:** MEDIUM - Placeholder UI  
**Issue:** "Rules" button has no functionality

**Current code:**

```jsx
<button type="button" className="...">
  Rules
</button>
```

**Problem:** Button does nothing on click

---

### 9. **Settings Panel Not Fully Connected**

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L275-L280)  
**Severity:** MEDIUM - Incomplete Feature  
**Issue:** `handleSettingsSave()` is called but `LobbySettingsPanel` doesn't have save button

**Current code in Lobby.tsx:**

```typescript
const handleSettingsSave = () => {
  // Implementation exists
  socket.emit("room:updateSettings", {...});
};
```

**Current code in LobbySettingsPanel.tsx:**

- Component receives `onSaveSettings` prop but never calls it
- Settings change immediately with no explicit save
- No "Save" button in the panel

**Problem:**

- Settings might be applied immediately without confirmation
- `onSaveSettings` prop is passed but unused
- Inconsistent UX (some settings have buttons, some don't)

---

## Low Priority Issues

### 10. **Unused `avatarGenerating` State**

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L102)  
**Severity:** LOW - Dead Code  
**Issue:** State variable exists but is never set or displayed

**Current:** `const [avatarGenerating, setAvatarGenerating] = useState(false);`  
**Problem:** Initialized but never used  
**Fix:** Remove or implement loading UI

---

### 11. **Unused `feedback` State in Lobby**

**File:** [Lobby.tsx](client/src/pages/Lobby/Lobby.tsx#L110)  
**Severity:** LOW - Inconsistent Error Handling  
**Issue:** `setFeedback()` is called in some handlers, but `feedback` panel might not be visible

**Current:**

- Panel only shows if `feedback` is set (line 516-529)
- But some errors use `setFeedback()` while others use `toast.error()`
- Inconsistent pattern

**Fix:** Use `toast` consistently everywhere

---

### 12. **Game Settings Popup "Close" Button Outside Popup**

**File:** [Game.tsx](client/src/pages/Game/Game.tsx#L445-L456)  
**Severity:** LOW - UX Confusion  
**Issue:** Popup includes a "Close" button that should be in the header

**Current:**

```jsx
registerPopup(
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div>Room settings</div>
      <button onClick={closePopup}>Close</button> {/* Duplicate close */}
    </div>
    {/* Content */}
  </div>,
);
```

**Problem:** Header already has a close button, this is redundant

---

### 13. **No Hint History Display**

**File:** [Game.tsx](client/src/pages/Game/Game.tsx)  
**Severity:** LOW - Missing Feature  
**Issue:** `state.game.hintHistory` is tracked but never displayed

**Problem:** Players can't see previous hints in the game  
**Fix:** Add hint history display panel

---

### 14. **KeyCard Toggle Function Missing**

**File:** [Game.tsx](client/src/pages/Game/Game.tsx#L743-L751)  
**Severity:** LOW - Incomplete Functionality  
**Issue:** Settings button calls `setShowKeycard()` but component doesn't render keycard UI

**Current:**

```jsx
<button onClick={() => setShowKeycard((current) => !current)}>⚙</button>
// ... but no KeyCard component rendered based on showKeycard state
```

**Problem:** Toggling does nothing; no keycard shown

---

### 15. **Minus Button Decrement Logic Missing**

**File:** [Game.tsx](client/src/pages/Game/Game.tsx#L920-L927)  
**Severity:** LOW - Incomplete  
**Issue:** Minus button has no actual decrement logic

**Current:**

```jsx
<button
  onClick={() =>
    setHintDraft((current) => ({ ...current, word: current.word || "" }))
  }
>
  − {/* This doesn't actually decrement anything */}
</button>
```

**Problem:** Button should decrement number but just re-assigns word to itself

---

## Summary Table

| #   | Issue                          | File      | Severity    | Type            | Status                |
| --- | ------------------------------ | --------- | ----------- | --------------- | --------------------- |
| 1   | Missing hint input form        | Game.tsx  | 🔴 CRITICAL | Incomplete UI   | Blocking gameplay     |
| 2   | Hint controls non-functional   | Game.tsx  | 🔴 CRITICAL | Incomplete UI   | Blocking gameplay     |
| 3   | Team assignment no feedback    | Lobby.tsx | 🟡 MEDIUM   | UX              | Silent failures       |
| 4   | Word pack editor no save       | Lobby.tsx | 🟡 MEDIUM   | Incomplete      | Feature unusable      |
| 5   | Unused type values in titleMap | Lobby.tsx | 🟡 MEDIUM   | Code Quality    | Misleading code       |
| 6   | addBot() silent error          | Lobby.tsx | 🟡 MEDIUM   | Error Handling  | Inconsistent          |
| 7   | News button not implemented    | Game.tsx  | 🟡 MEDIUM   | Placeholder     | Non-functional        |
| 8   | Rules button not implemented   | Game.tsx  | 🟡 MEDIUM   | Placeholder     | Non-functional        |
| 9   | Settings panel incomplete      | Lobby.tsx | 🟡 MEDIUM   | Feature         | Partially working     |
| 10  | Unused avatarGenerating state  | Lobby.tsx | 🟢 LOW      | Dead Code       | Minor                 |
| 11  | Inconsistent feedback pattern  | Lobby.tsx | 🟢 LOW      | Code Quality    | Minor                 |
| 12  | Duplicate close button         | Game.tsx  | 🟢 LOW      | UX              | Minor                 |
| 13  | No hint history display        | Game.tsx  | 🟢 LOW      | Missing Feature | Nice-to-have          |
| 14  | KeyCard toggle incomplete      | Game.tsx  | 🟢 LOW      | Missing Feature | Feature not working   |
| 15  | Minus button logic wrong       | Game.tsx  | 🟢 LOW      | Bug             | Non-functional button |

---

## Recommended Fix Priority

1. **CRITICAL (Fix Before Release):**
   - Issue #1: Missing hint input form
   - Issue #2: Hint controls functionality

2. **HIGH (Fix Soon):**
   - Issue #3: Team assignment feedback
   - Issue #4: Word pack editor save
   - Issue #9: Settings panel connection

3. **MEDIUM (Cleanup):**
   - Issues #5, #6: Error handling consistency
   - Issues #7, #8: Button implementations

4. **LOW (Nice-to-have):**
   - Issues #10-15: Code quality and polish
