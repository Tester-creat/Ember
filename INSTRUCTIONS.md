#### **🧑 \[P\] Persona**

You are a **senior vanilla JavaScript UI engineer** with deep expertise in custom dropdown components, floating layer management, and glassmorphism design systems. You build accessible, keyboard-friendly custom selects without any external libraries, and you are precise about keeping ephemeral UI state (open/closed, active group) in sync with application state (current episode) at all times.

---

#### **🎯 \[T\] Task**

In the **Ember project** (`https://github.com/Tester-creat/Ember`), the episode grouping feature currently renders all group selectors as a **row of visible buttons** — for long series like One Piece (1,160+ episodes, 29+ groups of 40), this fills the entire episode sidebar with group buttons and pushes the actual episode list completely out of view.

**Replace the group button row with a single compact custom-styled dropdown** that:

* Shows only one line in the sidebar when collapsed  
* Expands into a floating scrollable list when clicked  
* Displays and loads the correct episode group when a range is selected  
* Stays in sync with episode navigation at all times

This is a **UI-only replacement** — the 40-episode grouping logic, the `uiState` group tracking, and the `paintEpisodeList()` partial update mechanism implemented previously must remain completely intact. Only the **rendering of the group selector itself** changes.

---

#### **🎯 Precise Implementation Requirements**

**The Dropdown Button (collapsed state):**

* A single `<button class="episode-group-btn">` that spans the full width of the episode sidebar  
* Label format: `Episodes {start} – {end} ▾` — e.g. `Episodes 1 – 40 ▾`, `Episodes 41 – 80 ▾`  
* The label must **update automatically** whenever the active group changes — whether triggered by the user picking a group from the dropdown, clicking an episode directly, or navigating with keyboard shortcuts (`←` / `→`)  
* The `▾` chevron must **rotate 180°** when the dropdown is open, and return to default when closed — use a CSS `transform: rotate()` transition, not a separate icon swap  
* Styled with Ember's glassmorphism tokens: `background: var(--glass)`, `backdrop-filter: blur(...)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-md)`, appropriate `--space-*` padding

**The Dropdown List (expanded state):**

* A `<ul class="episode-group-list">` that **floats below** the button using `position: absolute` — it must not push the episode list downward or affect the layout of any surrounding elements  
* `z-index` must be high enough to float above the episode list items below it (use `z-index: 200` or confirm against Ember's existing z-index scale)  
* Width must match the button exactly (`width: 100%` relative to the positioned parent)  
* Maximum height: `240px` with `overflow-y: auto` and a styled scrollbar — so even 29+ groups remain navigable without the list growing infinitely tall  
* Each list item: `<li data-group="{index}">Episodes {start} – {end}</li>` — full-width, hover state using `var(--glass-hover)` or equivalent, `cursor: pointer`  
* The **currently active group** must be visually highlighted in the list (e.g. `background: var(--accent)` at reduced opacity, or a left accent border) so the user can see at a glance which group is loaded  
* Styled with the same glassmorphism treatment as the button: glass background, blur, border, matching border-radius  
* A subtle `box-shadow` to lift it above the content beneath

**Open/Close Behaviour:**

* Clicking the button toggles the dropdown open/closed  
* Clicking **anywhere outside** the dropdown (document-level click listener) closes it — the listener must be added on open and removed on close to avoid memory leaks  
* Pressing `Escape` while the dropdown is open must close it and return focus to the button  
* The dropdown must also close automatically after the user selects a group (after triggering the episode list update)  
* If the dropdown is open and `paintEpisodeList()` is called by keyboard navigation, the dropdown must close to avoid stale group labels

**Selecting a Group:**

* Clicking a list item must: (1) update `uiState.activeGroup` (or Ember's equivalent) to the selected group index, (2) call `paintEpisodeList()` to render that group's 40 episodes, (3) update the button label to the new range, (4) close the dropdown  
* This must be **identical in outcome** to what happened when the old group buttons were clicked — the only difference is the trigger mechanism

**Auto-sync with Episode Navigation:**

* When the user navigates to a new episode via keyboard (`←` / `→`), episode click, or auto-next, the active group must recalculate: `activeGroup = Math.floor((episodeNumber - 1) / 40)`  
* After recalculation, the **button label must update immediately** to reflect the new group range — even if the dropdown is closed  
* If the new episode is in a different group than the currently loaded one, `paintEpisodeList()` must be called for the new group automatically

**Visibility rule — unchanged from previous implementation:**

* The entire dropdown (button \+ list) must only render when total episodes exceed 40  
* For series with 40 or fewer episodes, no group selector element must exist in the DOM at all

---

#### **🗂️ \[C\] Context**

**Current state of the codebase (from previous implementation):**

* Episode grouping is already implemented with 40-episode chunks  
* Group selector currently renders as a row/grid of `<button>` elements — this is the element being replaced  
* Active group is tracked in `uiState` (confirm exact property name by reading `app.js`)  
* `paintEpisodeList()` handles all episode list DOM updates as a partial update — do NOT replace this with a full `renderApp()` call  
* The episode sidebar has `overflow: visible` (fixed in previous implementation) to support `position: sticky` — the dropdown's `position: absolute` requires its **parent container to have `position: relative`** — verify this is set on the sidebar or group selector wrapper, and add it if missing

**Ember design system:**

* CSS custom properties: `--glass`, `--border`, `--accent`, `--space-2`, `--space-3`, `--space-4`, `--radius-sm`, `--radius-md`, `--radius-lg` — use exclusively, no hardcoded colour values  
* Transitions: match Ember's existing transition duration (likely `0.2s ease` or `0.15s ease`) — confirm by checking existing animated elements in `styles.css`  
* Scrollbar styling: if Ember styles scrollbars elsewhere (`::-webkit-scrollbar`), apply the same pattern to the dropdown list's scrollbar

**Do not:**

* Use any `<select>` or `<option>` elements — this must be a fully custom component  
* Attach permanent document-level click listeners — add on open, remove on close  
* Trigger `renderApp()` for any part of this feature — all updates are partial DOM mutations  
* Hardcode any colours, border-radii, or spacing values — CSS custom properties only  
* Break keyboard episode navigation (`←` / `→`), the `M` mark-watched shortcut, or provider switching

---

#### **📋 \[F\] Format**

Deliver in this exact structure:

**1\. Pre-flight Audit**

* Confirm the exact name of the current group selector rendering code (the button row being replaced)  
* Confirm the `uiState` property name for active group and current episode number  
* Confirm whether the sidebar wrapper already has `position: relative` set  
* Confirm Ember's transition duration from `styles.css`  
* Confirm whether Ember has custom scrollbar styles to replicate

**2\. `app.js` — Dropdown render function**

* `renderGroupDropdown(totalEpisodes, activeGroup)` — generates the button \+ `<ul>` HTML string  
* Show exactly where in the episode sidebar HTML this replaces the old button row  
* The `data-group` attribute approach for click delegation (no inline `onclick`)

**3\. `app.js` — Event handling additions**

* Click handler for the dropdown toggle button (open/close)  
* Click handler for list item selection (group change → `paintEpisodeList()` → label update → close)  
* Document-level outside-click handler (add on open, remove on close)  
* `Escape` key handler  
* The auto-sync logic: where in the episode navigation flow the button label recalculates

**4\. `styles.css` — New rules only**

* `.episode-group-btn` — collapsed button styles  
* `.episode-group-list` — floating list container (position, z-index, max-height, scroll, glass)  
* `.episode-group-list li` — item styles including hover and active-group highlight  
* `.episode-group-btn .chevron` — rotation transition for open/closed states  
* Scrollbar styling for `.episode-group-list` (matching Ember's pattern)

**5\. Verification Checklist**

* One Piece (1,160+ ep, 29 groups): dropdown shows correctly, all 29 options in scrollable list, selecting any group loads correct episodes  
* Short series (≤40 ep): no dropdown element exists in DOM  
* Episode keyboard navigation (`←` / `→`) crosses a group boundary: button label updates, new group's episodes load automatically  
* Dropdown closes on: outside click, Escape key, group selection  
* Chevron rotates on open, returns on close  
* No layout shift when dropdown opens — episode list stays in place, dropdown floats above it  
* No memory leaks: document listener is removed after dropdown closes

