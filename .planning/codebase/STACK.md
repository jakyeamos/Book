# Technology Stack

**Analysis Date:** 2026-03-10

## Languages

**Primary:**
- HTML5 - Markup for interactive digital book structure
- CSS3 - Styling, responsive design, dark mode support, typography
- JavaScript (Vanilla) - Client-side interactivity, audio playback, state management

**Secondary:**
- None - No backend language detected

## Runtime

**Environment:**
- Browser-based (No server-side runtime required)
- Tested on modern browsers with HTML5 audio and localStorage support

**Package Manager:**
- None - No package manager configuration detected (no npm, pip, cargo, etc.)

## Frameworks

**Core:**
- Vanilla JavaScript - No framework dependencies; all features implemented with native DOM APIs

**Frontend Features:**
- Intersection Observer API - For detecting section visibility and triggering audio playback
- Web Audio API - HTML5 audio element for background music playback
- localStorage API - For persistent user preferences (dark mode, reading position, highlights)

**Build/Dev:**
- Jekyll (optional, via GitHub Pages) - Used for static site generation in deployment pipeline
- GitHub Pages - Hosting platform with Jekyll integration

## Key Dependencies

**External Resources:**
- Google Fonts API - Typography via CDN import for multiple font families
  - `Alegreya Sans SC`
  - `BioRhyme`
  - `Annie Use Your Telescope`
  - `Cinzel Decorative`

**Audio Files (Local):**
- `Eva_Angelina.mp3` - Background music for section1
- `Mojo_Pin.mp3` - Background music for section2
- `Rose_Parade.mp3` - Background music for section3

## Configuration

**Environment:**
- No environment variables required
- No secrets or API keys needed for core functionality
- Settings stored in browser localStorage (client-side only)

**Build:**
- No build configuration files detected (webpack, vite, tsconfig, etc.)
- GitHub Pages deployment handled by Jekyll workflow

## Platform Requirements

**Development:**
- Any text editor or IDE
- Web browser with ES6 support and HTML5 APIs (localStorage, Intersection Observer)
- Optional: Git for version control

**Production:**
- Static web hosting (currently GitHub Pages)
- No backend server required
- CDN support for font delivery (Google Fonts)
- Support for audio file delivery (MP3 format)

## Storage & Persistence

**Client-Side:**
- Browser localStorage for user preferences:
  - `darkMode` - Dark/light mode toggle state
  - `audioMuted` - Audio mute state
  - `selectedChapter` - Currently selected chapter ID
  - `scrollPosition` - Scroll position within chapter
  - `highlights` - User-created text highlights (stored as JSON array)

## Performance Characteristics

**Assets:**
- 3 MP3 audio files (range: 3.3MB to 5.5MB each)
- Single CSS file with responsive design
- Single vanilla JavaScript file (466 lines)
- Single HTML file with embedded content (no separation of concerns file structure)

**Optimization Observations:**
- Audio files preloaded with `preload="auto"`
- Debug logging persists for 30 seconds before auto-clearing
- Highlights re-applied on window resize events

---

*Stack analysis: 2026-03-10*
