# Immersive Book Site

## What This Is

A cinematic, browser-based reading experience for a literary fiction novel with integrated poetry. Each chapter has its own distinct visual world — unique color palette, particle effects, parallax backgrounds, and soundscape — making the act of reading feel like stepping into a film. Hosted on GitHub Pages for both private early readers and eventual public release.

## Core Value

Every chapter feels like its own cinematic world — the visuals, audio, and text effects should serve the story, not decorate it.

## Requirements

### Validated

- ✓ Chapter navigation (prev/next/dropdown) — existing
- ✓ Per-section background audio playback — existing
- ✓ Dark mode toggle — existing
- ✓ Text highlighting — existing
- ✓ Scroll position memory — existing

### Active

- [ ] Per-chapter visual themes (distinct color palette, atmosphere, mood)
- [ ] Parallax scrolling backgrounds per chapter
- [ ] Scroll-triggered text animations (fade-in, reveal, typewriter for poetry)
- [ ] Particle effects per chapter (snow, embers, dust, stars, etc.)
- [ ] Smooth audio crossfade transitions between chapters/sections
- [ ] Extendable chapter theme system (adding a new chapter = defining a theme object)
- [ ] Visual polish on controls (nav bar, buttons) to match cinematic aesthetic
- [ ] Responsive design that preserves effects on mobile

### Out of Scope

- Server-side rendering — must stay static (GitHub Pages constraint)
- Build tooling / bundlers — vanilla HTML/CSS/JS to keep it simple to extend
- User accounts / saved reading progress server-side — localStorage is sufficient
- Video backgrounds — storage/bandwidth not justified for v1

## Context

- **Existing codebase:** `index.html` (426 lines), `script.js` (466 lines), `styles.css` (352 lines)
- **Audio assets:** Eva_Angelina.mp3, Mojo_Pin.mp3, Rose_Parade.mp3 already in repo
- **Current chapter mapping:** section1→Eva_Angelina, section2→Mojo_Pin, section3→Rose_Parade
- **Platform:** GitHub Pages (Jekyll workflow exists in .github/)
- **Setting:** Near-future fiction (2036, Olympia Washington), introspective tone, literary voice
- **Chapters:** 2 exist (The Ritual, The Routine), many more planned — system must scale
- **Audience:** Private early readers now, public release planned

## Constraints

- **Tech stack**: Vanilla HTML/CSS/JS — no build step, no frameworks
- **Hosting**: GitHub Pages — static only, no server
- **Extensibility**: Each new chapter should require minimal code to theme (ideally one config object)
- **Compatibility**: Must not break existing chapter content, audio mapping, or reading features

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep vanilla JS (no framework) | GitHub Pages static constraint + author can extend without tooling | — Pending |
| Chapter themes as data config | Dramatically different chapters need a scalable pattern, not hard-coded CSS | — Pending |

---
*Last updated: 2026-03-10 after initialization*
