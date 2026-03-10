# Testing Patterns

**Analysis Date:** 2026-03-10

## Test Framework

**Status:** Not detected - No automated testing framework

**Framework Information:**
- No test runner found (Jest, Vitest, Mocha, Jasmine absent)
- No test configuration files (jest.config.js, vitest.config.ts, mocha.opts absent)
- No test scripts in package.json (file not present)
- No assertion library (Chai, Sinon, Testing Library not installed)

**Manual Testing Approach:**
- Testing performed via browser inspection and debug log output
- Debug UI (`#debug-log`) serves as manual verification tool
- Browser console (console.warn fallback) used for logging

**Current Debug Output:**
```bash
# There are no automated run commands - testing is manual
# Manual verification done through:
# 1. Browser debug log panel (bottom right, 300px wide)
# 2. Browser console (F12)
# 3. Visual inspection of page state
```

## Test File Organization

**Location:**
- No test files present
- No test directory (`__tests__/`, `tests/`, `spec/`)
- Code and tests co-located in single `script.js` (467 lines total)

**Potential Test Structure** (if tests were added):
- Tests would likely be added to separate `*.test.js` or `*.spec.js` files
- Recommended location: `tests/` directory at root level
- Test fixtures: `tests/fixtures/` for mock data (chapters, highlights, etc.)

## Test Structure

**Current Approach:** No formal test structure

**Custom Debug Infrastructure** (lines 441-466 in `script.js`):
```javascript
function logDebug(message) {
    let debugElement = document.getElementById("debug-log");
    if (!debugElement) {
        console.warn("[WARNING] Debugging UI not found.");
        return;
    }

    let timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    let logEntry = document.createElement("div");
    logEntry.textContent = `[${timestamp}] ${message}`;
    debugElement.appendChild(logEntry);

    // Auto-clear logs after 30 seconds
    setTimeout(() => {
        if (logEntry.parentNode) {
            logEntry.parentNode.removeChild(logEntry);
        }
    }, 30000);

    // Ensure only the last 50 messages are kept
    if (debugElement.children.length > 50) {
        debugElement.removeChild(debugElement.children[0]);
    }

    debugElement.scrollTop = debugElement.scrollHeight;
}
```

**Log Message Format:**
```
[HH:MM:SS] [LEVEL] Message content
[14:02:35] [DEBUG] DOM fully loaded. Initializing scripts...
[14:02:36] [AUDIO] New song detected. Attempting to play: Eva_Angelina.mp3 for section: section1.
[14:02:37] [ERROR] Chapter ID chapter5 not found.
```

## Mocking

**Framework:** Not applicable - no testing framework

**Manual Verification Methods:**

**localStorage Mocking:**
- Tests can clear localStorage before manual verification:
```javascript
localStorage.clear();
localStorage.setItem("selectedChapter", "chapter1");
localStorage.setItem("darkMode", "enabled");
```

**DOM Element Mocking:**
- Manual HTML DOM state can be inspected via browser DevTools
- Chapter visibility toggled by examining `style.display` property
- Audio element state inspected via audio.src, audio.muted properties

**Audio Playback Mocking (Manual):**
- Mute toggle tested via browser mute button or code: `audio.muted = true`
- Song switching verified through debug logs: `[AUDIO] New song detected...`
- Promise resolution tested via browser console: `audio.play().then(() => console.log('Playing'))`

## Fixtures and Factories

**Test Data:**
- No fixture files present
- HTML structure serves as fixture (chapters, sections, buttons in `index.html`)

**Expected Test Data Structure** (if tests were implemented):
```javascript
// Recommended fixture structure for highlights feature:
const mockHighlights = [
    {
        chapterId: "chapter1",
        text: "A cold sweat clings"
    },
    {
        chapterId: "chapter2",
        text: "The alarm goes off, 5:30 am"
    }
];

// Mock chapter structure:
const mockChapter = {
    id: "chapter1",
    title: "THE RITUAL.",
    display: "block"
};

// Mock section mapping:
const mockSectionToSongMap = {
    section1: "Eva_Angelina.mp3",
    section2: "Mojo_Pin.mp3",
    section3: "Rose_Parade.mp3"
};
```

**Location for Future Tests:**
- Fixtures: `tests/fixtures/highlights.json`
- Fixtures: `tests/fixtures/chapters.json`
- Factory functions: `tests/factories/chapterFactory.js`

## Coverage

**Current Status:** Not measured - no coverage tool

**Requirements:** None enforced

**Uncovered Areas:**
- Chapter navigation logic (47 lines untested, lines 119-135)
- Highlight text selection (58 lines untested, lines 142-198)
- Highlight persistence and reload (73 lines untested, lines 201-273)
- Audio playback control (33 lines untested, lines 284-317)
- Intersection observer logic (17 lines untested, lines 323-340)
- Page numbering calculations (22 lines untested, lines 391-412)
- Dark mode toggle (8 lines untested, lines 74-79)
- Mute toggle (8 lines untested, lines 82-88)
- Window resize handling (8 lines untested, lines 427-435)

**High-Risk Uncovered Code:**
- `loadAndApplyHighlights()` (lines 201-273) - Complex DOM tree walking, high risk for regression
- `highlightSelectedText()` (lines 142-198) - Text selection and DOM manipulation, browser-dependent
- `playSongForSection()` (lines 284-317) - Audio promise handling, timing-dependent

## Test Types

**Unit Tests (Not Present):**

**Recommended Approach:**
- Test individual functions in isolation
- Mock localStorage, DOM, audio element

**Example unit test structure** (using Jest):
```javascript
describe('escapeRegExp', () => {
    it('should escape special regex characters', () => {
        const result = escapeRegExp('[test]');
        expect(result).toBe('\\[test\\]');
    });
});

describe('highlightSelectedText', () => {
    it('should not highlight outside of chapter', () => {
        // Mock selection outside chapter boundary
        // Verify no mark element created
        // Verify error logged
    });
});
```

**Integration Tests (Not Present):**

**Recommended Scope:**
- Test chapter navigation end-to-end
- Verify highlight persistence across page reload
- Verify dark mode state persists in localStorage
- Verify audio playback with intersection observer

**Example integration test structure:**
```javascript
describe('Highlight Feature', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = fixture;
    });

    it('should highlight text and persist to localStorage', () => {
        // Select text in chapter
        // Call highlightSelectedText()
        // Verify mark element created
        // Verify localStorage contains highlight
        // Verify highlight reapplied after reload
    });
});
```

**E2E Tests (Not Present):**

**Status:** Not applicable - no E2E framework

**Recommended Framework:** Cypress or Playwright for browser automation

**Example scenarios to test:**
- User selects chapter from dropdown, chapter displays correctly
- User highlights text, scrolls away, returns to chapter, highlight persists
- User toggles dark mode, refreshes page, dark mode remains enabled
- User scrolls through sections, audio switches appropriately

## Common Patterns

**Manual Async Testing:**
```javascript
// Current pattern in playSongForSection() (lines 299-311):
let playPromise = audio.play();

if (playPromise !== undefined) {
    playPromise.then(() => {
        logDebug(`[AUDIO] Playback STARTED successfully for: ${audio.src}`);
        currentSong = songFile;
    }).catch(error => {
        logDebug(`[AUDIO] Playback FAILED for: ${audio.src}. Error: ${error.name} - ${error.message}`);
    });
}
```

**Manual Promise Testing** (if Jest were used):
```javascript
test('audio playback resolves on success', async () => {
    const mockAudio = { play: jest.fn().mockResolvedValue(undefined) };
    // Would require extracting audio logic into testable function
    await mockAudio.play();
    expect(mockAudio.play).toHaveBeenCalled();
});
```

**Error Testing** (Manual via Debug Logs):

**Current Approach:**
- Trigger error conditions manually
- Read debug logs to verify error handling

**Example: Chapter not found error** (line 358):
```javascript
// In browser console:
showChapter("nonexistent-chapter", true);
// Check debug log for: [ERROR] Chapter ID nonexistent-chapter not found.
```

**Example: Selection validation error** (lines 144-149):
```javascript
// In browser console, without selecting text:
highlightSelectedText();
// Check debug log for: [INFO] No text selected or selection is collapsed.
```

**Example: Highlight application error** (lines 266-268):
```javascript
// Manually add invalid highlight to localStorage:
localStorage.setItem("highlights", JSON.stringify([
    { chapterId: "nonexistent", text: "test" }
]));
// Reload page, check debug log for warning about missing chapter
```

## Debugging Tools

**Built-in Debug UI:**
- Location: Bottom-right corner of page (`#debug-log`, styles.css lines 327-351)
- Auto-scrolls to latest log entry
- Auto-clears entries after 30 seconds
- Keeps circular buffer of last 50 messages
- Monospace font for readability

**Browser DevTools:**
- Console (F12) shows localStorage operations
- Network tab shows audio file loading
- Elements inspector shows DOM mutations during highlight
- Application tab shows localStorage state

**Log Levels Used:**
- `[DEBUG]` - Initialization, state calculations
- `[INFO]` - User interactions
- `[WARNING]` - Expected edge cases
- `[ERROR]` - Failures and exceptions
- `[AUDIO]` - Playback events
- `[OBSERVER]` - Intersection detection

## Testing Recommendations

**Immediate Priority (High Value):**

1. **Add Jest or Vitest** - Set up automated testing framework
   - Config: `vitest.config.js` at root
   - Tests: `tests/` directory
   - Command: `npm run test`

2. **Test Core Features**:
   - Chapter navigation and display
   - Highlight text selection and persistence
   - Audio playback triggering
   - Dark mode persistence

3. **Add DOM Testing Library**:
   - Use `@testing-library/dom` for DOM interaction tests
   - Replaces manual browser testing for unit/integration tests

**Medium Priority:**

4. **Add E2E Tests** - Cypress or Playwright for user workflows
5. **Add Code Coverage** - nyc/c8 to identify untested code
6. **Add Linting** - ESLint for code quality

**Test File Structure** (Recommended):
```
project-root/
├── tests/
│   ├── unit/
│   │   ├── highlight.test.js
│   │   ├── navigation.test.js
│   │   ├── audio.test.js
│   │   └── persistence.test.js
│   ├── integration/
│   │   ├── chapter-flow.test.js
│   │   ├── highlight-workflow.test.js
│   │   └── dark-mode.test.js
│   ├── fixtures/
│   │   ├── chapters.json
│   │   └── highlights.json
│   └── setup.js
├── vitest.config.js
└── package.json
```

---

*Testing analysis: 2026-03-10*
