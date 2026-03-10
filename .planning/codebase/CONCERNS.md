# Codebase Concerns

**Analysis Date:** 2026-03-10

## Tech Debt

**Hardcoded Section-to-Audio Mapping:**
- Issue: Audio files are hardcoded to specific section IDs (`section1`, `section2`, `section3`) in `script.js` lines 276-280
- Files: `script.js` (lines 276-280, 337-340)
- Impact: Adding new sections requires modifying JavaScript. No content-driven approach exists. Only 3 sections can have audio; any additional sections are silently ignored.
- Fix approach: Refactor to read section metadata from HTML data attributes or a configuration object. Allow dynamic mapping without code changes.

**Incomplete Giscus Integration:**
- Issue: Comment system placeholder values never replaced with actual configuration
- Files: `index.html` (lines 399-412)
- Impact: Discussion section is non-functional. Placeholder text `[REPLACE_WITH_YOUR_USERNAME]`, `[REPLACE_WITH_YOUR_REPO_NAME]`, etc. remain in production HTML
- Fix approach: Either complete Giscus setup with real GitHub credentials, or remove the non-functional comments section entirely

**DOM Selection Without Null Checks:**
- Issue: Multiple `document.getElementById()` calls assume elements exist without defensive checks in some cases
- Files: `script.js` (lines 4-12, 408)
- Impact: If HTML structure changes and elements are renamed/removed, the app will crash silently or behave unexpectedly. Line 408 checks for `pageNumberElement` but lines 4-12 assume all elements exist.
- Fix approach: Add consistent null-checking on all DOM queries, or validate elements exist at initialization before using them

## Performance Bottlenecks

**Large Uncompressed Audio Files:**
- Problem: Three MP3 files total ~12.4 MB (Eva_Angelina: 3.9M, Mojo_Pin: 5.3M, Rose_Parade: 3.2M) loaded with `preload="auto"`
- Files: `index.html` (line 23), root directory audio files
- Cause: Audio is preloaded on page load. Multiple audio formats not provided (no .webm, .ogg fallbacks). No lazy loading.
- Improvement path: Implement lazy loading - only load audio when section becomes visible. Consider audio compression or provide lower bitrate versions. Use WebAudio API or streaming approach.

**Inefficient Highlight Reapplication on Resize:**
- Problem: `handleResize()` calls `loadAndApplyHighlights()` on every window resize event
- Files: `script.js` (lines 428-435)
- Cause: No debouncing. Resize events fire dozens of times per second during window drag. DOM manipulation happens on every event.
- Improvement path: Debounce the resize handler (e.g., 250ms delay). Only reapply highlights if actual content height changed, not every resize.

**Excessive Debug Logging Without Control:**
- Problem: `logDebug()` appends DOM nodes on every call. 50-message cap enforced but still creates unnecessary DOM operations
- Files: `script.js` (lines 441-466)
- Cause: Every function call logs extensively. No log level control (no way to disable DEBUG logs in production). Auto-scroll on every log entry.
- Improvement path: Implement log level filtering (e.g., only show WARN/ERROR in production). Use `console` for development, reserve DOM logs for errors only.

**Chapter Page Offset Calculation Inaccuracy:**
- Problem: `computeChapterPageOffsets()` uses `scrollHeight` to estimate pages, recalculates on resize without validation
- Files: `script.js` (lines 23-33)
- Cause: `scrollHeight` doesn't account for actual viewport visible content. Page count can jump unexpectedly on window resize.
- Improvement path: Use intersection observer or measure actual rendered text lines. Cache calculations only when layout actually changes (not resize alone).

## Known Bugs

**Audio Playback State Not Synced with DOM:**
- Symptoms: User can toggle mute button, but if audio.play() fails (browser autoplay restrictions), the button state doesn't reflect actual audio state
- Files: `script.js` (lines 299-311, 82-91)
- Trigger: Open on some browsers with strict autoplay policies. Toggle mute. Audio may still be blocked but button shows "unmuted".
- Workaround: Manually check browser console for AUDIO errors. Button text is out of sync with actual playback.

**Highlight Persistence Bug with Dynamic Content:**
- Symptoms: Highlights saved in one chapter don't reapply correctly when switching chapters and returning
- Files: `script.js` (lines 201-273)
- Trigger: Highlight text in Chapter 1, switch to Chapter 2, return to Chapter 1. Some highlights may not reappear.
- Root cause: Highlights are only reapplied to visible (display: block) chapters. If chapter was hidden, DOM nodes may have changed.

**Range Surroundings Failure Not Gracefully Handled:**
- Symptoms: Complex text selections fail to highlight with silent error in console
- Files: `script.js` (lines 179-198)
- Trigger: Try to highlight text that spans multiple block elements or includes partial HTML nodes
- Workaround: Users must select text within single paragraphs only. No user-facing feedback provided.

**Navigation Button Hidden State Not Synced with Initial State:**
- Symptoms: If page reloads on last chapter, "Next" button should be hidden but might not be on first load
- Files: `script.js` (lines 369-373)
- Trigger: Direct navigation to URL with last chapter in localStorage, refresh page
- Root cause: Buttons initialized as visible, then hidden on load. Brief flicker possible.

## Security Considerations

**XSS Risk in Highlight Storage:**
- Risk: User-selected text is stored in localStorage and reapplied via innerHTML operations
- Files: `script.js` (lines 184-186, 253)
- Current mitigation: Text is wrapped in `<mark>` tags via `textContent`, not `innerHTML`. Text nodes are created safely.
- Recommendations: Continue using `textContent` for text insertion. This is currently safe but fragile. Add Content Security Policy header.

**localStorage Data Exposure:**
- Risk: All user data (highlights, mute state, dark mode, selected chapter) stored in plain localStorage. No encryption.
- Files: `script.js` (lines 39, 40, 48-49, 58-77, 85, 114, 184-186)
- Current mitigation: None. Data is client-side only, not transmitted.
- Recommendations: Document that localStorage is unencrypted. If deployed to shared/public devices, this is a privacy concern. Consider IndexedDB with encryption for sensitive highlight data.

**Giscus Comments Misconfiguration:**
- Risk: Comment system disabled due to placeholder values, preventing data exposure, but also suggesting incomplete security review
- Files: `index.html` (lines 399-412)
- Current mitigation: Comments are non-functional, so no data flows to external service
- Recommendations: If enabled, ensure GitHub repo is private or intended for public discussion. Review Giscus permissions.

## Fragile Areas

**Audio System Tightly Coupled to Section Elements:**
- Files: `script.js` (lines 275-340)
- Why fragile: Audio mapping hardcoded to specific section IDs. IntersectionObserver depends on exact element IDs existing. If section naming changes, audio stops working silently.
- Safe modification: Never rename `section1`, `section2`, `section3` without updating `sectionToSongMap`. Add validation that observer found all expected sections.
- Test coverage: No tests for audio trigger behavior. No way to verify observer is working correctly.

**Chapter Visibility Toggle Uses Display Property:**
- Files: `script.js` (lines 343-363)
- Why fragile: Entire visibility system relies on `display: block/none`. CSS changes could break routing. No class-based visibility system.
- Safe modification: Use classes like `.active` and `.hidden` instead of inline styles. Keep hidden chapter DOM intact.
- Test coverage: No automated tests. Manual testing only via UI buttons.

**Highlight DOM Manipulation in Complex Loop:**
- Files: `script.js` (lines 209-272)
- Why fragile: TreeWalker approach is fragile to DOM changes. Splitting text nodes and inserting new nodes in a loop is error-prone.
- Safe modification: Add guards for nested mark elements (already done). Test with edge cases: special characters, punctuation, line breaks.
- Test coverage: Only basic unhighlighted text tested. Behavior undefined for: HTML entities, emojis, RTL text.

**Scroll Position Restoration Race Condition:**
- Files: `script.js` (lines 38-55)
- Why fragile: 100ms timeout hardcoded. If content loads slower, scroll won't restore properly.
- Safe modification: Use MutationObserver or IntersectionObserver to trigger scroll when content is actually visible, not arbitrary timeout.

## Scaling Limits

**Audio Preload for All Sections:**
- Current capacity: 3 audio files, ~12.4 MB total. Works for current site.
- Limit: If book grows to 20+ chapters with audio, loading becomes slow. Bandwidth cost increases.
- Scaling path: Implement lazy-loading for audio. Only load current + next chapter audio. Unload previous when not visible.

**Highlight Storage Unbounded:**
- Current capacity: localStorage typically 5-10 MB limit depending on browser
- Limit: If user highlights entire book (100,000+ words), localStorage quota could be exceeded
- Scaling path: Implement cleanup (oldest highlights deleted first). Add pagination/filtering UI. Consider IndexedDB for larger storage.

**Page Numbering Calculation Inaccurate at Scale:**
- Current capacity: Works well for 2 chapters, ~10k words
- Limit: With 50+ chapters, cumulative offset errors compound. Page numbers become increasingly inaccurate.
- Scaling path: Use line/word counting instead of scrollHeight estimates. Implement server-side page calculation if needed.

## Test Coverage Gaps

**No Automated Tests Exist:**
- What's not tested: Audio system, highlight persistence, chapter navigation, dark mode toggle, scroll restoration, page numbering
- Files: No test files found. Only manual testing possible.
- Risk: Any refactoring could break silent areas. Dark mode toggle might not persist on reload. Audio might not trigger in CI environment.
- Priority: High - Adding unit tests for core features (chapter nav, highlights, audio trigger) would prevent regressions.

**Audio Playback Not Testable:**
- What's not tested: Browser autoplay restrictions, audio.play() promise rejection, network errors during preload
- Files: `script.js` (lines 299-311)
- Risk: Silent failures in production if audio fails to load. No error recovery mechanism.
- Priority: Medium - Add error handler that notifies user if audio can't play.

**Accessibility Not Validated:**
- What's not tested: Keyboard navigation, screen reader support, color contrast in dark mode
- Files: All files
- Risk: Chapter selection dropdown works, but prev/next buttons may not be keyboard accessible. No ARIA labels on custom controls.
- Priority: Medium - Add keyboard handlers and ARIA attributes.

**Cross-Browser Compatibility Not Verified:**
- What's not tested: Safari audio preload behavior, Firefox dark mode rendering, IE fallbacks
- Files: All files
- Risk: Audio might not preload in Safari. CSS custom properties might not work in older browsers.
- Priority: Medium - Test on Safari, Firefox, Edge. Provide polyfills if needed.

## Missing Critical Features

**Error Recovery:**
- Problem: If audio fails to load, no retry mechanism or user notification
- Blocks: Users don't know why audio stopped working
- Recommendation: Add try-catch around audio.load() with user-facing error message

**Undo for Highlights:**
- Problem: Once highlighted, users can't easily remove individual highlights
- Blocks: Users can't correct accidental highlights without clearing all highlights for chapter
- Recommendation: Add context menu on highlighted text with "Remove highlight" option

**Search/Navigation by Content:**
- Problem: Can only navigate by chapter dropdown, not by searching text
- Blocks: Large books are hard to navigate to specific sections
- Recommendation: Add search functionality that jumps to matching text

**Keyboard Shortcuts:**
- Problem: No keyboard shortcuts for navigation (e.g., arrow keys, Page Up/Down)
- Blocks: Accessibility limited. Slow navigation on mobile/touch devices.
- Recommendation: Implement arrow key navigation between chapters.

---

*Concerns audit: 2026-03-10*
