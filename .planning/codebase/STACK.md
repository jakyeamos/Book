# Technology Stack

**Analysis Date:** 2026-03-11

## Languages

**Primary:**
- JavaScript (ES2020+) - All application logic, configuration, and tooling
- HTML5 - Chapter content fragments and application shell (`index.html`, `chapters/ch01.html` through `chapters/ch15.html`)
- CSS3 - All visual styling (`styles.css`)

**Secondary:**
- JSON - Chapter manifest and project config (`chapters/index.json`, `.planning/config.json`)

## Runtime

**Environment:**
- Node.js v25.8.0 (detected on host machine)
- No `.nvmrc` or `.python-version` present; no pinned Node version in project

**Package Manager:**
- npm
- Lockfile: present (`package-lock.json`, lockfileVersion 3)

## Module System

**Frontend:**
- ES Modules (`type` field in `package.json` is `"commonjs"` but `index.html` loads `script.js` as `type="module"`, and `script.js` uses `import` syntax from `./chapters/config.js`)

**Tooling:**
- CommonJS (`tools/convert-chapters.cjs`, `tools/validate-chapters.cjs` use `require()`)

## Frameworks

**Core:**
- None — vanilla JavaScript, no frontend framework (no React, Vue, Svelte, etc.)

**Animation:**
- GSAP 3.13.0 — scroll-driven animations, parallax, audio volume tweening, title entrance, poetry stagger, bold-grow effects
  - Loaded via CDN: `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js`
  - ScrollTrigger plugin: `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js`
  - Used in `script.js` via `window.gsap` and `window.ScrollTrigger`
  - Fallback paths exist for when GSAP is unavailable (IntersectionObserver + `requestAnimationFrame`)

**Particle Effects:**
- tsParticles Slim 2.12.0 — per-chapter ambient particle systems (dust, rain, embers, snow, stars)
  - Loaded via CDN: `https://cdnjs.cloudflare.com/ajax/libs/tsparticles-slim/2.12.0/tsparticles.slim.bundle.min.js`
  - Used in `script.js` via `window.tsParticles`
  - Config defined in `chapters/config.js` under `PARTICLE_PRESETS`

**Testing:**
- None detected

**Build/Dev:**
- None — no bundler (Webpack, Vite, Rollup, esbuild, Parcel)
- Project runs directly from the filesystem via any HTTP server
- `file://` protocol not supported (fetch API requires HTTP)

## Key Dependencies

**Runtime (npm):**
- `mammoth` ^1.11.0 — converts `.docx` Word files to HTML for chapter authoring pipeline
  - Used only in `tools/convert-chapters.cjs` (offline tooling, not loaded in browser)

**CDN (browser runtime):**
- GSAP 3.13.0 — animation engine (loaded from cloudflare CDN)
- tsParticles Slim 2.12.0 — particle engine (loaded from cloudflare CDN)

## Configuration

**Chapter Manifest:**
- `chapters/index.json` — ordered list of chapter IDs, filenames, titles, and numbers

**Chapter Config:**
- `chapters/config.js` — ES module exporting per-chapter themes, audio cues, particle types, parallax layers, and site-wide config (`SITE_CONFIG`) including optional Giscus settings

**App Config:**
- `.planning/config.json` — GSD workflow settings (mode, model profile, parallelization)

**Environment:**
- No `.env` files present; no environment variables required for runtime
- No build step; no environment-specific config files

**Build:**
- No build config files (no `vite.config.*`, `webpack.config.*`, `tsconfig.json`, etc.)

## Platform Requirements

**Development:**
- Node.js (any recent version) for running tooling scripts in `tools/`
- Any HTTP server to serve `index.html` (e.g., `npx serve`, `python -m http.server`, VS Code Live Server)
- `file://` protocol explicitly unsupported — fetch API calls will fail

**Production:**
- Static file hosting only — no server-side runtime required
- All assets are local files (HTML, CSS, JS, MP3, PNG)
- CDN dependencies: Cloudflare CDN for GSAP and tsParticles; Giscus CDN for comments (optional)

---

*Stack analysis: 2026-03-11*
