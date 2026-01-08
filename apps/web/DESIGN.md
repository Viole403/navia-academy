---
name: Navia Academy Web
description: Open-source language academy web app — Bauhaus-derived slate system with poster primaries and living depth
colors:
  primary: "#2b54e5"
  accent-strong: "#1d3eb8"
  accent-soft: "#dde4fb"
  accent-ink: "#ffffff"
  signal-vermilion: "#e23b25"
  marker-yellow: "#f2b825"
  ink-slate: "#14161b"
  paper-white: "#f7f6f2"
  slate-white: "#f4f4f1"
  raised: "#fbfbf8"
  sunken: "#ecece7"
  hover-wash: "#e9e9e4"
  ink-soft: "#454a55"
  ink-faint: "#636872"
  line: "#dcddda"
  line-strong: "#c3c5c1"
  gold: "#7c6610"
  jade: "#15774d"
  info: "#2364b3"
  warn: "#995815"
  danger: "#c42f29"
  exam-hsk: "#bb4030"
  exam-tocfl: "#3e8464"
  exam-goethe: "#3d7a6b"
  exam-jlpt: "#b53a3a"
  exam-toefl: "#2f6fc6"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "clamp(2.25rem, 4vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.25rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  sm: "2px"
  md: "0.6rem"
  pill: "9999px"
  square: "0px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
  button-secondary:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  input-text:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: Navia Academy Web

## Overview

**Creative North Star: "The Living Bauhaus"**

Navia's web system is a print-shop discipline kept alive on screen: a slate-and-paper
neutral world (slate-white `#f4f4f1`, ink-slate `#14161b`) carrying exactly three
poster primaries — Signal Vermilion, Poster Cobalt, Marker Yellow — used the way a
Bauhaus poster uses ink: sparingly, geometrically, never as wallpaper. Surfaces sit on
an architectural 96px grid texture, corners stay crisp (`--radius: 0.6rem`), and every
interactive element answers the cursor with hard, physical motion — offset shadows,
cursor-tilt perspective, drifting atmosphere orbs. The mood is crisp · geometric ·
confident · playful.

Depth is physical, not atmospheric: elements lift with hard black offsets
(`shadow-neo`), marketing heroes tilt in 3D (`Float3D`, springs stiffness 140 /
damping 16), and blurred gradient orbs drift behind content as pure atmosphere. Two
axes of theming run underneath everything — `data-mode` (light/dark) × `data-theme`
(8 named themes, `bauhaus` default) plus a WCAG-AAA high-contrast override — so all
color must flow through the semantic CSS variables, never raw hex.

**Key Characteristics:**

- Three primaries only; everything else is neutral or semantic-functional
- Hard offset shadows as the elevation voice; soft ambient shadows retired
- Architectural grid texture (96px) anchoring hero surfaces
- Cursor-tilt 3D and drift orbs give print geometry a pulse
- Full two-axis theming through semantic vars; high-contrast mode wins over all
- CJK-first type stack: Noto Sans SC/TC/JP up to weight 900 for hanzi surfaces

## Colors

A disciplined poster palette: three loud voices over quiet slate neutrals, with a
functional semantic row that never decorates.

### Primary

- **Poster Cobalt** (#2b54e5, dark-mode #6d8cff): THE interactive voice — buttons,
  links, active tabs, progress fill, selection highlight, focus rings. Darker step
  **Cobalt Pressed** (#1d3eb8) is hover/pressed only.

### Secondary

- **Signal Vermilion** (#e23b25, dark #ef5b50): brand energy — hero accents, chips,
  neo-shadows, danger semantics live separately below.
- **Marker Yellow** (#f2b825, stable across modes): highlights and third voice; pairs
  with ink text (never white).

### Tertiary

- **Exam identities** (fixed set of exactly five): HSK brick `#bb4030`, TOCFL jade
  `#3e8464`, Goethe teal `#3d7a6b`, JLPT crimson `#b53a3a`, TOEFL azure `#2f6fc6`.
  When an exam context is active, its identity color takes accent duty on that
  surface (badges, switchers, kinetic headlines).

### Neutral

- **Slate White** (#f4f4f1): page background.
- **Raised Paper** (#fbfbf8): cards, inputs, raised panels.
- **Sunken Tray** (#ecece7): secondary buttons, wells, track backgrounds.
- **Hover Wash** (#e9e9e4): hover fills on neutral surfaces.
- **Ink Slate** (#14161b): primary text and the neo-shadow ink.
- **Ink Soft** (#454a55) / **Ink Faint** (#636872, ≥4.5:1 on all light surfaces): secondary text / metadata.
- **Line** (#dcddda) / **Line Strong** (#c3c5c1): hairlines / emphasized borders.

### Functional (semantic, never decorative)

Gold `#7c6610` (achievement), Jade `#15774d` (success), Info blue `#2364b3`, Warn
amber `#995815`, Danger `#c42f29` — all tuned to clear WCAG AA as text on every
light surface; dark-mode faces live in globals.css. These report state; they do not style layout.

### Named Rules

**The Three-Voice Rule.** Only Vermilion, Cobalt, and Yellow carry brand energy. If a
fourth hue wants attention, it must be an exam identity doing its exam job or a
functional color reporting state.

**The Variable Rule.** Every color in a component flows through the semantic vars
(`var(--bg)`, `var(--ink)`, `var(--accent)`…) or their Tailwind mappings
(`bg-raised`, `text-ink-faint`). Raw hex in a component breaks all 17 theme faces.

## Typography

**Display Font:** Plus Jakarta Sans (fallback Inter) — geometric humanist, weight 800
**Body Font:** Inter (system-ui fallbacks)
**Hanzi Font:** Noto Sans SC / TC / JP, weights 400–900 (locale follows content)

**Character:** One geometric sans family speaking at two volumes — Jakarta's confident
shout for structure, Inter's even hum for reading. The old editorial serif was
retired wholesale; `--font-serif-var` resolves to the same geometric sans.

### Hierarchy

- **Display** (800, clamp(2.25rem→3.5rem), lh 1.04, −0.03em): landing hero only.
- **Headline** (800, clamp(2rem→3.25rem), lh 1.04): section openings, marketing.
- **Title** (800, 1.5rem, lh 1.1, −0.02em): page headers (`SectionHeader`), stat
  values, card crossheads. All h1–h6 default here.
- **Body** (400/500, 1rem, lh 1.55): reading text; controls share this base size,
  scaled by the user font-size setting (html data-fontsize sm→xl: 14.5→19px).
- **Label** (500–700, 0.75rem, +0.025–0.05em, UPPERCASE): stat labels, metadata,
  bauhaus-chip captions (display face, 0.8125rem).

### Named Rules

**The Sans-Everywhere Rule.** No serif returns anywhere — not for quotes, not for
elegance. The geometric sans IS the house voice.

## Layout

Content lives in centered containers: `max-w-6xl` (72rem) for the app shell and
marketing sections, `max-w-2xl` (42rem) for prose columns. Spacing runs on the 4px
grid at card scale — 16px card padding, 20–24px section padding, 16px standard gaps —
and opens up on marketing (generous section spacing around display type). Density is
deliberately asymmetric: dashboard compact and scannable, marketing airy. The 96px
architectural grid texture (`bauhaus-grid`, 1px `var(--line)`) anchors hero surfaces;
responsive behavior follows Tailwind's default breakpoints (sm 640 / md 768 / lg 1024
/ xl 1280).

## Elevation & Depth

**Doctrine: neo-dominant.** Depth speaks through hard offset shadows in the flat ink
of the current mode — `shadow-neo` (3px 3px 0 ink), `shadow-neo-lg` (6px 6px 0 ink),
and colored variants (red/blue/yellow offsets). Interactive surfaces earn their lift
as a _response_: `.riser` translates (−2px, −4px) into its larger offset on
hover/focus (180ms ease). Beyond shadow, two non-elevation devices add life: `Float3D`
cursor-tilt perspective (900px, springs) on marketing cards, and blurred `DriftOrb`
gradients as background atmosphere. The legacy soft ambient shadow (`var(--shadow)`,
still present on older cards) is retired — **new surfaces must not use it**.

### Shadow Vocabulary

- **Riser rest→lift** (`box-shadow: 3px 3px 0 ink` → `6px 6px 0 ink` + translate):
  interactive cards answering the pointer.
- **Accent offset** (`3px 3px 0 var(--bauhaus-red|blue|yellow)`): static emphasis on
  posters, chips, feature tiles — decoration with a physical metaphor.
- **Legacy ambient** (`0 1px 2px …, 0 10px 24px -10px …`): phase out; do not add.

### Named Rules

**The Hard Offset Rule.** A shadow is either a hard offset in the mode's ink or a
colored offset in a primary — nothing diffuse, nothing ambiguous. If it looks like
fog, it doesn't ship.

## Shapes

Standard corners are gently crisp: `--radius: 0.6rem` (9.6px) on buttons, cards,
inputs, modals. Two deliberate exceptions carry the geometry language: badges go full
pill (9999px) while **bauhaus-chips go perfectly square** (0 radius, 1.5px ink
border) — the square chip against round pills is a signature contrast. Hairlines
everywhere are 1px `var(--line)`; emphasized borders 1.5px `var(--line-strong)` or
ink. Focus is always visible: 2px accent outline, 2px offset, 2px corner radius.
The Tian Zi Ge writing grid (1.5px strong border, center crosshair + diagonals in
`--grid-line`) is a protected signature surface — never restyle its internals.

## Components

House feel: **precise, never timid** — tight radii, decisive states, zero mush.

> **UI kit ownership (2026-08-27).** All primitives live in `src/components/ui/` and are
> **custom, hand-rolled** — NOT shadcn registry components. `@base-ui/react`, the `shadcn`
> CLI, and other base/headless primitives were deliberately removed from `package.json`
> (they had zero imports). Do not re-add a base UI library or generate shadcn components;
> extend the existing custom kit, styled via the semantic tokens below.

### Buttons

- **Shape:** `--radius` (0.6rem); sizes sm `12px×6px`, md `16px×10px`, lg `24px×12px`
  padding; font-medium text-sm/base.
- **Primary:** Poster Cobalt fill, white ink; hover presses to Cobalt Pressed
  (#1d3eb8). Loading state spins a 16px loader inline.
- **Secondary:** Sunken tray fill, 1px line border, ink text; hover → Hover Wash.
- **Outline:** transparent fill, 1px line-strong border; hover → Hover Wash.
- **Ghost:** ink-soft text only; hover → Hover Wash + ink text.
- **Danger:** Danger red fill, white text; hover dims opacity 90%.
- All: disabled 50% opacity + not-allowed cursor; focus-visible global ring.

### Badges

- Pill (9999px), 10px×2.5px padding, 0.75rem medium, 1px border.
- Seven tones: neutral/accent/success/warn/danger/gold/info — tinted-soft fills
  (`bg-sunken`) except accent which uses accent-soft. Exam badges resolve their
  color from the fixed five-exam map.

### Chips (Bauhaus)

- Square corners, 1.5px ink border, uppercase display-face caption (0.8125rem, bold).
- Four fills: red / blue / yellow (yellow takes INK text) / solid ink. Used for
  eyebrow labels and brand marks — never for filters (those are badges/tabs).

### Cards

- Raised Paper fill, 1px line border, `--radius` corners, 16px padding.
- Interactive cards: riser lift on hover/focus + 2px accent focus ring; clickable
  cards get role="button", tabIndex, Enter/Space handling.
- StatCard pattern: uppercase faint label top-left, icon top-right, display-face
  value (1.5rem/800) below.

### Inputs / Fields

- Raised fill, 1px line border, `--radius`, 14px×10px padding, text-sm.
- Focus: border AND 1px ring turn Poster Cobalt (no glow).
- Error: border+ring flip to Danger, `role="alert"` message below in 0.75rem red.
- Label above (sm medium ink-soft); hint below in faint. Toggle/Select/Textarea
  share the field grammar.

### Navigation

- Dashboard: sidebar app-shell within max-w-6xl; mobile collapses appropriately.
- Tabs: horizontal strip on a bottom hairline; active tab = 2px Poster Cobalt
  underline + ink text; inactive = faint text, hover lifts to soft. Overflow scrolls.
- Progress bars: h-1.5 pill tracks in Sunken, Cobalt fill animating width (500ms).

### Signature Components

- **Float3D tilt card** (`components/marketing/tilt-card.tsx`): perspective 900px,
  ±9° max tilt, spring-damped; renders static under reduced-motion.
- **DriftOrb**: blurred radial gradients (blur-3xl) looping 16–28s ease-in-out;
  aria-hidden, static under reduced-motion.
- **PinyinText**: syllable-level tone classes (`tone-0…tone-5`) wrapping pinyin and
  zhuyin; respects the user display-mode setting. NOTE: tone-color CSS is currently
  undefined in the stylesheet — define tone colors via theme vars before styling
  relies on them.
- **Tian Zi Ge grid**: protected practice canvas (see Shapes).

## Do's and Don'ts

### Do:

- **Do** consume every color through semantic vars / mapped Tailwind tokens
  (`bg-raised`, `text-ink-faint`, `border-line`) so light/dark × 8 themes ×
  high-contrast all keep working.
- **Do** express depth with hard offsets (`shadow-neo*`) and state-driven lifts
  (`.riser`); let Float3D/orbs do atmospheric work on marketing only.
- **Do** keep every string through `t()` with en + id in sync (Indonesian-first).
- **Do** respect motion controls: honor `data-motion="reduced"` and
  `prefers-reduced-motion` in every animation you add.
- **Do** render hanzi with `.hanzi` (Noto CJK stack) and keep pinyin + zhuyin paired.

### Don't:

- **Don't** reintroduce the retired world: warm cream grounds, terracotta accents,
  editorial serif faces — they were removed wholesale as anti-patterns.
- **Don't** add soft/diffuse drop shadows to new surfaces (neo-dominant doctrine).
- **Don't** hardcode hexes in components or invent a fourth brand hue; exams are a
  fixed set of exactly five (`hsk tocfl goethe jlpt toefl`) — never more.
- **Don't** put Spanish anywhere in content or UI (English + Indonesian only).
- **Don't** decorate with functional colors (gold/jade/info/warn/danger report state,
  they don't style layout).
