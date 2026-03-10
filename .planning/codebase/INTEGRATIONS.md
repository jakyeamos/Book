# External Integrations

**Analysis Date:** 2026-03-10

## APIs & External Services

**Typography (Google Fonts API):**
- Google Fonts - Serves custom typography via CDN
  - Families: Alegreya Sans SC, BioRhyme, Annie Use Your Telescope, Cinzel Decorative
  - Import method: CSS `@import url()` from `fonts.googleapis.com`
  - No authentication required

**Discussion/Comments (Giscus):**
- Giscus - GitHub Discussions-based comment system
  - SDK source: `https://giscus.app/client.js`
  - Status: **NOT CONFIGURED** - Placeholder values in use
  - Location: `index.html` lines 401-412
  - Configuration needed: `data-repo`, `data-repo-id`, `data-category-id`
  - Current state: Script loads but will not function without valid GitHub repo configuration

## Data Storage

**Databases:**
- None detected - Application is entirely client-side

**File Storage:**
- Local filesystem only - No cloud storage integration
- Audio files served as static assets from repository:
  - `Eva_Angelina.mp3`
  - `Mojo_Pin.mp3`
  - `Rose_Parade.mp3`

**Client-Side Persistence:**
- Browser localStorage API only
- Data stored locally on user's browser:
  - Reading preferences (dark mode, mute state)
  - Navigation state (selected chapter, scroll position)
  - User-created highlights (JSON array in localStorage)
- No server-side database or synchronization

**Caching:**
- Browser native caching - No explicit caching service
- HTTP cache headers rely on hosting platform (GitHub Pages) defaults
- Audio files cached locally by browser after first play

## Authentication & Identity

**Auth Provider:**
- None for core application functionality
- Giscus (when configured) would use GitHub OAuth for comments, but currently not set up

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Client-side debug logging only
- Custom `logDebug()` function in `script.js` (lines 441-466)
  - Outputs to in-browser debug container with 30-second auto-clear
  - Maintains last 50 messages
  - No external logging service

**Debug Output:**
- DOM element `#debug-log` displays all console messages with timestamps
- Format: `[HH:MM:SS] [DEBUG|INFO|ERROR|WARNING|AUDIO|OBSERVER] [Message]`
- Visible in bottom-right corner of page

## CI/CD & Deployment

**Hosting:**
- GitHub Pages (jekyll-gh-pages.yml configured)
- Branch: main
- Automatic deployment on push to main branch

**CI Pipeline:**
- GitHub Actions workflow: `.github/workflows/jekyll-gh-pages.yml`
- Build process: Jekyll static site generation
- Deployment: Automatic to github-pages environment
- Build steps:
  1. Checkout code (actions/checkout@v4)
  2. Setup GitHub Pages (actions/configure-pages@v5)
  3. Build with Jekyll (actions/jekyll-build-pages@v1)
  4. Upload artifact (actions/upload-pages-artifact@v3)
  5. Deploy to GitHub Pages (actions/deploy-pages@v4)

**Permissions:**
- Read: contents
- Write: pages, id-token
- Concurrency: Single deployment at a time (no cancellation of in-progress deploys)

## Environment Configuration

**Required env vars:**
- None - Application requires no environment variables

**Local Development:**
- No configuration needed beyond a static HTTP server
- All assets are static files (HTML, CSS, JS, MP3)

**Secrets location:**
- None required - No secrets in codebase
- Giscus configuration (when implemented) would require GitHub repo configuration but no API keys

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- Giscus (when configured) would send data to GitHub Discussions API but currently not implemented

## External CDN & Resources

**Font Delivery:**
- Google Fonts CDN (googleapis.com)
- All 4 font families imported via CSS `@import` statements

**Analytics & Tracking:**
- None detected

## Browser APIs Used

**Required for functionality:**
- localStorage API - Required for preferences and highlights persistence
- Intersection Observer API - Required for section visibility detection and audio trigger
- HTML5 Audio API - Required for background music playback
- DOM APIs - Required for chapter navigation and highlighting

**Optional/Enhanced:**
- CSS transitions and animations (widely supported)
- `window.scrollTo()` for programmatic scrolling
- `document.createTreeWalker()` for DOM traversal during highlight restoration

---

*Integration audit: 2026-03-10*
