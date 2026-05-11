# Design System Inspired by ShuttleTV

## 1. Visual Theme & Atmosphere

ShuttleTV's design system embodies a dark, immersive streaming experience infused with vibrant purple and blue accents. The interface balances premium entertainment content with smooth, accessible navigation through a deeply saturated palette of near-black backgrounds punctuated by glowing accent colors. This creates a cinematic atmosphere where content becomes the hero, with the UI receding into shadow to maximize visual real estate. The brand exudes modernity and energy through gradient-influenced purples and luminous blues, evoking a sense of discovery and motion—fitting for a platform dedicated to exploring endless entertainment possibilities.

**Key Characteristics**
- Deep dark backgrounds (`#171717`, `#262626`) for minimal distraction
- Vibrant purple and blue accent palette for interactive emphasis
- High contrast text on dark surfaces for legibility
- Gradient-ready color system with multiple purple-to-pink-to-blue transitions
- Minimal UI ornamentation emphasizing content discovery
- Clean, geometric layout with emphasis on horizontal scrolling tiles
- Smooth transitions and minimal visual weight on chrome elements

## 2. Color Palette & Roles

### Primary
- **Deep Purple** (`#A78BFA`): Primary interactive accent, used extensively across buttons, links, and highlight states
- **Vivid Purple** (`#AC4BFF`): Secondary accent for active states and emphasis
- **Bright Magenta** (`#E879F9`): Tertiary accent for hover states and focal points

### Accent Colors
- **Royal Blue** (`#1447E6`): Alternative primary accent, secondary CTAs
- **Bright Blue** (`#3080FF`): Accent highlights and decorative elements
- **Sky Blue** (`#60A5FA`): Light accent for soft emphasis and secondary actions

### Interactive
- **Action Red** (`#F87171`): Interactive element accents and non-critical alerts
- **Primary Interactive** (`#A78BFA`): Button text and link indicators

### Neutral Scale
- **White** (`#FFFFFF`): Primary text, backgrounds, and dominant surface
- **Off-White** (`#FAFAFA`): Secondary backgrounds and subtle surface elevation
- **Light Gray** (`#E5E5E5`): Tertiary text and disabled states
- **Medium Gray** (`#DFDFDF`): Borders and divider lines
- **Gray** (`#737373`): Dimmed text and secondary content
- **Dark Gray** (`#262626`): Surface backgrounds and containers
- **Darker Gray** (`#171717`): Primary dark backgrounds
- **Near Black** (`#000000`): Deepest backgrounds and strong contrast

### Semantic / Status
- **Success** (`#00C758`): Confirmation messages and positive states
- **Warning** (`#F99C00`): Cautionary alerts and non-critical warnings
- **Error** (`#FB2C36`): Error messages, failures, and critical alerts

### Surface & Borders
- **Border Light** (`#DFDFDF`): Primary border color for light themes
- **Surface Secondary** (`#FAFAFA`): Elevated secondary surfaces
- **Surface Dark** (`#262626`): Primary dark surface containers

## 3. Typography Rules

### Font Family
**Primary:** Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
**Secondary:** Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|---|---|
| **Display** | Geist | 48px | 700 | 56px | -0.02em | Hero titles and major headings |
| **Heading 1** | Geist | 36px | 700 | 44px | -0.015em | Page titles |
| **Heading 2** | Geist | 24px | 600 | 32px | -0.01em | Section headers, feature titles |
| **Heading 3** | Geist | 20px | 600 | 28px | 0em | Subsection headers |
| **Body Large** | Geist | 18px | 400 | 28px | 0em | Large body text blocks |
| **Body** | Geist | 16px | 400 | 20px | 0em | Primary body copy, descriptions |
| **Body Small** | Geist | 14px | 400 | 20px | 0.01em | Secondary copy, captions |
| **Label** | Geist | 13px | 500 | 19.5px | 0.02em | UI labels, buttons, metadata |
| **Code** | Geist Mono | 12px | 400 | 18px | 0em | Code blocks and technical text |

### Principles
- Hierarchy relies on size, weight, and case variation rather than color alone
- All heading text uses tight tracking (`letter-spacing: -0.01em` to `-0.02em`) for impact
- Body text maintains generous line-height (`1.25x` to `1.75x` font size) for readability on dark backgrounds
- Labels and UI text use medium weight (`500`) with slight letter-spacing for clarity
- Purple and blue accents may highlight key terms within body copy without disrupting hierarchy

## 4. Component Stylings

### Buttons

#### Primary Button
- **Background:** `#A78BFA`
- **Text Color:** `#FFFFFF`
- **Font Size:** `16px`
- **Font Weight:** `600`
- **Padding:** `12px 24px`
- **Border Radius:** `14px`
- **Border:** `none`
- **Line Height:** `24px`
- **Hover State:** Background `#9D7BEA`, no scale change
- **Active State:** Background `#8F6ADF`
- **Disabled State:** Background `#D4C5F9`, Text `#FFFFFF` with `opacity: 0.5`

#### Secondary Button
- **Background:** `rgba(172, 75, 255, 0.1)`
- **Text Color:** `#AC4BFF`
- **Font Size:** `16px`
- **Font Weight:** `600`
- **Padding:** `12px 24px`
- **Border Radius:** `14px`
- **Border:** `2px solid #AC4BFF`
- **Line Height:** `24px`
- **Hover State:** Background `rgba(172, 75, 255, 0.15)`, Border `#E879F9`
- **Active State:** Background `rgba(172, 75, 255, 0.2)`

#### Ghost Button
- **Background:** `transparent`
- **Text Color:** `#A78BFA`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Padding:** `8px 16px`
- **Border Radius:** `8px`
- **Border:** `1px solid rgba(167, 139, 250, 0.3)`
- **Line Height:** `24px`
- **Hover State:** Background `rgba(167, 139, 250, 0.1)`, Border `rgba(167, 139, 250, 0.5)`
- **Active State:** Background `rgba(167, 139, 250, 0.2)`

### Cards & Containers

#### Content Card (Movie/Series Tile)
- **Background:** `#262626`
- **Border:** `1px solid #DFDFDF`
- **Border Radius:** `14px`
- **Padding:** `0px` (image-driven)
- **Box Shadow:** `0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)`
- **Hover State:** Border `#A78BFA`, Box Shadow enhanced to `0px 8px 12px -2px rgba(167, 139, 250, 0.15)`
- **Image Container:** Full coverage with `border-radius: 14px`
- **Overlay (on hover):** Background `rgba(0, 0, 0, 0.4)`, Fade duration `200ms`

#### Metadata Card
- **Background:** `#171717`
- **Border:** `none`
- **Border Radius:** `8px`
- **Padding:** `16px`
- **Box Shadow:** `0px 1px 2px 0px rgba(0, 0, 0, 0.05)`
- **Text Color:** `#FFFFFF`
- **Secondary Text:** `#737373`

#### Surface Container
- **Background:** `#262626`
- **Border Radius:** `8px`
- **Padding:** `16px`
- **Border:** `1px solid #DFDFDF`
- **Transition:** All properties `200ms ease`

### Inputs & Forms

#### Text Input
- **Background:** `#171717`
- **Text Color:** `#FFFFFF`
- **Border:** `1px solid #DFDFDF`
- **Border Radius:** `8px`
- **Padding:** `12px 16px`
- **Font Size:** `16px`
- **Line Height:** `24px`
- **Placeholder Color:** `#737373`
- **Focus State:** Border `#A78BFA`, Box Shadow `0px 0px 0px 2px rgba(167, 139, 250, 0.1)`
- **Error State:** Border `#FB2C36`, Background `rgba(251, 44, 54, 0.05)`

#### Select / Dropdown
- **Background:** `#262626`
- **Text Color:** `#FFFFFF`
- **Border:** `1px solid #DFDFDF`
- **Border Radius:** `8px`
- **Padding:** `12px 16px`
- **Font Size:** `16px`
- **Arrow Color:** `#A78BFA`
- **Focus State:** Border `#A78BFA`

#### Checkbox
- **Size:** `20px × 20px`
- **Background (unchecked):** `#171717`
- **Border (unchecked):** `1px solid #DFDFDF`
- **Background (checked):** `#A78BFA`
- **Border Radius:** `4px`
- **Check Color:** `#FFFFFF`
- **Focus State:** Box Shadow `0px 0px 0px 2px rgba(167, 139, 250, 0.1)`

### Navigation

#### Primary Navigation Bar
- **Background:** `rgba(23, 23, 23, 0.95)` (semi-transparent dark)
- **Height:** `48px`
- **Padding:** `0px 16px`
- **Border Bottom:** `1px solid rgba(223, 223, 223, 0.1)`
- **Display:** Flex, `align-items: center`, `justify-content: space-between`

#### Navigation Link
- **Text Color:** `#FFFFFF`
- **Font Size:** `16px`
- **Font Weight:** `400`
- **Padding:** `8px 12px`
- **Border Radius:** `6px`
- **Transition:** All `200ms ease`
- **Hover State:** Background `rgba(167, 139, 250, 0.1)`, Text `#A78BFA`
- **Active State:** Text `#A78BFA`, Border Bottom `2px solid #A78BFA`

#### Icon Button (Navigation)
- **Background:** `transparent`
- **Size:** `32px × 32px`
- **Icon Color:** `#FFFFFF`
- **Border Radius:** `6px`
- **Hover State:** Background `rgba(167, 139, 250, 0.15)`, Icon `#A78BFA`

### Badges & Tags

#### Success Badge
- **Background:** `rgba(0, 199, 88, 0.1)`
- **Text Color:** `#00C758`
- **Font Size:** `13px`
- **Font Weight:** `600`
- **Padding:** `4px 8px`
- **Border Radius:** `4px`
- **Border:** `1px solid #00C758`

#### Error Badge
- **Background:** `rgba(251, 44, 54, 0.1)`
- **Text Color:** `#FB2C36`
- **Font Size:** `13px`
- **Font Weight:** `600`
- **Padding:** `4px 8px`
- **Border Radius:** `4px`
- **Border:** `1px solid #FB2C36`

#### Warning Badge
- **Background:** `rgba(249, 156, 0, 0.1)`
- **Text Color:** `#F99C00`
- **Font Size:** `13px`
- **Font Weight:** `600`
- **Padding:** `4px 8px`
- **Border Radius:** `4px`
- **Border:** `1px solid #F99C00`

## 5. Layout Principles

### Spacing System

**Base Unit:** `4px`

**Scale:**
- `4px` – Micro spacing (icon padding, tight components)
- `8px` – Extra small (small button padding, icon gaps)
- `12px` – Small (component internal gaps, minor spacing)
- `16px` – Medium (primary padding, section spacing)
- `24px` – Medium-large (content spacing, container padding)
- `32px` – Large (feature spacing, major sections)
- `48px` – Extra large (section dividers, major spacing)
- `64px` – Jumbo (hero spacing, feature separators)
- `80px` – Max (hero bottom margin, top-level spacing)

**Context Usage:**
- Buttons and small components: `8px–12px` internal padding
- Cards and containers: `16px–24px` padding
- Section spacing: `32px–80px` margins
- Gaps in layouts (flex/grid): `12px–24px` depending on content density

### Grid & Container

**Max Width:** `1440px` (desktop)

**Column Strategy:**
- Desktop: 12-column grid with `16px` gutter
- Responsive: 8-column at 1024px breakpoint, 4-column at 768px, full-width at 480px and below
- Content margin: `16px–48px` padding from viewport edges depending on breakpoint

**Section Patterns:**
- Hero section: Full viewport height, center-aligned content overlay
- Trending row: Horizontal scrollable carousel with title and "View All" link
- Grid sections: Responsive columns adapting to viewport
- Footer: Full-width `#171717` background, centered content max-width `1440px`

### Whitespace Philosophy

ShuttleTV emphasizes breathing room around content. Dark backgrounds necessitate generous whitespace to prevent visual fatigue. Major sections are separated by `48px–80px` margins, while micro-interactions use `4px–8px` spacing. Content cards maintain breathing space through `12px` gaps within carousels. This creates rhythm and hierarchy, allowing eyes to rest on the dark canvas while focusing on vibrant accent colors and content imagery.

### Border Radius Scale

- `4px` – Small interactive elements (checkboxes, small badges)
- `6px` – Compact UI components (icon buttons, small inputs)
- `8px` – Standard components (inputs, small containers, ghost buttons)
- `14px` – Featured content (movie/series cards, primary CTAs)
- `20px` – Large containers and hero elements
- `9999px` (or `999px`) – Fully rounded (circular avatars, pill buttons)

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| **Flat (Level 0)** | No shadow, `box-shadow: none` | Ghost buttons, inactive elements, backgrounds |
| **Raised (Level 1)** | `0px 1px 2px 0px rgba(0, 0, 0, 0.05)` | Subtle lift, disabled states |
| **Elevated (Level 2)** | `0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)` | Cards, containers, modals |
| **Floating (Level 3)** | `0px 8px 12px -2px rgba(167, 139, 250, 0.15)` | Hovered cards, popovers, focused elements |
| **Prominent (Level 4)** | `0px 12px 24px -4px rgba(0, 0, 0, 0.25)` | Dropdowns, overlay modals, pinned overlays |

**Shadow Philosophy:**

ShuttleTV's shadow system is deliberately restrained. The dark background (`#171717`–`#262626`) means traditional shadows risk disappearing entirely. Instead, this system uses subtle rgba shadows with purple-tinted accents for elevated states. Shadows increase opacity and spread gradually to signal interaction depth. Never use hard black shadows; opt for semi-transparent overlays with color-tinted accents (`rgba(167, 139, 250, ...)`). This maintains theme cohesion while providing visual feedback. Hover and focus states favor border and color shifts over shadow expansion, respecting the dark aesthetic.

## 7. Do's and Don'ts

### Do

- Use purple (`#A78BFA`) and blue (`#3080FF`, `#1447E6`) for all interactive states; users expect these colors to respond
- Maintain minimum `16px` padding inside content cards for breathing room
- Apply `border-radius: 14px` consistently to all featured content tiles (movies, series)
- Keep text on dark backgrounds at `#FFFFFF` for primary content; use `#737373` for secondary or dimmed text
- Implement hover states by shifting accent color (e.g., `#A78BFA` → `#AC4BFF`) and subtle border color change
- Use `line-height: 1.5x` minimum for body text on dark backgrounds to ensure readability
- Group related navigation items within `8px–12px` horizontal gaps
- Employ `transition: all 200ms ease` for smooth interactive feedback
- Reserve error red (`#FB2C36`) exclusively for destructive actions, errors, and critical alerts

### Don't

- Mix multiple accent colors (purple + blue + magenta) in a single component; choose one per interaction state
- Use hard black (`#000000`) for shadows; rely on `rgba(0, 0, 0, ...)` at `0.1–0.25` opacity
- Apply `font-weight: 700` to body text; weights should match the established hierarchy table
- Exceed `24px` padding on standard buttons; maintain `12px–16px` for consistency
- Nest more than two levels of border-radius (e.g., don't round children inside rounded containers)
- Place light text on light backgrounds; ensure WCAG AA contrast (minimum `4.5:1` for normal text)
- Animate shadows during scroll or rapid interactions; use color and border changes instead
- Create custom colors outside the defined palette; all UI colors must reference the semantic roles defined in Section 2
- Use opacity-based text hiding for empty states; always provide explicit empty state messaging
- Shrink interactive targets below `44px` height (touch-friendly) or `32px` minimum for desktop

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|---|
| **Mobile** | `320px–479px` | 4-column grid, full-width containers, stacked navigation, `16px` horizontal padding |
| **Tablet** | `480px–767px` | 6-column grid, navigation becomes collapsible menu, section padding `24px` |
| **Small Desktop** | `768px–1023px` | 8-column grid, navigation returns to horizontal, section padding `32px` |
| **Desktop** | `1024px–1439px` | 12-column grid with `16px` gutter, full horizontal navigation, section padding `48px` |
| **Large Desktop** | `1440px+` | Max-width container (`1440px`), centered with side margins, padding-top/bottom `64px` |

### Touch Targets

- **Minimum Height:** `44px` for all interactive elements on mobile (buttons, links, form inputs)
- **Minimum Width:** `44px × 44px` for icon buttons
- **Tap Spacing:** `8px` minimum padding around interactive targets to prevent accidental adjacent taps
- **Carousel Arrows:** At least `40px` width/height; positioned outside carousel bounds at breakpoints `≤768px`
- **Text Links:** Minimum `16px` height; if smaller font, wrap in `44px` touch container

### Collapsing Strategy

- **Navigation:** At `<768px`, collapse horizontal navigation into icon-triggered side menu (`width: 280px` max)
- **Carousels:** Horizontal scrolling maintained at all breakpoints; carousel arrows visible on desktop (`>768px`), touch swipe on mobile
- **Content Grid:** 4 columns at `320px–479px`, 6 columns at `480px–767px`, 8+ at `768px+`
- **Spacing Reduction:** Margins collapse `64px→48px→32px` as breakpoints shrink
- **Typography:** Body text stays `16px` across breakpoints; display heading scales `48px→36px→28px` on mobile
- **Hero Section:** Aspect ratio maintains `16:9` or wider; text positioning shifts to bottom-left (`<480px`) to avoid overlap with media
- **Padding:** Container padding `16px` (mobile), `24px` (tablet), `32px–48px` (desktop)

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA:** Deep Purple (`#A78BFA`) – Buttons, active links, primary accents
- **Secondary CTA:** Vivid Purple (`#AC4BFF`) – Alternative actions, secondary buttons
- **Tertiary Accent:** Bright Magenta (`#E879F9`) – Hover states, focal highlights
- **Background:** Near Black / Dark Gray (`#171717`, `#262626`) – All surfaces
- **Heading Text:** White (`#FFFFFF`) – All headings and primary labels
- **Body Text:** White (`#FFFFFF`) – Primary body copy, descriptions
- **Dimmed Text:** Gray (`#737373`) – Secondary copy, hints, disabled states
- **Borders:** Light Gray (`#DFDFDF`) – All dividers, input borders, subtle separators
- **Success Indicator:** Success Green (`#00C758`) – Confirmation, positive states
- **Error Indicator:** Action Red (`#FB2C36`) – Errors, destructive actions, warnings
- **Warning Indicator:** Warning Orange (`#F99C00`) – Caution, non-critical alerts

### Iteration Guide

1. **Establish Dark Foundation:** All surfaces use `#171717` (deep backgrounds) or `#262626` (containers, slightly lighter). White text (`#FFFFFF`) always appears on these; ensure `21:1` contrast minimum.

2. **Apply Purple/Blue Accents Consistently:** Interactive elements (buttons, active links, focus states) use `#A78BFA` for primary, `#AC4BFF` for secondary, `#3080FF` for alternative. Never mix more than one accent per component; alternate per interaction layer.

3. **Border Radius by Component Type:** All content cards (movies, series, featured content) use `14px`; standard inputs and small containers use `8px`; icon buttons use `6px`; checkboxes use `4px`. This establishes visual hierarchy through shape language.

4. **Spacing Follows 4px Grid:** All padding, margins, gaps are multiples of `4px` (`8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`, `80px`). Internal component padding: `12px` (buttons), `16px` (cards/inputs), `24px` (containers).

5. **Typography Hierarchy Never Uses Color Alone:** Sizes and weights encode priority. Display `48px/700`, Heading 2 `24px/600`, Body `16px/400`, Label `13px/500`. Line-height minimum `1.25x` font size on dark backgrounds.

6. **Shadows Enable Depth Without Visual Clutter:** Use subtle rgba shadows (`rgba(0, 0, 0, 0.05–0.1)`) for lift; reserve purple-tinted shadows (`rgba(167, 139, 250, 0.15)`) for purple-accented hovered elements. Transitions: `all 200ms ease` for smoothness.

7. **Responsive Grid Adapts in Stages:** Mobile (4-col), Tablet (6-col), Desktop (12-col). Padding scales `16px→24px→32px→48px` by breakpoint. Never sacrifice padding below `16px` minimum or touch targets below `44px` height.

8. **Status Colors Reserved for Semantics:** Green (`#00C758`) = Success, Red (`#FB2C36`) = Error, Orange (`#F99C00`) = Warning. Avoid using these for emphasis; reserve for confirmations, validation, and alerts.

9. **Focus & Hover Precision:** Buttons shift color on hover (e.g., `#A78BFA`→`#9D7BEA`); cards gain border accent (`#DFDFDF`→`#A78BFA`) and enhanced shadow. Ghost buttons flip text and border color. No scale transforms; rely on color and shadow.

10. **Accessible Contrast First:** All text on `#171717`/`#262626` must pass WCAG AA (4.5:1 minimum for normal, 3:1 for large text). White (`#FFFFFF`) on purple/blue accents must also meet this standard. Test all accent colors with text at `16px` weight `400`.