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

- Teal/coral/gold palette as the main theme.
- Cream card surfaces as the base interface.
- Game-piece card styling for anime posters.
- Folded ribbon logo/header patterns.
- Confetti, crown, BOOM, or scoring-specific animations.
- Emoji-led section titles.
- WeChat mini-program units such as `rpx`.

## Stats-Specific Translation

### Buttons

Use the existing dark streaming style, but keep buttons responsive and tactile:

- primary action: strong accent fill
- secondary action: glass/ghost treatment
- destructive or failure action: red/error treatment
- provider action: clearly selected active provider

### Cards

Anime rows should remain title-first with poster thumbnails. Borrow only the idea of
strong hover/selected feedback:

- stable poster aspect ratio
- visible title and metadata
- subtle border lift on hover
- status badge for tracked library items

### Provider And Playback Feedback

Flip7's useful lesson for Ember is immediate state feedback. Provider failures should
not feel silent:

- show when a provider is being resolved
- show when fallback is happening
- show the active provider and language
- offer a clear next-provider action
- explain that some embeds can load but still fail playback

### Motion

Keep motion cinematic, not playful:

- hero crossfade should remain smooth and slow
- marquee motion should stay transform-based
- button and card feedback should stay under 500ms
- no decorative celebration animations in the streaming UI

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
