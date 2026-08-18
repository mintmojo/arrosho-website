# Arrosho Design System

Arrosho is a one-person sourcing firm running several offers off one central method: **trace the stream to its source, and surface what isn't sitting on the open market or in the open inbox.** The name comes from *arroyo* — a stream that finds its own path below the surface.

Two audiences, one method:

- **Lead generation** for recruitment and staffing agencies — cold email systems, list building, deliverability, replies handed over warm.
- **Off-market sourcing** for builders and developers — land and infill sites identified, vetted and negotiated before they're listed. A homeowner-facing landing page (`/homeowner-breakdown`) feeds that same pipeline from the seller's side.

Everything in this system is lifted from the live site's source code, not redrawn.

## Sources

| Source | Where |
| --- | --- |
| GitHub repo (primary) | https://github.com/mintmojo/arrosho-website — `index.html`, `homeowner-breakdown.html`, `terms.html` |
| Attached codebase | `Arrosho/` (same tree, plus unrelated side projects) |
| Uploaded assets | `uploads/arrosho logo.svg`, `uploads/arrosho wordmark.svg` |
| Brand notes | Palette, type, form and voice notes supplied with the brief |

Read the repo directly for anything this system doesn't cover — the site is a single self-contained HTML file per page and every value here traces back to it. The repo also contains three unrelated personal apps (`bedrock/`, `stopwatch/`, `wheel-of-almost-death/`) that are **not** Arrosho-branded; ignore them.

## Index

| Path | What's there |
| --- | --- |
| `styles.css` | The one stylesheet consumers link — imports everything below |
| `tokens/` | `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `form.css` (radii, shadow, gradients, motion), `base.css`, `responsive.css` (layout utility classes + the two breakpoints) |
| `assets/` | Wordmark and cutwater mark (light + dark), stream motif, stream backgrounds, root divider |
| `components/` | `core/`, `brand/`, `layout/`, `cards/`, `forms/`, `disclosure/` |
| `guidelines/` | Foundation specimen cards (colors, type, spacing, form, brand) |
| `ui_kits/website/` | Click-through recreation of arrosho.com and the homeowner landing page |
| `templates/landing-page/` | Starting template: single-offer landing page (hero → three points → mechanics → FAQ → contact) |
| `SKILL.md` | Agent Skills wrapper for use in Claude Code |
| `github.md` | Upstream repo association and screen map |

## Components

| Group | Components |
| --- | --- |
| `components/core` | **Button**, **Pill**, **Tag**, **Eyebrow**, **Icon**, **StickyBar** |
| `components/brand` | **Wordmark**, **LogoMark**, **StreamBackground** |
| `components/layout` | **Section**, **SectionHeading** |
| `components/cards` | **TrackCard**, **PointCard**, **StepCard**, **FeatureItem** |
| `components/forms` | **Field** |
| `components/disclosure` | **Accordion** (+ **AccordionItem**) |
| `components/legal` | **LegalClause**, **DisclaimerBox**, **Placeholder**, **BackLink** |

The site is hand-written HTML with no component library, so this inventory is the set of *patterns* the source actually repeats — nothing invented on top.

**Intentional additions:** `Icon` (a wrapper around the site's own inline stroke glyphs, so they stop being copy-pasted path data) and `Section` / `SectionHeading` (the source repeats the same band structure — surface, noise, stream lines, 1180px well — on every screen).

---

# CONTENT FUNDAMENTALS

**Person.** First person singular on the homeowner page ("I take no commission from you"), first person plural on the business pages ("We run the outreach engine"). The reader is always **you**. Ethan signs his own name and number; there is no "our team of experts."

**Register.** Plain and blunt. No agency hype, no exclamation points, no emoji, no "revolutionize / unlock / seamless". Sentence case everywhere except the display headline, eyebrows and step ordinals.

**Headlines state the reader's problem in the reader's words:**
- "A pipeline that doesn't rely on referrals"
- "Development sites before they hit the market"
- "Seven percent of your home's value should stay in your pocket."
- "Where's the leak and where are you trying to grow?"

**Body uses em-dash contrast pairs** — the shape is *[what you get] — [what you don't]*:
- "so you're negotiating instead of competing"
- "qualified conversations, not cold silence"
- "That's not a discount I'm offering — it's money that never leaves your pocket."

**Concede the limit.** Every offer names who it isn't for: "If getting the absolute highest number matters more to you… list it on the market and go get every dollar. This isn't for everybody." That candor is load-bearing; don't edit it out for polish.

**Water metaphors: twice a page, maximum, and never in a CTA.** "Understand the root, find the source, treat leaks." "We'll route it to the right stream." The origin story ("arroyo — a brook, a stream") is told once, in the Who we are card.

**Numbered steps read as words:** FIRST / SECOND / THIRD; point labels read "One — the fees", "Two — the listing".

**FAQ answers lead with the blunt word:** "Nothing." "No — and be careful with anyone who does." "Not always, and I'll say so."

**CTA labels** are sentence-case verbs with no urgency theatre: *Book a consultation*, *Send message*, *Text me: (956) 379-7019*, *Or call*.

---

# VISUAL FOUNDATIONS

**Palette.** Slate `#2B3F45`, steel `#6894A1`, sage `#6A7062`, olive `#3E442B`, warm off-white `#E6E8E4`, grey `#A1B0AB`, near-black olive `#1B1F0A`. The logo teal `#3F9EAF` is the **accent** — it belongs to the mark and to the stream motif. Steel is demoted to atmosphere: gradients, section washes, small type accents, the primary button fill. Flag/alert is `#D2553F` (reserved; the live site never needs it). Page is warm off-white on near-black-olive text — never white-on-white or pure `#000`.

**Surfaces.** Light bands alternate page `#E6E8E4` → mist `#D7E0E2` → clay `#DDE0D2`. Dark bands are slate or olive. Max two background colors per page beyond the hero.

**Dark surfaces are never flat.** The hero gradient is `linear-gradient(155deg, #24343A → #3A555F → #6894A1 → #7CA0AC)` under two radial washes (near-black top-left, steel top-right), with a fractal-noise SVG at 0.05 opacity in `mix-blend-mode: overlay` on top. Nav pills carry their own `linear-gradient(160deg, #4A5138 → #23260F)`.

**Type.** Archivo Black for display — uppercase for page headlines only, weight 400 (the face is already black), `letter-spacing: -0.025em`, `line-height: 0.98`, `clamp(40px, 7vw, 92px)`. Section headings use the same face at 1.15 leading in **sentence case**. Archivo 600–800 for eyebrows, step ordinals and the typographic wordmark, uppercase at 0.14–0.22em tracking. Inter 400–600 for all body: 19px hero copy, 17/16/15.5px body, 1.6–1.7 leading, 0.82 opacity when white on dark.

**Backgrounds and imagery.** No photography anywhere on the live site — the atmosphere is entirely gradient + noise + line motif. If imagery is ever added, keep it cool, desaturated and slightly grainy so it sits with the slate/steel palette. No repeating patterns, no hand-drawn illustration.

**Signature motif.** Three stacked stream curves at descending stroke width (17.5 / 13.75 / 11.25) and descending opacity (1 / 0.75 / 0.5), round caps, teal. It lives inside the mark and as background line-work at 0.08–0.16 opacity behind hero and section content. **Never straighten it, never raise it above 0.16 in background use, never put it in front of content.**

**Counter-motif.** The "A" is a hard-edged symmetrical polygon. Soft water, hard rock — that contrast *is* the brand. Neither side may take over: don't round the A, don't add more curves than three.

**Form.** Radii: 10 field · 12 icon tile · 14 action · 16 step card · 18 pill · 20 media · 24 card · 999 capsule. **One shadow only** — `0 10px 24px rgba(0,0,0,0.28)`, applied on hover, plus `0 24px 60px rgba(0,0,0,0.35)` reserved for the video frame. No inner shadows, no glows.

**Cards.** Solid dark fills (slate or olive), 24px radius, no border, no shadow at rest, generous padding (56/48 for track cards, 40/34 for point cards). Translucent cards on dark surfaces use `rgba(230,232,228,0.06)` with a `rgba(230,232,228,0.12)` hairline at 16px radius.

**Borders.** Hairlines only: `rgba(27,31,10,0.1)` on light, `rgba(230,232,228,0.14)` on dark. Feature rows and FAQ rows are divided by hairlines rather than boxed. One accent border exists: a 3px steel left rule on a pull-quote note.

**Animation.** Restrained and short: 0.15–0.2s `ease` on `transform` and `background` only. Hover = `translateY(-2px)`, plus the one shadow on pills. No bounce, no scale, no fade-in-on-scroll, no parallax. There is no distinct press state — press is the hover state.

**Hover states.** Buttons brighten steel → `#7CA0AC` and lift. Ghost buttons raise their fill from 0.08 to 0.16 white. Underlined links raise their border from 40% to 100% white. Footer links go grey → white.

**Transparency and blur.** Blur is used exactly twice: the sticky mobile CTA bar and the UI-kit nav, both `rgba(27,31,10,0.94)` + `blur(8px)`. Everywhere else, transparency is flat alpha over a solid surface.

**Responsive.** Two breakpoints, both from the source: 900px (three-up grids go single column) and 860px (two-up grids collapse, gutters drop to 24px, section padding to 76px, CTA rows stack, the decorative stream divider and root graphic hide, and the sticky mobile CTA bar appears). `tokens/responsive.css` ships these as `.arr-section`, `.arr-hero`, `.arr-grid-2`, `.arr-grid-3`, `.arr-grid-service`, `.arr-cta-row`, `.arr-sticky-bar`, `.arr-hide-mobile` — use them instead of writing new media queries.

**Layout.** 1180px content well (1040px on single-column pages), 48px gutters (24px on mobile), 110px section padding (76px mobile), 64px grid gap, 24px card gap. Two-column grids collapse to one at 860px. Nothing is fixed except the mobile CTA bar; there is no sticky header — the hero pill nav *is* the navigation.

---

# ICONOGRAPHY

The site uses **inline 24×24 stroke icons, `stroke-width: 2`, `fill: none`, round joins** — the Lucide/Feather geometry, hand-pasted as raw path data rather than loaded from a package. Those exact paths are collected in `components/core/Icon.jsx` as the canonical set: `message, mail, envelope, pin, users, phone, search, bars, pulse, chart, checkSquare, expand, arrowRight`.

- **Use `<Icon />` first.** If a glyph is missing, take the closest **Lucide** icon (https://lucide.dev) at stroke-width 2 and add it to the map — Lucide is the matching set, and no substitution has been needed so far.
- **Sizes in use:** 20px in pills and feature tiles, 19px in CTA buttons, 17px in contact rows, 16px in meta rows. Icons inside a 44px slate tile (12px radius) or a 38px translucent tile (10px radius) are white.
- **No emoji. Ever.** No unicode pictographs either. The only non-icon glyphs the brand uses are typographic: the em dash, the down arrow `↓` at the end of a jump link, and the `+` / `–` on the FAQ toggle (Archivo 700, 24px, steel).
- **No icon font, no sprite sheet, no PNG icons** exist in the source. The favicon is `assets/arrosho-logo.svg`.
- **Brand SVGs** in `assets/`: `arrosho-wordmark.svg` / `-light`, `arrosho-logo.svg` / `-light`, `stream-motif.svg`, `stream-lines.svg`, `stream-root.svg`, `stream-divider.svg`. All are extracted from the live source — do not redraw them.

---

# FONTS

Archivo, Archivo Black and Inter, loaded from Google Fonts exactly as the live site does (`tokens/fonts.css`). No font binaries were provided and none are needed — these are the real brand faces, not substitutes. If Arrosho ever self-hosts, drop the woff2 files into `assets/fonts/` and swap the `@import` for `@font-face` rules.
