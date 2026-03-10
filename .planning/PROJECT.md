# Immersive Book Site

## What This Is

A cinematic, browser-based reading experience for a multi-POV literary fiction novel (~25 chapters planned, ~14 drafted). Three protagonists — Xander, Nico, and Gianna — whose lives intersect in Olympia, Washington in March 2036. The site needs two things: first, the latest chapter content migrated from source documents into the HTML; second, a per-chapter cinematic atmosphere (unique visuals, particles, parallax, soundtrack) that serves each chapter's specific tone. Hosted on GitHub Pages.

## Core Value

Every chapter feels like its own cinematic world — the visuals, audio, and text effects should serve the story, not decorate it.

## The Story

**Three POVs, five parts, ~25 chapters (March–August 2036, Olympia WA)**

- **Xander**: Intellectual, isolated, suicidal ideation (handled with restraint), reads philosophy in the library, avoidant attachment. Morning rituals, self-medication through sensation.
- **Nico**: OCD rituals, library worker, lost his journalist father Luca, unresolved grief/investigation obsession. Careful, precise, carrying immense weight.
- **Gianna**: Nico's sister, the "golden child" / caretaker, exhausted by obligation, exploring her sexuality (Sofia), performs wellness.

**Peripheral voices:** Betsy (librarian), Emma (Nico's ex), Quinn (barista), Dr. Reeves (Nico's therapist), Laura (their mother), Sofia (Gianna's love interest).

**Themes:** Sonder, isolation vs. connection, grief as absurdity, performance of self, hero/caretaker burnout, small kindnesses.

**Tone:** Contemplative, melancholic, occasionally hopeful. Not neat resolution — changed but not fixed.

**Structural elements:**
- Journal/letter entries between chapters (Betsy, Emma unsent email, Quinn, Sofia drafts, Dr. Reeves notes, Laura letter)
- Sonder interludes (disconnected peripheral lives: janitor, bus driver, nurse)
- Poetry integrated throughout (`.poetic-text` blocks)

## Chapter-by-chapter atmosphere (for visual theming)

| Ch | Title | POV | Mood / Visual Direction |
|----|-------|-----|------------------------|
| 1 | The Ritual | Xander | Grey morning, isolation, muted blue-grey, sparse dust motes |
| 2 | The Routine | Nico | OCD precision, library, rain — cool green, clean lines, rain particles |
| 3 | Left Alone | Nico (flashback) | Childhood trauma, warmer then darkening — sepia to shadow |
| 4 | Breaking Through | Nico (flashback) | First opening up, Emma — soft warm amber, hopeful |
| 5 | Grad | Nico (flashback) | Senior year hope — golden, fleeting light |
| 6 | All Good Things | Nico (flashback) | Luca's death, collapse — deep blue to black, falling embers |
| 7 | Static Between Stations | Nico | Stuck, phone static, in-between — grey grain/static texture |
| 8 | Golden | Gianna | Sunday family dinner performance — warm gold with tension |
| 9-10 | Gianna's Week | Gianna | Campus life, Sofia attraction, exhaustion — soft collegiate |
| 15 | Blackberries | Xander | Sensory memory, loss, stained fingers — deep purple/burgundy |

## Requirements

### Validated

- ✓ Chapter navigation (prev/next/dropdown) — existing
- ✓ Per-section background audio playback — existing
- ✓ Dark mode toggle — existing
- ✓ Text highlighting — existing
- ✓ Scroll position memory — existing

### Active

**Content migration (must happen first):**
- [ ] All drafted chapters (1–14+) migrated from docx/md source files into HTML
- [ ] Existing HTML chapters 1–2 replaced with updated docx versions (significantly expanded)
- [ ] Chapter selector dropdown updated to reflect all chapters

**Cinematic experience:**
- [ ] Per-chapter visual themes (distinct color palette, atmosphere, mood)
- [ ] Parallax scrolling backgrounds per chapter
- [ ] Scroll-triggered text animations (fade-in, reveal, typewriter for poetry)
- [ ] Particle effects per chapter (snow, embers, dust, stars, etc.)
- [ ] Smooth audio crossfade transitions between chapters/sections
- [ ] Extendable chapter theme system (adding a new chapter = defining a theme object)
- [ ] Visual polish on controls (nav bar, buttons) to match cinematic aesthetic
- [ ] Responsive design that preserves effects on mobile
- [ ] Giscus comments configured

### Out of Scope

- Server-side rendering — must stay static (GitHub Pages constraint)
- Build tooling / bundlers — vanilla HTML/CSS/JS to keep it simple to extend
- User accounts / saved reading progress server-side — localStorage is sufficient
- Video backgrounds — storage/bandwidth not justified for v1
- Scrolljacking — documented UX harm
- `background-attachment: fixed` — hard broken on iOS Safari

## Context

- **Existing codebase:** `index.html` (426 lines, 2 chapters), `script.js` (466 lines), `styles.css` (352 lines)
- **Audio assets:** Eva_Angelina.mp3, Mojo_Pin.mp3, Rose_Parade.mp3 already in repo
- **Source chapters:** `Downloads/chapters-*/chapters/` — 7 docx files + 2 md files covering Ch 1–15 (with gaps)
- **Platform:** GitHub Pages (Jekyll workflow in .github/)
- **Known issues:** Debug log overlay visible in production; Giscus unconfigured; audio sections 4-6 unmapped; `background-attachment: fixed` not yet used but must be avoided
- **Roadmap:** ~25 chapters planned, 14 drafted, stored in docx files outside the repo

## Constraints

- **Tech stack**: Vanilla HTML/CSS/JS — no build step, no frameworks
- **Hosting**: GitHub Pages — static only, no server
- **Extensibility**: Each new chapter should require minimal code to theme (ideally one config object)
- **Compatibility**: Must not break existing chapter content, audio mapping, or reading features
- **Content sensitivity**: Story handles self-harm ideation and OCD with literary care — visual effects should amplify, not trivialize

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Content migration before visual effects | Can't design chapter atmospheres without reading final content | — Pending |
| Keep vanilla JS (no framework) | GitHub Pages static constraint + author can extend without tooling | — Pending |
| Chapter themes as data config | Dramatically different chapters need a scalable pattern, not hard-coded CSS | — Pending |
| GSAP 3.13+ (ScrollTrigger + SplitText) | Free since 2024, covers parallax + text animations, zero build step | — Pending |
| tsParticles slim (CDN) | particles.js abandoned; slim bundle <50KB | — Pending |
| Web Audio API for crossfade | Dual `<audio>` element pattern for smooth crossfade without build step | — Pending |

---
*Last updated: 2026-03-10 after deep questioning + research + chapter document review*
