# Flip7 Stats Tab Design Reference

This document is the active visual and interaction reference for Ember's Stats tab.
It does not replace the dark cinematic design used by Home, Browse, Library, Search,
Seasonal, or Watch.

The original Flip7 design language is retro, playful, tactile, teal/coral/gold, and
game-like. For Ember, that language should be translated into a playful personal
analytics dashboard: warm cards, strong progress bars, tactile stat panels, and clear
success/failure states.

## What The Stats Tab Should Borrow

- Tactile buttons with clear active and pressed states.
- Short micro-interactions that finish quickly.
- Strong state feedback for success, warning, and failure.
- Friendly empty states that tell the user what happened.
- Consistent spacing and touch targets.
- Subtle glow or border accents for selected controls.
- Clear visual hierarchy between primary and secondary actions.

## What The Stats Tab Should Not Borrow Literally

- Game-specific logo treatments.
- Folded ribbon headers.
- Confetti, crown, BOOM, or scoring-specific animations.
- Emoji-led section titles.
- WeChat mini-program units such as `rpx`.

## Stats-Specific Translation

### Buttons

- primary action: strong accent fill
- secondary action: glass/ghost treatment
- destructive or failure action: red/error treatment

### Cards

- warm cream card surfaces
- teal/coral/gold/sky accent bars
- rounded tactile stat panels
- subtle hover lift
- readable metadata and progress values

### Motion

- button and card feedback should stay under 500ms
- no decorative celebration animations in the streaming UI
- progress and status transitions should feel responsive

## Active Stats Direction

The Stats tab should feel like a bright personal scorecard inside the broader Ember app:

- teal, coral, gold, sky, and cream surfaces
- rounded tactile stat cards
- dashed section dividers
- visible progress bars
- strong rating/completion highlights
- responsive card grids and compact title rows

Use this file for the Stats tab only. Other tabs should continue following
`INSTRUCTIONS.md` and Ember's cinematic streaming layout.
