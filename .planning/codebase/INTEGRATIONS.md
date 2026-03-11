# External Integrations

**Analysis Date:** 2026-03-11

## APIs & External Services

**CDN — Animation:**
- GSAP (GreenSock) via Cloudflare CDN
  - URL: `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js`
  - URL: `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js`
  - Auth: None
  - Loaded in: `index.html` lines 48–49
  - Consumed in: `script.js` via `window.gsap` and `window.ScrollTrigger`

**CDN — Particle Effects:**
- tsParticles Slim via Cloudflare CDN
  - URL: `https://cdnjs.cloudflare.com/ajax/libs/tsparticles-slim/2.12.0/tsparticles.slim.bundle.min.js`
  - Auth: None
  - Loaded in: `index.html` line 50
  - Consumed in: `script.js` via `window.tsParticles`

**Comments — Giscus:**
- Giscus (GitHub Discussions-based comment widget) — optional, disabled by default
  - Script URL: `https://giscus.app/client.js`
  - Enabled via: `SITE_CONFIG.giscus` object in `chapters/config.js`
  - Required config values: `repo`, `repoId`, `categoryId` (must be set to real values, not placeholder strings)
  - Optional config values: `category` (default `"General"`), `mapping` (default `"pathname"`), `theme` (default `"preferred_color_scheme"`)
  - Injected dynamically into `#giscus-container` in `index.html`
  - Loaded lazily with `loading="lazy"` and `crossorigin="anonymous"`
  - If not configured, `#giscus-placeholder` is shown instead
  - Setup logic: `script.js` `setupGiscus()` function (line 1018)

## Data Storage

**Databases:**
- None — no database

**File Storage:**
- Local filesystem only
  - Chapter HTML fragments: `chapters/ch01.html` through `chapters/ch15.html`
  - Chapter manifest: `chapters/index.json`
  - Audio tracks: `Eva_Angelina.mp3`, `Mojo_Pin.mp3`, `Rose_Parade.mp3` (root directory)
  - Ambient audio: `assets/ambient/` (referenced in config, e.g., `wind_loop.mp3`, `rain_loop.mp3`, `night_wind.mp3`)
  - Parallax images: `assets/ch1/fog.png`, `assets/ch1/city-silhouette.png`, `assets/ch2/rain-backdrop.png`, `assets/ch2/library-shadow.png`

**Caching:**
- In-memory chapter cache: `state.chapterCache` (Map) in `script.js` — caches fetched chapter HTML for the session
- No service worker or HTTP cache configuration

## Authentication & Identity

**Auth Provider:**
- None — no authentication; the application is fully public and read-only

## Browser Storage

**localStorage (client-side persistence):**
- `selectedChapter` — last visited chapter ID
- `scrollPosition` — last scroll position (pixels, as integer string)
- `highlights` — JSON array of `{chapterId, text}` objects for reader highlights
- `darkMode` — `"enabled"` or `"disabled"`
- `audioMuted` — `"true"` or `"false"`

All localStorage access is in `script.js`. No cookies or sessionStorage used.

## Monitoring & Observability

**Error Tracking:**
- None — no third-party error tracking (no Sentry, Datadog, etc.)

**Logs:**
- Custom `Logger` object in `script.js` (lines 280–294)
  - `Logger.debug()` and `Logger.info()` only output when `isDev` is true
  - `isDev` is true when `hostname` includes `localhost`, equals `127.0.0.1`, or URL has `?debug` param
  - `Logger.error()` always outputs to `console.error`

## CI/CD & Deployment

**Hosting:**
- Static file hosting (no server runtime required)
- Repository: `https://github.com/jakyeamos/Book` (per `package.json`)
- No deployment configuration files detected (no `netlify.toml`, `vercel.json`, `_redirects`, `.github/workflows/`, etc.)

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- None — no environment variables used at runtime

**Secrets location:**
- No secrets present; no `.env` files

**Giscus configuration (when enabling comments):**
- `SITE_CONFIG.giscus.repo` — GitHub repo slug (e.g., `"owner/repo"`)
- `SITE_CONFIG.giscus.repoId` — GitHub repo ID from Giscus setup
- `SITE_CONFIG.giscus.categoryId` — GitHub Discussions category ID
- All set in `chapters/config.js` `SITE_CONFIG` export

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Offline / Authoring Tooling

**mammoth (npm package, Node.js only):**
- Converts `.docx` Word files to raw HTML for the chapter authoring pipeline
- Used in: `tools/convert-chapters.cjs`
- Not loaded in the browser; purely a local developer tool
- Source `.docx` files are read from a local downloads path, output written to `chapters/raw/`

---

*Integration audit: 2026-03-11*
