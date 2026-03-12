# Book

Book is a browser-based interactive reading experience that loads chapter fragments from a manifest and layers chapter-specific styling, motion, audio, and particle effects.

## Features

- Manifest-driven chapter loading from `chapters/index.json`
- Chapter-specific themes (color, gradients, transitions, background layers)
- Crossfaded background music with line-aware cue transitions
- Optional ambient audio layer support
- Particle presets per chapter using `tsparticles-slim`
- Scroll-based motion using GSAP + ScrollTrigger
- Optional Giscus discussion embed

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start a local HTTP server (required for `fetch()` chapter loading):

```bash
python -m http.server 8080
```

3. Open the app:

- [http://localhost:8080/index.html](http://localhost:8080/index.html)

## Scripts

- `npm test` runs full chapter validation (manifest + chapter checks + formatting lint)
- `npm run validate:chapters` runs full chapter validation
- `npm run validate:manifest` validates `chapters/index.json`
- `npm run lint:chapters` checks chapter HTML for inline styles
- `npm run convert:chapters` converts source `.docx` files via Mammoth

## Content Pipeline

1. Convert `.docx` inputs to raw HTML with `tools/convert-chapters.cjs`.
2. Curate chapter fragments into `chapters/chNN.html`.
3. Register chapter entries in `chapters/index.json`.
4. Run `npm test` before committing.

## Repository Layout

- `index.html` app shell
- `script.js` client runtime and chapter orchestration
- `styles.css` visual system and chapter theme styles
- `chapters/` chapter fragments, manifest, and chapter config
- `assets/` audio and media assets
- `tools/` conversion and validation scripts
- `.planning/` project planning and implementation notes

## Notes

- Ambient/parallax assets are optional. If no media file is configured, the app uses gradient fallbacks and no ambient playback.
- Giscus configuration is managed in `chapters/config.js` under `SITE_CONFIG.giscus`.
