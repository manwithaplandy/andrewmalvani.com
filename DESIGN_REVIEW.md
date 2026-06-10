# Design & UX Review — andrewmalvani.com (2026-06-09)

Consolidated findings from a five-dimension review (visual design, UX/IA, accessibility,
responsive/performance, content/SEO) plus a live-site browser pass at andrewmalvani.com.
Organized by implementation workstream. Severity: H/M/L.

---

## Workstream 1 — Home page components

Owns: `src/pages/index.tsx`, `src/components/Sections/Hero.tsx`, `About.tsx`,
`Portfolio.tsx`, `Resume/*`, `src/components/SectionHeading.tsx`, `Reveal.tsx`.

- **H — Skills still render as animated progress bars, not tiers.** `Resume/Skills.tsx:47-58`.
  The redesign intent is tiered skills (chips/pills grouped by proficiency, or dot/segment
  indicator), but `Skill` renders a `bg-gradient-to-r from-orange-500 to-orange-400`
  width-animated bar driven by `level/max` — the most prominent leftover of the old template
  language. Note `Graph/FocusPanel.tsx:112-116` reuses this component ("Hands-on depth");
  keep FocusPanel working (either share the new tier treatment or leave a bar variant there).
- **H — Heading hierarchy is incoherent.** Hero `h1` is fine, but Resume has no section-level
  `h2` ("Work/Education/Skills/Certifications" category labels at `ResumeSection.tsx:7` are
  `h2` eyebrows, items are `h3`). Normalize: one `h2` per section → `h3` per item; demote
  category labels. (WCAG 1.3.1, 2.4.6)
- **H — No skip-to-content link** on `/` (only `/graph` has one). Add a visually-hidden,
  focus-visible skip link targeting `<main id="main">` in `index.tsx`. (WCAG 2.4.1)
- **H (observed live) — Sections render fully black during fast scrolling.** In real browsing,
  the Portfolio section stayed completely invisible across consecutive viewports when scrolling
  down quickly, revealing only on scroll-up. `Reveal.tsx` initializes visible and hides
  below-the-fold content, but the reveal trigger lags badly on fast scroll. Investigate
  threshold/rootMargin (e.g. trigger earlier with positive bottom rootMargin) and add a
  fallback so content is never indefinitely hidden.
- **M — Portfolio `group-hover` styles never fire.** `Portfolio.tsx:33,41` use
  `group-hover:scale-105` / `group-hover:text-orange-400` but no ancestor has the `group`
  class. Add `group` to the card `<a>`.
- **M — Hero secondary button breaks the palette.** `Hero.tsx:43` uses white border/ring
  identity (`border-neutral-500 text-white ring-white hover:bg-white/10`); align hover with
  the accent (`hover:border-orange-400/60`) to match the FocusPanel/chevron language.
- **M — Hero CTA weighting.** Contact (the primary conversion) is the only CTA without an
  icon and is visually tied with "Career Graph". Give Contact an `EnvelopeIcon` and a clear
  secondary treatment; graph reads as tertiary/novelty.
- **M — Hero `h-screen` + iOS `-webkit-fill-available` hack.** `Hero.tsx:16` +
  `globalStyles.scss:17-21`. Switch to `h-[100svh]`/`min-h-[100svh]` (graph already does)
  and drop the SCSS hack.
- **M — Hero body copy carries template typography.** `data.tsx:75-84` styling (handled in
  WS5 for copy, but the rendering side: only place using `stone` palette and `lg:prose-lg`;
  paragraphs have no vertical gap). Use `neutral` scale, drop `lg:prose-lg`, add `space-y-3`.
- **L — Education items render empty `<p></p>` content** (`data.tsx:284-297`) leaving blank
  space; render nothing when content is empty.
- **L — Cert badge letter-fallback is near-white** (`CertificationItem.tsx:12,22`,
  `bg-neutral-100/200`); use a dark well (`bg-neutral-800`) for the fallback. Real badge
  images may keep the light well.
- **L — Contact section reimplements SectionHeading inline** (`Contact/index.tsx:31-34`);
  use `<SectionHeading>` (coordinate with WS3 which owns that file).

## Workstream 2 — Header, nav, footer

Owns: `src/components/Sections/Header.tsx`, `Footer.tsx`, `src/components/Socials.tsx`,
`src/hooks/useNavObserver.tsx`.

- **H — `/stats` is not in the primary nav** (`Header.tsx:34-44`); it's a flagship artifact
  reachable only via a buried sentence + footer link. Add a `stats` route entry like `graph`.
- **M — orange-500 vs orange-400 accent split.** Old components (`Header.tsx:56-57,87`,
  `Socials.tsx:11`, `Contact/index.tsx:50`) hover/ring with `orange-500`; the documented
  accent is `orange-400` (themeTokens.js). Unify text hovers and focus rings on the -400
  accent. (Button fills orange-500→orange-400-hover may stay.)
- **M — "Graph" nav label indistinguishable from in-page anchors.** Relabel "Career Graph"
  and/or add the `CubeTransparentIcon` so page-routes read differently from scroll anchors.
- **M — No `aria-current` on active nav item** (color-only signal, `Header.tsx:139`).
- **M — Mobile menu:** no visible close button; hamburger has double labelling
  (`aria-label="Menu Button"` + sr-only span) and lacks `aria-expanded`/`aria-controls`.
- **M — Footer contrast:** `text-neutral-500` copyright/"Site analytics" link ~3.9:1, below
  AA; bump to `neutral-400` and give the in-prose link a persistent underline. Social icons
  inherit the low-contrast wrapper (non-text contrast). (WCAG 1.4.3, 1.4.11, 1.4.1)
- **L — Hover transitions inconsistent** (`transition-all` vs none vs `transition-colors`);
  standardize on `transition-colors duration-300`.
- **L — No "home/top" nav target while in Hero** (no active item); optional name/logo link.

## Workstream 3 — Contact form

Owns: `src/components/Sections/Contact/ContactForm.tsx`, `Contact/index.tsx`.

- **H — Single generic error for all failure modes** (`ContactForm.tsx:42-61,126-131`);
  no per-field validation feedback. Add inline field validation and differentiate
  network/server errors where possible; keep entered data.
- **M — 250-char silent cap** (`maxLength={250}`, counter `aria-hidden`). Raise the limit
  (Lambda is authoritative), expose the counter to AT via `aria-describedby`, warn near cap.
- **M — Success state:** form silently clears; add "I'll get back to you within a few days —
  or email me directly at andrewrmalvani@gmail.com", and reset the banner to idle on next
  input so stale success/error doesn't linger.
- **L — Use `<SectionHeading>` instead of the inline copy** (`Contact/index.tsx:31-34`)
  and unify `hover:text-orange-500` → `-400` on the contact links.

## Workstream 4 — Stats & Graph pages

Owns: `src/pages/stats.tsx`, `src/pages/graph.tsx`, `src/components/Sections/Stats/*`,
`src/components/Graph/*` (FocusPanel `Skill` usage coordinated with WS1).

- **H — `/stats` uses a different design system.** `rounded-lg bg-neutral-800` borderless
  cards on `bg-neutral-900` vs the site's `rounded-xl border-neutral-800 bg-neutral-900`
  cards on `#0a0a0a`. Rebuild on shared card tokens (ideally `SpotlightCard` or at least the
  shared classes).
- **H — Page base background mismatch.** `/stats` and `/graph` mains use `bg-neutral-900`;
  the site base is `#0a0a0a`/neutral-950. Standardize (page=950, card=900, inner=800).
- **M — Graph onboarding hint is one-shot** (localStorage-dismissed, never returns;
  `GraphExplorer.tsx:281-295`). Add a persistent "Controls / ?" pill next to Legend that
  reopens it. Also add a one-line "what am I looking at" subtitle to the overlay.
- **M — Graph global keydown handler** (`GraphExplorer.tsx:81-116`) captures arrows/Backspace
  on `window`; scope to the focused `role="application"` container. (WCAG 2.1.1)
- **M — GraphListFallback touch targets ~24-28px** (`GraphListFallback.tsx:80,130`) — it's the
  primary no-WebGL/weak-GPU mobile path; increase to ≥44px effective.
- **M — Small orange + neutral-500 text contrast on stats** (`StatCard.tsx`, `stats.tsx:74,
  109-112`): bump informational `neutral-500` → `neutral-400`; use `orange-300` for small
  orange text. (WCAG 1.4.3)
- **L — Error state has no retry** (one-shot fetch, `useStats.ts:80`); add a Retry button.
- **L — `lastUpdated` rendered as raw ISO** (`stats.tsx:110-112`); format like `since`.
- **L — Stats state transitions not announced** — wrap the `match(state)` output in a
  persistent `aria-live="polite"` region. (WCAG 4.1.3)
- **L — `/stats` has no global nav** (only "Back to andrewmalvani.com"); consider the shared
  Header so a reader can reach Contact in one click.

## Workstream 5 — Content, copy, metadata, PWA

Owns: `src/data/data.tsx`, `src/data/siteConfig.ts`, `src/components/Layout/Page.tsx`,
`public/*`, `next-sitemap.config.js`.

- **H — `public/site.webmanifest` is still the template's:** name/short_name
  `react-resume-template`, gray `#515455` colors, and icon entries (`/icon-192.png`,
  `/icon-512.png`) that 403 in production. Fix name to "Andrew Malvani", brand colors
  (`#0a0a0a`), and add real icons.
- **H — Referenced favicon assets missing (403 live):** `Page.tsx:52-53` links `/icon.svg`
  and `/apple-touch-icon.png`; neither exists in `public/` (only favicon.ico). Generate the
  icon set or remove the dead links.
- **M — Hero pitch is generic buzzword filler** (`data.tsx:73-86`). Rewrite to lead with the
  quantified proof already in the resume ($15M/yr avoided, $50M ROI, 10,000+ users).
- **M — Contact copy reads like a freelancer template** (`data.tsx:456-458`, "my services").
  Rewrite for a recruiter audience.
- **M — JSON-LD `alumniOf` omits the Georgia Tech MS** (`siteConfig.ts:18` — UCSB only);
  make it an array sourced from the education data. Optional: `worksFor.url`.
- **M — About prose is a 90-word framework keyword wall** (`data.tsx:114`) duplicating
  Hero/Skills; tighten to 2-3 outcome-focused sentences. Contains typo **"workfows"**.
- **L — `aboutItems` "Nationality: American"** is low-signal; "Study" says UCSB while the
  resume leads with the Georgia Tech MS — update or drop.
- **L — `theme-color` meta `#171717`** (`Page.tsx:46`) vs actual `#0a0a0a` base.
- **L — robots.txt has duplicate `User-agent: *` blocks** (`next-sitemap.config.js:16-27`);
  collapse to one allow-all policy.
- **L — Portfolio copy uneven:** GitHub and Retirement tiles are what-only (no impact line);
  the architecture-diagram link points at Google Drive — self-host (repo already has
  `website-diagram.png`). "Github" → "GitHub".
- **L — GitHub repo name `react-resume` advertises the template lineage** from the flagship
  portfolio tile; consider renaming the repo or linking the profile instead. (User decision.)

## Workstream 6 — Performance & motion (run after WS1-5 merge)

Owns: `src/images/*`, `src/components/ParticleField.tsx`, `src/globalStyles.scss`,
image import lines in `data.tsx`.

- **H — 1.7MB `retirement_site.png` served into a ~400px thumbnail** (static export ships
  sources byte-for-byte; build-verified). Also `GitHub__headpic.jpg` 243KB,
  `website-diagram.png` 182KB, `profilepic.jpg` 291KB rendered at 128px,
  `header-background.webp` 269KB (LCP, could be smaller). Re-encode to display-size WebP
  (~1.6MB+ total savings); update imports if extensions change.
- **M — ParticleField never pauses:** no `visibilitychange`/IntersectionObserver gating
  (the O(n²) loop runs for the whole page scroll and in background tabs) and DPR is
  unclamped (9× fillrate on DPR-3 phones); resize re-seeds all particles (mobile URL-bar
  show/hide). Mirror the pause + DPR-clamp pattern already in `ResumeGraphCanvas.tsx:482,
  546-559`.
- **M — Global `scroll-behavior: smooth` ignores `prefers-reduced-motion`**
  (`globalStyles.scss`); add the reduce override. (WCAG 2.3.3)
- **L — Confirm `og-image.jpg` is deployed** (referenced by `siteConfig.ts:10`, 200 live —
  confirmed fine; `stats.json` is published out-of-band by the pipeline as designed).

## Verification notes

- Build is healthy: `/` first-load 138kB; three.js correctly code-split to an async 563kB
  chunk loaded only on `/graph`.
- Already good (don't regress): per-page titles/descriptions/canonicals/OG, JSON-LD presence,
  skeleton CLS behavior, `next/font` Inter with swap, Reveal SSR/no-JS safety, graph a11y
  architecture (sr-only list tree driving the same reducer, WebGL/FPS fallbacks,
  reduced-motion toggle), exhaustive ts-pattern states on /stats, form labels + live region.
- **Mobile rendering could not be visually verified** in this review (browser window refused
  to resize below desktop width); the verification pass must use DevTools device emulation
  or a real device for 320-400px checks.
