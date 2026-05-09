━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
PERSONA  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a senior UI engineer who specialises in  
design-system migrations for vanilla JS streaming  
platforms. You transplant visual languages between  
codebases with surgical precision — touching only  
styles.css and the handful of inline class strings  
inside app.js that control visual state. You never  
rewrite logic, rename existing CSS class selectors,  
or alter HTML structure. Every decision is traceable  
to a specific token, component, or animation rule  
from the reference design.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
TASK  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Restyle the Ember anime streaming platform  
(https://tester-creat.github.io/Ember/) so its visual  
language matches AniVault  
(https://tester-creat.github.io/AniValt/).

Both apps are vanilla JS, same architecture, same  
localStorage-first model. Ember has: Home hero,  
Browse, Seasonal, Library nav and a watch view.  
AniVault has a richer, more polished glass UI with a  
proven design system. Your job is to port that visual  
system into Ember's styles.css — class names stay  
the same, logic stays the same, only the look changes.

Complete ALL of the following tasks in order:

── TASK 1: Design Token Foundation ─────────────────  
Replace whatever :root block currently exists in  
Ember's styles.css with this complete token set.  
Map every hard-coded colour, size, or easing in  
the file to the nearest token after defining them.

:root {  
  /\* ── Palette ── \*/  
  \--bg:          \#0a0a0f;  
  \--bg2:         \#0f0f18;  
  \--bg3:         \#14141f;  
  \--surface:     rgba(255,255,255,0.04);  
  \--surface-md:  rgba(255,255,255,0.07);  
  \--surface-hi:  rgba(255,255,255,0.10);  
  \--border:      rgba(255,255,255,0.08);  
  \--border-md:   rgba(255,255,255,0.14);

  /\* ── Accent — violet/purple matching AniVault ── \*/  
  \--accent:       \#7c3aed;  
  \--accent-hi:    \#a855f7;  
  \--accent-dim:   rgba(124,58,237,0.15);  
  \--accent-glow:  rgba(124,58,237,0.35);

  /\* ── Text ── \*/  
  \--text1:    \#f0f0f8;  
  \--text2:    rgba(240,240,248,0.60);  
  \--text3:    rgba(240,240,248,0.35);

  /\* ── Glass recipe ── \*/  
  \--glass-bg:     rgba(10,10,20,0.55);  
  \--glass-border: rgba(255,255,255,0.10);  
  \--blur:         blur(20px) saturate(160%);  
  \--blur-sm:      blur(12px) saturate(140%);

  /\* ── Fluid spacing ── \*/  
  \--sp-1: clamp(4px,  0.5vw, 6px);  
  \--sp-2: clamp(8px,  1vw,   12px);  
  \--sp-3: clamp(12px, 1.5vw, 16px);  
  \--sp-4: clamp(16px, 2vw,   20px);  
  \--sp-5: clamp(20px, 2.5vw, 28px);  
  \--sp-6: clamp(24px, 3vw,   36px);  
  \--sp-7: clamp(32px, 4vw,   48px);

  /\* ── Fluid type scale ── \*/  
  \--t-xs:   clamp(0.65rem,  0.6rem  \+ 0.15vw, 0.75rem);  
  \--t-sm:   clamp(0.75rem,  0.70rem \+ 0.20vw, 0.875rem);  
  \--t-base: clamp(0.875rem, 0.82rem \+ 0.28vw, 1rem);  
  \--t-md:   clamp(1rem,     0.93rem \+ 0.35vw, 1.125rem);  
  \--t-lg:   clamp(1.125rem, 1rem    \+ 0.60vw, 1.375rem);  
  \--t-xl:   clamp(1.375rem, 1.1rem  \+ 1.40vw, 2rem);  
  \--t-2xl:  clamp(1.75rem,  1.3rem  \+ 2.30vw, 3rem);  
  \--t-3xl:  clamp(2.25rem,  1.5rem  \+ 3.80vw, 4.5rem);

  /\* ── Shape ── \*/  
  \--r-sm:  8px;  
  \--r:     12px;  
  \--r-lg:  16px;  
  \--r-xl:  24px;  
  \--r-2xl: 32px;

  /\* ── Motion ── \*/  
  \--dur-fast:   150ms;  
  \--dur-base:   250ms;  
  \--dur-slow:   400ms;  
  \--ease-out:   cubic-bezier(0.0,  0.0, 0.2, 1);  
  \--ease-in:    cubic-bezier(0.4,  0.0, 1.0, 1);  
  \--ease-inout: cubic-bezier(0.4,  0.0, 0.2, 1);  
  \--ease-spring:cubic-bezier(0.34, 1.56, 0.64, 1);

  /\* ── Layout ── \*/  
  \--nav-h:     64px;  
  \--mob-nav-h: 60px;  
  \--content-w: 1280px;  
  \--touch-min: 44px;

  /\* ── Z-index ── \*/  
  \--z-base:    0;  
  \--z-raised:  10;  
  \--z-sticky:  100;  
  \--z-nav:     200;  
  \--z-overlay: 300;  
  \--z-toast:   400;  
}

\[data-theme="light"\] {  
  \--bg:          \#f0ecfa;  
  \--bg2:         \#e8e2f5;  
  \--bg3:         \#ddd6f0;  
  \--surface:     rgba(80,60,120,0.06);  
  \--surface-md:  rgba(80,60,120,0.10);  
  \--surface-hi:  rgba(80,60,120,0.14);  
  \--border:      rgba(80,60,120,0.12);  
  \--border-md:   rgba(80,60,120,0.20);  
  \--glass-bg:    rgba(240,236,250,0.72);  
  \--glass-border:rgba(80,60,120,0.14);  
  \--text1:       \#1a1028;  
  \--text2:       rgba(26,16,40,0.60);  
  \--text3:       rgba(26,16,40,0.35);  
}

── TASK 2: Base & Reset ────────────────────────────  
Replace the existing body/html/reset block with:

\*, \*::before, \*::after { box-sizing: border-box; margin: 0; padding: 0; }  
html { font-size: 16px; scroll-behavior: smooth; }  
body {  
  font-family: 'Inter', system-ui, \-apple-system, sans-serif;  
  background: var(--bg);  
  color: var(--text1);  
  line-height: 1.6;  
  min-height: 100dvh;  
  overflow-x: hidden;  
  \-webkit-font-smoothing: antialiased;  
}  
::selection { background: var(--accent-dim); color: var(--text1); }  
::-webkit-scrollbar       { width: 4px; height: 4px; }  
::-webkit-scrollbar-track { background: transparent; }  
::-webkit-scrollbar-thumb { background: var(--border-md); border-radius: 2px; }  
:focus-visible {  
  outline: 2px solid var(--accent-hi);  
  outline-offset: 3px;  
  border-radius: var(--r-sm);  
}  
:focus:not(:focus-visible) { outline: none; }  
img { max-width: 100%; display: block; }  
button { font-family: inherit; cursor: pointer; }  
input, select, textarea { font-family: inherit; }

── TASK 3: Navigation ──────────────────────────────  
Ember's top nav currently uses a flat bar. Replace  
its styling with the AniVault floating glass pill:

/\* Shell \*/  
.navbar, nav, header:first-of-type {  
  position: sticky;  
  top: 0;  
  z-index: var(--z-nav);  
  display: flex;  
  justify-content: center;  
  padding: var(--sp-3) var(--sp-4);  
  background: transparent;  
  pointer-events: none;  
}

/\* Pill — applied to the inner nav container \*/  
.nav-inner, .navbar-inner, .nav-pill, nav \> div:first-child {  
  pointer-events: all;  
  display: flex;  
  align-items: center;  
  gap: var(--sp-3);  
  width: 100%;  
  max-width: min(900px, calc(100vw \- var(--sp-6)));  
  padding: var(--sp-2) var(--sp-4);  
  background: var(--glass-bg);  
  backdrop-filter: var(--blur);  
  \-webkit-backdrop-filter: var(--blur);  
  border: 1px solid var(--glass-border);  
  border-radius: var(--r-2xl);  
  box-shadow: 0 8px 32px rgba(0,0,0,0.3),  
              0 1px 0 rgba(255,255,255,0.06) inset;  
  transition: box-shadow var(--dur-base) var(--ease-out);  
}

/\* Logo / Brand \*/  
.nav-brand, .logo, .navbar-brand, nav a:first-child {  
  font-size: var(--t-md);  
  font-weight: 800;  
  letter-spacing: \-0.03em;  
  background: linear-gradient(135deg, var(--accent), var(--accent-hi));  
  \-webkit-background-clip: text;  
  \-webkit-text-fill-color: transparent;  
  background-clip: text;  
  text-decoration: none;  
  white-space: nowrap;  
  margin-right: var(--sp-2);  
}

/\* Nav links \*/  
.nav-link, .nav-tab, nav a:not(:first-child) {  
  display: inline-flex;  
  align-items: center;  
  gap: var(--sp-1);  
  padding: var(--sp-1) var(--sp-3);  
  border-radius: var(--r);  
  font-size: var(--t-sm);  
  font-weight: 500;  
  color: var(--text2);  
  text-decoration: none;  
  transition: background var(--dur-fast) var(--ease-out),  
              color     var(--dur-fast) var(--ease-out);  
  min-height: var(--touch-min);  
  white-space: nowrap;  
}  
.nav-link:hover, .nav-tab:hover,  
nav a:not(:first-child):hover {  
  background: var(--surface-md);  
  color: var(--text1);  
}  
.nav-link.active, .nav-link\[aria-current="page"\],  
nav a.active {  
  background: var(--accent-dim);  
  color: var(--accent-hi);  
  border: 1px solid rgba(124,58,237,0.2);  
}

/\* Nav spacer and right-side buttons \*/  
.nav-spacer { flex: 1; }  
.nav-btn, .nav-icon-btn {  
  display: flex; align-items: center; justify-content: center;  
  width: var(--touch-min); height: var(--touch-min);  
  border-radius: var(--r);  
  background: transparent;  
  border: 1px solid transparent;  
  color: var(--text2);  
  transition: background var(--dur-fast), border-color var(--dur-fast);  
}  
.nav-btn:hover, .nav-icon-btn:hover {  
  background: var(--surface-md);  
  border-color: var(--border);  
  color: var(--text1);  
}

/\* Mobile nav (bottom tabs) \*/  
.mobile-nav, .bottom-nav, .mobile-tabs {  
  position: fixed;  
  bottom: 0; left: 0; right: 0;  
  z-index: var(--z-nav);  
  display: flex;  
  justify-content: space-around;  
  align-items: center;  
  padding: var(--sp-2) var(--sp-4);  
  padding-bottom: calc(var(--sp-2) \+ env(safe-area-inset-bottom));  
  background: var(--glass-bg);  
  backdrop-filter: var(--blur);  
  \-webkit-backdrop-filter: var(--blur);  
  border-top: 1px solid var(--glass-border);  
}  
.mobile-nav-btn, .mobile-tab {  
  display: flex; flex-direction: column;  
  align-items: center; gap: var(--sp-1);  
  padding: var(--sp-1) var(--sp-3);  
  border-radius: var(--r);  
  min-height: var(--touch-min);  
  color: var(--text3);  
  font-size: var(--t-xs);  
  font-weight: 500;  
  border: none; background: transparent;  
  transition: all var(--dur-fast) var(--ease-out);  
}  
.mobile-nav-btn.active, .mobile-tab.active {  
  color: var(--accent-hi);  
  background: var(--accent-dim);  
}  
@media (min-width: 768px) {  
  .mobile-nav, .bottom-nav, .mobile-tabs { display: none; }  
}

── TASK 4: Hero Section ────────────────────────────  
Ember's hero is a centred text block with two  
buttons. Apply AniVault's cinematic glass hero:

.hero, .hero-section, main \> section:first-of-type {  
  position: relative;  
  min-height: clamp(380px, 55vw, 600px);  
  display: flex;  
  align-items: center;  
  overflow: hidden;  
  border-radius: 0 0 var(--r-lg) var(--r-lg);  
  margin-bottom: var(--sp-7);  
}

/\* Radial ambient glow behind hero \*/  
.hero::before {  
  content: '';  
  position: absolute; inset: 0;  
  background:  
    radial-gradient(ellipse 80% 60% at 60% 40%,  
      rgba(124,58,237,0.18) 0%, transparent 70%),  
    radial-gradient(ellipse 60% 80% at 10% 80%,  
      rgba(168,85,247,0.10) 0%, transparent 60%);  
  pointer-events: none;  
}

/\* Particle-grid subtle texture \*/  
.hero::after {  
  content: '';  
  position: absolute; inset: 0;  
  background-image:  
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),  
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);  
  background-size: 48px 48px;  
  pointer-events: none;  
  opacity: 0.6;  
}

.hero-content, .hero \> div, .hero-inner {  
  position: relative; z-index: 2;  
  display: flex; flex-direction: column;  
  align-items: center; text-align: center;  
  gap: var(--sp-4);  
  padding: var(--sp-7) var(--sp-6);  
  max-width: 640px;  
  margin: auto;  
}

/\* Hero badge / eyebrow \*/  
.hero-badge, .hero-eyebrow {  
  display: inline-flex; align-items: center; gap: var(--sp-2);  
  padding: var(--sp-1) var(--sp-3);  
  border-radius: var(--r-xl);  
  background: var(--accent-dim);  
  border: 1px solid rgba(124,58,237,0.3);  
  font-size: var(--t-xs);  
  font-weight: 700;  
  letter-spacing: 0.06em;  
  color: var(--accent-hi);  
  text-transform: uppercase;  
}

.hero h1, .hero-title {  
  font-size: var(--t-3xl);  
  font-weight: 900;  
  line-height: 1.0;  
  letter-spacing: \-0.04em;  
  background: linear-gradient(  
    160deg,  
    var(--text1)   0%,  
    rgba(168,85,247,0.9) 60%,  
    var(--accent)  100%  
  );  
  \-webkit-background-clip: text;  
  \-webkit-text-fill-color: transparent;  
  background-clip: text;  
}

.hero p, .hero-subtitle, .hero-desc {  
  font-size: var(--t-md);  
  color: var(--text2);  
  max-width: 480px;  
  line-height: 1.7;  
}

.hero-actions, .hero-cta, .hero-buttons {  
  display: flex; flex-wrap: wrap;  
  gap: var(--sp-3);  
  justify-content: center;  
}

── TASK 5: Buttons ─────────────────────────────────  
Replace ALL button styling with these three variants.  
Do not rename any existing button classes — only  
change their CSS.

/\* Primary — gradient violet \*/  
.btn, .btn-primary, button\[data-primary\],  
.hero-cta \> a:first-child, .hero-buttons \> a:first-child {  
  display: inline-flex; align-items: center; gap: var(--sp-2);  
  padding: 11px var(--sp-5);  
  border-radius: var(--r);  
  font-size: var(--t-sm); font-weight: 700;  
  background: linear-gradient(135deg, var(--accent), var(--accent-hi));  
  color: \#fff;  
  border: none;  
  box-shadow: 0 4px 20px var(--accent-glow);  
  transition: transform var(--dur-base) var(--ease-spring),  
              box-shadow var(--dur-base) var(--ease-out);  
  text-decoration: none;  
  cursor: pointer;  
}  
.btn:hover, .btn-primary:hover {  
  transform: translateY(-2px);  
  box-shadow: 0 8px 30px var(--accent-glow);  
}  
.btn:active, .btn-primary:active {  
  transform: translateY(0);  
}

/\* Secondary — glass outline \*/  
.btn-secondary, .btn-outline,  
.hero-cta \> a:last-child, .hero-buttons \> a:last-child {  
  display: inline-flex; align-items: center; gap: var(--sp-2);  
  padding: 11px var(--sp-5);  
  border-radius: var(--r);  
  font-size: var(--t-sm); font-weight: 600;  
  background: var(--surface);  
  border: 1px solid var(--border-md);  
  color: var(--text1);  
  backdrop-filter: var(--blur-sm);  
  transition: background var(--dur-base), border-color var(--dur-base),  
              transform var(--dur-base) var(--ease-spring);  
  text-decoration: none; cursor: pointer;  
}  
.btn-secondary:hover, .btn-outline:hover {  
  background: var(--surface-md);  
  border-color: rgba(124,58,237,0.4);  
  transform: translateY(-1px);  
}

/\* Ghost — text only \*/  
.btn-ghost, .btn-text {  
  display: inline-flex; align-items: center; gap: var(--sp-2);  
  padding: var(--sp-2) var(--sp-3);  
  border-radius: var(--r-sm);  
  font-size: var(--t-sm); font-weight: 500;  
  background: transparent; border: none;  
  color: var(--text2);  
  transition: color var(--dur-fast), background var(--dur-fast);  
  cursor: pointer;  
}  
.btn-ghost:hover, .btn-text:hover {  
  color: var(--text1);  
  background: var(--surface-md);  
}

── TASK 6: Cards ───────────────────────────────────  
All cards (browse, library, discover, seasonal) get  
the glass treatment from AniVault.

.card, .anime-card, .browse-card,  
.discover-card, .library-card, .seasonal-card {  
  position: relative;  
  background: var(--surface);  
  border: 1px solid var(--border);  
  border-radius: var(--r);  
  overflow: hidden;  
  transition:  
    transform  var(--dur-base) var(--ease-spring),  
    box-shadow var(--dur-base) var(--ease-out),  
    border-color var(--dur-fast);  
  cursor: pointer;  
}  
.card:hover, .anime-card:hover,  
.browse-card:hover, .discover-card:hover,  
.library-card:hover, .seasonal-card:hover {  
  transform: translateY(-4px) scale(1.015);  
  box-shadow: 0 16px 40px rgba(0,0,0,0.4),  
              0 0 0 1px var(--accent) inset;  
  border-color: var(--border-md);  
  z-index: var(--z-raised);  
}  
@media (hover: none) {  
  .card:hover, .anime-card:hover,  
  .browse-card:hover, .discover-card:hover { transform: none; }  
}

/\* Card cover image wrapper \*/  
.card-img, .card-cover, .anime-cover,  
.poster-wrap, img \+ div, .card \> img:first-child {  
  width: 100%;  
  aspect-ratio: 2 / 3;  
  object-fit: cover;  
  display: block;  
  background: var(--bg3);  
}

/\* Card body \*/  
.card-body, .card-info, .anime-info {  
  padding: var(--sp-3);  
  display: flex; flex-direction: column; gap: var(--sp-1);  
}  
.card-title, .anime-title {  
  font-size: var(--t-sm); font-weight: 600;  
  color: var(--text1); line-height: 1.35;  
  display: \-webkit-box;  
  \-webkit-line-clamp: 2;  
  \-webkit-box-orient: vertical;  
  overflow: hidden;  
}  
.card-meta, .anime-meta {  
  font-size: var(--t-xs); color: var(--text3);  
}

/\* Card badge overlaid on image \*/  
.card-badge, .status-badge, .episode-badge {  
  position: absolute; top: var(--sp-2); left: var(--sp-2);  
  padding: 3px 8px; border-radius: 6px;  
  font-size: var(--t-xs); font-weight: 700; letter-spacing: 0.04em;  
  backdrop-filter: var(--blur-sm);  
  \-webkit-backdrop-filter: var(--blur-sm);  
}

/\* Progress bar on continue cards \*/  
.progress, .watch-progress, .card-progress {  
  height: 2px;  
  background: var(--border);  
  position: absolute; bottom: 0; left: 0; right: 0;  
}  
.progress-fill, .watch-progress-fill {  
  height: 100%;  
  background: linear-gradient(90deg, var(--accent), var(--accent-hi));  
  border-radius: 0 1px 1px 0;  
  transition: width 0.4s var(--ease-out);  
}

── TASK 7: Grids ───────────────────────────────────  
Replace all fixed grid / flex card row styles:

.grid, .card-grid, .anime-grid,  
.browse-grid, .seasonal-grid, .library-grid {  
  display: grid;  
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));  
  gap: var(--sp-4);  
}  
@media (min-width: 480px) {  
  .grid, .card-grid, .anime-grid,  
  .browse-grid, .seasonal-grid, .library-grid {  
    grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));  
  }  
}  
@media (min-width: 768px) {  
  .grid, .card-grid, .anime-grid,  
  .browse-grid, .seasonal-grid, .library-grid {  
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));  
    gap: var(--sp-5);  
  }  
}

/\* Horizontal scroll rows \*/  
.row, .scroll-row, .card-row,  
\[class\*="row-track"\], .anime-row {  
  display: flex;  
  gap: var(--sp-3);  
  overflow-x: auto;  
  scroll-snap-type: x mandatory;  
  \-webkit-overflow-scrolling: touch;  
  padding-block: var(--sp-2);  
  scrollbar-width: none;  
}  
.row::-webkit-scrollbar, .scroll-row::-webkit-scrollbar { display: none; }  
.row \> \*, .scroll-row \> \* { scroll-snap-align: start; flex-shrink: 0; }

── TASK 8: Sections ────────────────────────────────  
.section, main \> section, .page-section {  
  margin-bottom: var(--sp-7);  
  opacity: 0;  
  animation: sectionReveal var(--dur-slow) var(--ease-out) both;  
}  
@keyframes sectionReveal {  
  from { opacity: 0; transform: translateY(14px); }  
  to   { opacity: 1; transform: translateY(0); }  
}  
.section:nth-child(1) { animation-delay: 0.05s; }  
.section:nth-child(2) { animation-delay: 0.12s; }  
.section:nth-child(3) { animation-delay: 0.19s; }  
.section:nth-child(4) { animation-delay: 0.26s; }  
.section:nth-child(5) { animation-delay: 0.33s; }

.section-header, .section-head,  
.section \> div:first-child {  
  display: flex; align-items: center;  
  justify-content: space-between;  
  margin-bottom: var(--sp-4);  
}  
.section-title, .section h2, .section h3 {  
  font-size: var(--t-xl);  
  font-weight: 800;  
  letter-spacing: \-0.025em;  
  color: var(--text1);  
}  
.see-all, .section-link {  
  font-size: var(--t-sm); font-weight: 500;  
  color: var(--accent-hi); opacity: 0.8;  
  text-decoration: none;  
  transition: opacity var(--dur-fast);  
}  
.see-all:hover, .section-link:hover { opacity: 1; }

── TASK 9: Watch View ──────────────────────────────  
.watch-view, .watch-layout, .player-layout {  
  display: flex; flex-direction: column; gap: var(--sp-5);  
}  
@media (min-width: 1024px) {  
  .watch-view, .watch-layout, .player-layout {  
    display: grid;  
    grid-template-columns: 1fr 320px;  
    align-items: start;  
    gap: var(--sp-6);  
  }  
}  
.watch-player, .player-wrap, .video-container {  
  width: 100%;  
  aspect-ratio: 16 / 9;  
  background: \#000;  
  border-radius: var(--r-lg);  
  overflow: hidden;  
  border: 1px solid var(--border);  
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);  
}  
.watch-player iframe,  
.player-wrap iframe,  
.video-container iframe {  
  width: 100%; height: 100%; border: none; display: block;  
}  
.watch-sidebar, .player-sidebar, .episode-sidebar {  
  background: var(--glass-bg);  
  backdrop-filter: var(--blur-sm);  
  \-webkit-backdrop-filter: var(--blur-sm);  
  border: 1px solid var(--glass-border);  
  border-radius: var(--r-lg);  
  overflow: hidden;  
  display: flex; flex-direction: column;  
}  
@media (min-width: 1024px) {  
  .watch-sidebar, .player-sidebar, .episode-sidebar {  
    position: sticky;  
    top: calc(var(--nav-h) \+ var(--sp-4));  
    max-height: calc(100dvh \- var(--nav-h) \- var(--sp-7));  
    overflow-y: auto;  
  }  
}

/\* Episode list items \*/  
.ep-item, .episode-item, .ep-row {  
  display: flex; align-items: center; gap: var(--sp-3);  
  padding: var(--sp-2) var(--sp-4);  
  min-height: var(--touch-min);  
  border-bottom: 1px solid var(--border);  
  cursor: pointer;  
  transition: background var(--dur-fast) var(--ease-out);  
}  
.ep-item:hover, .episode-item:hover { background: var(--surface-md); }  
.ep-item.active, .ep-item.current,  
.episode-item.active { background: var(--accent-dim); }  
.ep-item:last-child, .episode-item:last-child { border-bottom: none; }

── TASK 10: Modals & Overlays ──────────────────────  
.modal, .overlay, .panel, .modal-backdrop {  
  position: fixed; inset: 0;  
  z-index: var(--z-overlay);  
  background: rgba(0,0,0,0.7);  
  backdrop-filter: blur(6px);  
  \-webkit-backdrop-filter: blur(6px);  
  display: flex; align-items: center; justify-content: center;  
  animation: fadeOverlay var(--dur-base) var(--ease-out);  
}  
@keyframes fadeOverlay {  
  from { opacity: 0; } to { opacity: 1; }  
}  
.modal-content, .modal-box, .panel-inner,  
.modal \> div, .overlay \> div {  
  background: var(--bg2);  
  border: 1px solid var(--border-md);  
  border-radius: var(--r-lg);  
  padding: var(--sp-6);  
  max-width: min(560px, calc(100vw \- var(--sp-6)));  
  width: 100%;  
  max-height: calc(100dvh \- var(--sp-7));  
  overflow-y: auto;  
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);  
  animation: scaleModal var(--dur-slow) var(--ease-spring);  
}  
@keyframes scaleModal {  
  from { opacity: 0; transform: scale(0.93) translateY(10px); }  
  to   { opacity: 1; transform: scale(1)    translateY(0); }  
}

── TASK 11: Form Elements ──────────────────────────  
input\[type="text"\], input\[type="search"\],  
input\[type="number"\], textarea, select {  
  width: 100%;  
  padding: var(--sp-2) var(--sp-3);  
  background: var(--surface);  
  border: 1px solid var(--border);  
  border-radius: var(--r);  
  color: var(--text1);  
  font-size: var(--t-base);  
  transition: border-color var(--dur-fast), box-shadow var(--dur-fast);  
  outline: none;  
  min-height: var(--touch-min);  
}  
input:focus, textarea:focus, select:focus {  
  border-color: var(--accent);  
  box-shadow: 0 0 0 3px var(--accent-dim);  
}  
input::placeholder, textarea::placeholder { color: var(--text3); }  
select { appearance: none; cursor: pointer; }

/\* Chips / filter pills \*/  
.chip, .filter-chip, .genre-chip, .tag {  
  display: inline-flex; align-items: center; gap: var(--sp-1);  
  padding: var(--sp-1) var(--sp-3);  
  border-radius: var(--r-xl);  
  font-size: var(--t-xs); font-weight: 600;  
  background: var(--surface);  
  border: 1px solid var(--border);  
  color: var(--text2);  
  cursor: pointer; white-space: nowrap;  
  min-height: var(--touch-min);  
  transition: all var(--dur-fast) var(--ease-out);  
}  
.chip:hover, .filter-chip:hover { background: var(--surface-md); color: var(--text1); }  
.chip.active, .filter-chip.active, .chip\[aria-pressed="true"\] {  
  background: var(--accent-dim);  
  border-color: rgba(124,58,237,0.35);  
  color: var(--accent-hi);  
}

── TASK 12: Toasts / Notifications ─────────────────  
.toast-zone, .toast-container, \#toastZone {  
  position: fixed;  
  bottom: calc(var(--mob-nav-h) \+ var(--sp-3) \+ env(safe-area-inset-bottom));  
  right: var(--sp-4); left: var(--sp-4);  
  z-index: var(--z-toast);  
  display: flex; flex-direction: column; gap: var(--sp-2);  
  pointer-events: none; align-items: flex-end;  
}  
@media (min-width: 768px) {  
  .toast-zone, .toast-container, \#toastZone {  
    bottom: var(--sp-5); left: auto; width: 340px;  
  }  
}  
.toast {  
  display: flex; align-items: flex-start; gap: var(--sp-3);  
  padding: var(--sp-3) var(--sp-4);  
  background: var(--bg2);  
  border: 1px solid var(--border-md);  
  border-radius: var(--r);  
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);  
  font-size: var(--t-sm); font-weight: 500;  
  pointer-events: all; max-width: 100%;  
  animation: toastIn var(--dur-base) var(--ease-spring);  
}  
@keyframes toastIn {  
  from { opacity: 0; transform: translateX(100%); }  
  to   { opacity: 1; transform: translateX(0); }  
}  
.toast--success { border-left: 3px solid \#22c55e; }  
.toast--error   { border-left: 3px solid \#ef4444; }  
.toast--info    { border-left: 3px solid var(--accent-hi); }

── TASK 13: Skeleton Loaders ───────────────────────  
Add skeleton shimmer for loading states:

.skeleton {  
  background: linear-gradient(  
    90deg,  
    var(--surface)    25%,  
    var(--surface-hi) 50%,  
    var(--surface)    75%  
  );  
  background-size: 200% 100%;  
  animation: shimmer 1.5s ease infinite;  
  border-radius: var(--r);  
}  
@keyframes shimmer {  
  from { background-position: 200% 0; }  
  to   { background-position: \-200% 0; }  
}  
.card--loading .card-img,  
.card--loading .card-title,  
.card--loading .card-meta { @extend .skeleton; }

── TASK 14: Reduce Motion ──────────────────────────  
@media (prefers-reduced-motion: reduce) {  
  \*, \*::before, \*::after {  
    animation-duration: 0.01ms \!important;  
    transition-duration: 0.01ms \!important;  
    animation-iteration-count: 1 \!important;  
  }  
}

── TASK 15: Content Shell ──────────────────────────  
.main, main, .content, .page-content {  
  padding-top: var(--nav-h);  
  padding-bottom: calc(var(--mob-nav-h) \+ env(safe-area-inset-bottom));  
  min-height: 100dvh;  
}  
@media (min-width: 768px) {  
  .main, main, .content, .page-content { padding-bottom: var(--sp-7); }  
}

.container, .content-wrap, .page-wrap, .inner {  
  width: 100%;  
  max-width: var(--content-w);  
  margin-inline: auto;  
  padding-inline: var(--sp-4);  
}  
@media (min-width: 768px) {  
  .container, .content-wrap, .page-wrap, .inner {  
    padding-inline: var(--sp-6);  
  }  
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
CONTEXT  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMBER (target — what you are restyling):  
\- Live: https://tester-creat.github.io/Ember/  
\- Repo: https://github.com/Tester-creat/Ember  
\- Stack: Vanilla JS, no framework, no build step  
\- Nav: Top bar with "Ember" logo \+ Home, Browse, Seasonal, Library  
\- Pages: Home (hero \+ sections), Browse, Seasonal, Library, Watch view  
\- Has keyboard shortcuts modal, service worker, mobile nav panel  
\- Accent colour currently unknown — replace with violet tokens above  
\- Font currently unknown — replace with Inter (already in Google Fonts)

ANIVAULT (reference — visual system to port FROM):  
\- Live: https://tester-creat.github.io/AniValt/  
\- Repo: https://github.com/Tester-creat/AniValt  
\- Design pillars: dark glass morphism, violet accent,  
  Inter typeface, floating pill nav, Ken Burns hero,  
  auto-fill responsive grids, spring-eased card hover,  
  section reveal animations, glass sidebar in watch view  
\- CSS stats: \~2495 lines, 55 commits

HARD CONSTRAINTS — READ BEFORE WRITING ANY CODE:  
1\. Do NOT rename, delete, or restructure any CSS class  
   selector that already exists in Ember's styles.css.  
   Only change property values inside existing rules,  
   and ADD new rules for selectors that are missing.  
2\. Do NOT touch app.js logic — no function changes,  
   no event handler changes, no data changes.  
3\. Do NOT change any HTML structure in index.html.  
4\. The Inter font is loaded in index.html via Google  
   Fonts already (verify before adding a duplicate link).  
5\. If Ember uses a custom accent colour (e.g. orange  
   for "Ember" branding), keep it only for the logo  
   gradient. All interactive UI uses the violet tokens.  
6\. The service worker (sw.js) caches CSS — after  
   applying changes, note in your output that the user  
   must clear their SW cache or bump the cache version  
   in sw.js.  
7\. Apply all 15 Tasks in order. Do not skip any task  
   because it "seems similar" to a previous one.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
FORMAT  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Deliver your output in FOUR blocks only.  
Do not add prose before, between, or after them.

BLOCK 1 — Complete styles.css  
Output the full new styles.css file with every task  
applied. Do not truncate. Do not use "…" or comments  
like "// keep existing code here". The file must be  
immediately copy-pasteable with zero edits.

BLOCK 2 — sw.js cache bump (if a service worker exists)  
Output only the changed line(s) in sw.js that bump  
the cache version string, using the FIND/REPLACE  
format from previous prompts in this project.  
If no sw.js exists in Ember, write "N/A".

BLOCK 3 — Verification checklist (12 items)  
Each item: one specific visual thing to check in the  
browser at a specific viewport width. Format:  
  N. \[320px\] Hero title uses gradient text, not solid.  
  N. \[768px\] Nav pill is visible, bottom tabs hidden.  
  N. \[1024px\] Watch view is two-column: player left, sidebar right.

BLOCK 4 — Accent colour decision note  
One paragraph: document whether you preserved any  
Ember-specific accent colour for the logo and where,  
or whether you fully replaced it with violet. This is  
so the developer knows what to manually tweak if they  
want the "Ember" orange flame aesthetic back.  
