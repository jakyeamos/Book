# Codebase Concerns

**Analysis Date:** 2026-03-11

---

## Tech Debt

**Chapters 3–6 are empty stubs:**
- Issue: `chapters/ch03.html`, `ch04.html`, `ch05.html`, and `ch06.html` contain only a title element and no body content. Each is 7 lines. The manifest and config include full audio cue sequences and themes for these chapters, but there is nothing to read.
- Files: `chapters/ch03.html`, `chapters/ch04.html`, `chapters/ch05.html`, `chapters/ch06.html`
- Impact: Navigating to any of these chapters shows a blank chapter shell. Audio cues will fire against zero line anchors, so the `setupLineCueAudio` fallback path triggers and audio plays without context. All parallax and particle effects run against an empty container.
- Fix approach: Migrate chapter content from docx source files (`chapters/raw/`) using the same process applied to ch01, ch02, ch07–ch10, ch15.

**Canonical content for ch01 and ch02 is unresolved:**
- Issue: `chapters/DISCREPANCY.md` documents that ch01.html is 1,423 words longer than its docx source, and ch02.html omits 681 words present in the docx. The "Harley" character in ch02.html does not exist in the source docx. Author has not confirmed which version is canonical.
- Files: `chapters/ch01.html`, `chapters/ch02.html`, `chapters/raw/ch01-raw.html`, `chapters/raw/ch02-raw.html`, `chapters/DISCREPANCY.md`
- Impact: Publishing with unresolved canonical versions risks releasing draft content or losing authored content permanently.
- Fix approach: Author must resolve the two decisions in `chapters/DISCREPANCY.md` before ch01 and ch02 are considered final.

**All ambient audio files are missing:**
- Issue: `chapters/config.js` references 10+ ambient audio tracks (e.g., `assets/ambient/wind_loop.mp3`, `assets/ambient/rain_loop.mp3`, `assets/ambient/static_hum.mp3`) across all 11 chapters. No `assets/` directory exists in the project. These files have never been created or sourced.
- Files: `chapters/config.js` (lines 136–176 and throughout), `.planning/STATE.md`
- Impact: `crossfadeAmbientTo()` in `script.js` will receive a valid non-null path, attempt to set `ambient.src`, and call `ambient.play()`. The browser will silently fail with a 404. The ambient audio layer is completely non-functional for all chapters.
- Fix approach: Source or create all ambient audio files and place them at `assets/ambient/`. Alternatively, set `ambientTrack` to `null` for all chapters until assets are ready.

**All parallax image assets are missing:**
- Issue: `chapters/config.js` `LAYER_LIBRARY` references image files for chapters 1 and 2 (`assets/ch1/fog.png`, `assets/ch1/city-silhouette.png`, `assets/ch2/rain-backdrop.png`, `assets/ch2/library-shadow.png`). No `assets/` directory exists.
- Files: `chapters/config.js` (lines 87–93)
- Impact: The `layer.image` path is set as CSS `background-image: url('...')`. The browser loads a broken image URL silently. The `layer.fallback` gradient still renders, so the visual degrades gracefully — but the intended photographic parallax effect is absent for ch1 and ch2.
- Fix approach: Create or source the referenced PNG files and place them at the configured paths, or remove `image` entries and rely on fallback gradients.

**Giscus comments are unconfigured:**
- Issue: `SITE_CONFIG.giscus` in `chapters/config.js` (lines 734–743) has empty strings for `repo`, `repoId`, and `categoryId`. The `setupGiscus()` function in `script.js` (line 1026) detects this and shows the placeholder text instead.
- Files: `chapters/config.js` (lines 734–743), `script.js` (lines 1018–1050)
- Impact: The comments section is permanently disabled. Users see a "Giscus not configured" message on every chapter.
- Fix approach: Create a GitHub Discussions category on the repo, then populate the three fields in `SITE_CONFIG.giscus`.

**`localStorage` scroll position saved on every scroll event (no throttle):**
- Issue: `script.js` line 1209–1212 attaches a scroll listener that calls both `updatePageNumber()` and `saveScrollPosition()` on every scroll event. `saveScrollPosition()` calls `localStorage.setItem()` directly, which is a synchronous write operation. On a fast scroll, this fires dozens of times per second.
- Files: `script.js` (lines 1209–1213, 385–387)
- Impact: Main thread contention during scrolling; potentially contributes to scroll jitter. Noted in `.planning/research/PITFALLS.md` as a known concern.
- Fix approach: Wrap the `saveScrollPosition()` call inside a throttle (e.g., at most once per 500ms using a `setTimeout`-based flag or `requestAnimationFrame`).

**`package.json` module type mismatch:**
- Issue: `package.json` declares `"type": "commonjs"`, but `script.js` and `chapters/config.js` use ES module `import`/`export` syntax. The `tools/*.cjs` files are explicitly CommonJS. The `type: commonjs` declaration conflicts with the module scripts served in the browser (which are declared `type="module"` in `index.html`).
- Files: `package.json` (line 16), `index.html` (line 51), `script.js` (lines 1–9), `chapters/config.js`
- Impact: No runtime impact for the browser (browser ignores `package.json`), but running `node script.js` directly would fail. The `tools/` scripts correctly use `.cjs` extension to opt out. Low severity but creates confusion.
- Fix approach: Either remove the `"type"` field (defaults to commonjs, tools still work with `.cjs`), or set `"type": "module"` and ensure tools are explicitly `.cjs`.

**Jekyll CI workflow deployed for a static HTML project:**
- Issue: `.github/workflows/jekyll-gh-pages.yml` uses `actions/jekyll-build-pages@v1` to build and deploy the site. The project has no `_config.yml`, no Liquid templates, and no Jekyll-specific structure. Jekyll processes the site with default settings, which may transform or skip certain files.
- Files: `.github/workflows/jekyll-gh-pages.yml`
- Impact: Jekyll's default behavior excludes files starting with `_` or `.`, and may not correctly handle the `chapters/` directory structure. The build may succeed but the deployed site could differ from local behavior. The `node_modules/` exclusion is handled by `.gitignore` but the Jekyll build step adds unnecessary processing overhead.
- Fix approach: Replace with a plain static deployment workflow (`actions/upload-pages-artifact` directly without the Jekyll build step), or add a minimal `_config.yml` to explicitly control what Jekyll includes.

---

## Known Bugs

**Audio cue `endLine: null` is treated as `Infinity` but never exits:**
- Symptoms: The last cue in every chapter's `lineCues` array has `endLine: null`. `normalizeCue()` in `chapters/config.js` (line 774–775) converts this to `Infinity`. `resolveCueForLine()` in `script.js` (line 824) finds this cue for any line number past the last finite `endLine`. However, `calculateCueVolume()` (line 844) checks `Number.isFinite(cue.endLine)` before applying fade-out gain — so fade-out never triggers for the final cue. Audio for the last section never fades out at chapter end.
- Files: `chapters/config.js` (lines 774–775), `script.js` (lines 824, 844)
- Trigger: Scroll to the bottom of any chapter.
- Workaround: None currently.

**Highlight re-application does not survive chapter HTML re-injection:**
- Symptoms: `applyHighlightToChapter()` in `script.js` (line 916) uses `value.indexOf(text)` for exact string matching. If the chapter content changes between saves (editing ch01.html), stored highlights pointing to modified text will silently fail to re-apply on load. There is no feedback to the user that a highlight was lost.
- Files: `script.js` (lines 916–964, 966–976)
- Trigger: Edit a chapter file after a user has saved highlights from it.
- Workaround: Clear `localStorage.highlights` manually.

**Paragraph fade animation does not persist "revealed" state:**
- Symptoms: `setupParagraphAnimations()` in `script.js` (lines 529–586) adds the `visible` class when a paragraph enters the viewport but never stores which paragraphs have been revealed. On chapter re-navigation (`showChapter()` is called, `resetChapterEffects()` runs, HTML is re-injected), all paragraphs reset to `opacity: 0`. Scroll-back within a chapter is fine, but chapter re-entry always replays all animations.
- Files: `script.js` (lines 529–586, 343–352)
- Trigger: Navigate away from a chapter and return to it.
- Workaround: None currently. Noted as a concern in `.planning/research/PITFALLS.md`.

---

## Security Considerations

**Raw chapter HTML is injected via `innerHTML` without sanitization:**
- Risk: `showChapter()` in `script.js` (line 1091) sets `elements.chapterContainer.innerHTML = markup` directly with the raw text fetched from chapter HTML files. If any chapter file contains a `<script>` tag or event handler attributes, they will execute in the reader's browser.
- Files: `script.js` (line 1091), `chapters/ch*.html`
- Current mitigation: Chapter files are hand-authored and committed to the repository. No external content is fetched. The fetch origin is same-origin (GitHub Pages).
- Recommendations: The risk is low given same-origin sourcing, but using `DOMParser` and appending cloned nodes — or using `document.createRange().createContextualFragment()` — would eliminate the vector entirely if chapter files are ever generated by tooling or accepted from external sources.

**Highlight text stored in `localStorage` without XSS sanitization:**
- Risk: `state.highlights` is loaded from `localStorage` (line 332) and text strings are later inserted into the DOM via `mark.textContent = match` (line 955), which is safe. However, the highlight `text` key is also used as a plain string search via `value.indexOf(text)` — not as DOM content — so direct injection is not possible via this path.
- Files: `script.js` (lines 332, 997–1013, 916–964)
- Current mitigation: Text is set via `textContent`, not `innerHTML`. Actual XSS risk is low.
- Recommendations: No immediate action required.

**CDN scripts loaded without Subresource Integrity (SRI):**
- Risk: `index.html` loads GSAP and tsParticles from `cdnjs.cloudflare.com` (lines 48–50) with no `integrity` attribute. If the CDN is compromised or the URL is hijacked, malicious JavaScript would execute in the reader's browser with full page access.
- Files: `index.html` (lines 48–50)
- Current mitigation: Cloudflare CDN has high availability and attack surface monitoring. Risk is low but non-zero.
- Recommendations: Add `integrity="sha384-..."` hashes to all CDN `<script>` tags. Generate hashes via `openssl dgst -sha384 -binary <file> | openssl base64 -A`. This is standard practice for any CDN dependency.

---

## Performance Bottlenecks

**Four separate Google Fonts `@import` calls block render:**
- Problem: `styles.css` lines 1–4 make four separate `@import url(...)` calls to Google Fonts. Each is a separate HTTP request that must resolve before the CSS file is considered loaded, blocking paint of all styled text.
- Files: `styles.css` (lines 1–4)
- Cause: Four font families (`Alegreya Sans SC`, `BioRhyme`, `Annie Use Your Telescope`, `Cinzel Decorative`) are imported individually rather than combined into one URL.
- Improvement path: Combine into a single `@import` with multiple `family=` parameters, or move to `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html` `<head>` for better browser pipelining. Noted in `.planning/research/PITFALLS.md`.

**`will-change: transform` applied globally to all `.parallax-layer` elements:**
- Problem: `styles.css` line 142 applies `will-change: transform` to `.parallax-layer` unconditionally. Each chapter creates 1–2 parallax layers. Combined with the fixed navbar (implicitly composited) and the particles canvas (`position: fixed`), this creates 4–5+ compositing layers per chapter load.
- Files: `styles.css` (line 142)
- Cause: `will-change` applied statically in CSS rather than dynamically just before animation starts.
- Improvement path: Remove from CSS; apply via JavaScript immediately before a layer begins animating and remove it afterward via `element.style.willChange = 'auto'`. Noted as Pitfall 5 in `.planning/research/PITFALLS.md`.

**tsParticles particle count not dynamically reduced on mobile:**
- Problem: `ParticleController.updateForChapter()` in `script.js` (line 239) caps mobile count at `Math.min(count, 50)`. However, it does not detect device capability beyond the broad `isMobile` user-agent check. A first-generation iPad detected as mobile gets the same 50-particle cap as a budget Android phone with much less GPU headroom.
- Files: `script.js` (lines 239–251)
- Cause: `isMobile` is a UA string regex check; no hardware concurrency or frame-time feedback is used.
- Improvement path: Use `navigator.hardwareConcurrency <= 4` as a secondary cap, or implement a frame-time feedback mechanism that reduces particle count if FPS drops below 30. Noted as Pitfall 2 in `.planning/research/PITFALLS.md`.

---

## Fragile Areas

**`syncToViewportLine` audio sync fires async inside a RAF callback:**
- Files: `script.js` (lines 868–913)
- Why fragile: `syncToViewportLine` is an `async` function called with `void` inside a `requestAnimationFrame` callback (line 900). If a crossfade takes longer than one RAF cycle (it does — crossfades are 1–1.5 seconds), subsequent scroll events queue another RAF before the first `await` chain resolves. The `destroyed` flag (line 869) prevents the second call from doing work, but there is a race condition: if `destroyed` becomes `true` mid-crossfade (user navigates away), the `await audioController.crossfadeTo()` call at line 883 is already in flight and will continue to completion even after the chapter has been torn down.
- Safe modification: Always check `destroyed` after every `await` inside `syncToViewportLine`, not just at entry.
- Test coverage: No tests exist for the audio system.

**Chapter cache is never invalidated:**
- Files: `script.js` (lines 406–421)
- Why fragile: `state.chapterCache` (a `Map`) stores fetched HTML keyed by `chapterId` for the session lifetime. There is no cache invalidation. If a chapter file is updated on the server mid-session (e.g., a fix is deployed), users continue to see the cached version until they hard-reload.
- Safe modification: This is acceptable behavior for a reading site. If hot-reload during development is needed, add a `?v=timestamp` query param to chapter fetch URLs in dev mode only.
- Test coverage: None.

**`highlightSelectedText` silently fails for cross-element selections:**
- Files: `script.js` (lines 978–1016)
- Why fragile: `range.surroundContents(mark)` at line 999 throws a `HierarchyRequestError` if the selection spans element boundaries (e.g., selecting text that crosses a `<p>` boundary). The `catch` block (line 1005) falls back to saving the text string and re-applying via `loadAndApplyHighlights()`, which uses `applyHighlightToChapter()` — but that function only marks the first occurrence of the text via `break` at line 963, and only if an exact string match exists. Selections spanning inline elements (e.g., `<em>`, `<strong>`) will fail the first approach and may also fail the fallback.
- Safe modification: Treat highlights as best-effort. Add a brief visible feedback (e.g., the Highlight button text changes to "Saved" for 1 second) so users know when it works.
- Test coverage: None.

**`ParticleController` mutates shared preset objects:**
- Files: `script.js` (lines 243–251), `chapters/config.js` (lines 818–825)
- Why fragile: `getParticlePreset()` in `chapters/config.js` returns a deep clone via `JSON.parse(JSON.stringify(preset))` (line 824) — this is correct. However, `ParticleController.updateForChapter()` then mutates the returned clone's `particles.number` property (line 251). If `getParticlePreset` were ever changed to return a reference instead of a clone, particle counts would accumulate across chapter navigations. The safety depends on a non-obvious implementation detail in a separate file.
- Safe modification: Add a comment to `getParticlePreset` explicitly stating it must return a deep clone.
- Test coverage: None.

---

## Scaling Limits

**`chapters/config.js` grows linearly with chapter count:**
- Current capacity: 11 chapters, 834 lines.
- Limit: No hard limit, but at 30+ chapters the file exceeds 2,000 lines and becomes difficult to navigate. Audio cue objects average ~20 lines each; 3 cues per chapter adds 60 lines per chapter.
- Scaling path: Split into per-chapter config modules (`chapters/config/chapter1.js`, etc.) imported by a barrel `chapters/config.js`. No behavioral change required, only file organization.

**`state.chapterCache` grows unbounded in long sessions:**
- Current capacity: 11 chapters, each chapter HTML ~10–30KB. Total cache ~300KB maximum.
- Limit: Not a real concern at current scale. If chapters grew to hundreds of files or were very large, the Map could become significant.
- Scaling path: Implement an LRU cache with a cap of 5–10 chapters if content volume grows substantially.

---

## Dependencies at Risk

**GSAP and tsParticles loaded from CDN without pinned file hashes:**
- Risk: CDN URLs `cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js` and `tsparticles-slim/2.12.0` are version-pinned by URL but not hash-pinned. A CDN compromise or URL reuse attack would serve modified code.
- Files: `index.html` (lines 48–50)
- Impact: Full script execution in reader's browser context.
- Migration plan: Add SRI `integrity` attributes (see Security section above).

**`mammoth` npm dependency used only by `tools/convert-chapters.cjs`:**
- Risk: `mammoth` is a runtime dependency in `package.json` (not devDependency). It is only used by the local conversion tool, not by the deployed site. Including it as a regular dependency signals it should be in production bundles, which is misleading and increases package size for contributors.
- Files: `package.json` (line 21), `tools/convert-chapters.cjs`
- Impact: No production impact (browser does not use npm packages). Developer confusion only.
- Migration plan: Move `mammoth` to `devDependencies`.

---

## Missing Critical Features

**No "quiet mode" / effects toggle:**
- Problem: Users who want to read without audio and particles (mobile data, public spaces, accessibility needs) have a Mute button for audio but no way to stop particle animations. Dark mode toggle exists but does not affect effects.
- Blocks: Accessible reading experience for users with motion sensitivity; WCAG 2.3.3 AAA conformance.

**No mobile "tap to enable audio" prompt:**
- Problem: On iOS Safari and first-visit Android Chrome, `audio.play()` is blocked until a direct user gesture. The `AudioController` silently catches the `NotAllowedError` and logs it in dev mode only. Users on mobile receive no indication that audio exists or how to enable it.
- Blocks: Audio experience for any mobile reader on first visit.
- Files: `script.js` (lines 101–106, 192–196)

**No error state UI for failed chapter loads:**
- Problem: `showChapter()` in `script.js` (line 1112–1114) injects a plain `<p>` error message into the chapter container when a fetch fails. There is no styled error state, no retry button, and no navigation to another chapter.
- Blocks: User recovery from transient network errors.

---

## Test Coverage Gaps

**No tests exist:**
- What's not tested: The entire JavaScript codebase — `AudioController`, `ParticleController`, all chapter setup functions, highlight logic, audio cue resolution, manifest loading, and navigation.
- Files: `script.js` (1,222 lines), `chapters/config.js` (834 lines)
- Risk: Any change to audio crossfade logic, cue resolution, or highlight application can silently break without detection. The `package.json` test script exits with error by default (`echo "Error: no test specified" && exit 1`).
- Priority: High for `chapters/config.js` functions (`normalizeCue`, `getAudioCues`, `resolveCueForLine`, `calculateCueVolume`) which contain branching logic. Lower priority for DOM manipulation functions which require a browser environment.

**`tools/validate-chapters.cjs` only validates structure, not content:**
- What's not tested: Chapter stub detection (ch03–ch06 pass validation despite having no body content), audio cue line range plausibility, presence of required CSS classes in content, link and image path validity.
- Files: `tools/validate-chapters.cjs`
- Risk: Stub chapters pass CI with no warning.
- Priority: Medium — add a minimum word count check to flag nearly-empty chapters.

---

*Concerns audit: 2026-03-11*
