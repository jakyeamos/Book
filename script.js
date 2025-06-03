document.addEventListener("DOMContentLoaded", function () {
    logDebug("[DEBUG] DOM fully loaded. Initializing scripts...");

    let firstInteractionDone = false;
    logDebug(`[AUTOPLAY] Initial firstInteractionDone: ${firstInteractionDone}`);

    const audio = document.getElementById("background-audio");
    const darkModeButton = document.getElementById("dark-mode-toggle");
    const chapterSelector = document.getElementById("chapter-selector");
    const pageNumber = document.getElementById("page-number");
    const chapterFooter = document.getElementById("chapter-footer");
    const muteToggleButton = document.getElementById("mute-toggle");
    const highlightTextButton = document.getElementById("highlight-text-button");
    const prevChapterButton = document.getElementById("prev-chapter");
    const nextChapterButton = document.getElementById("next-chapter");

    const chapters = Array.from(document.querySelectorAll(".chapter"));
    let chapterPageOffsets = {};

    if (chapters.length === 0) {
        logDebug("[ERROR] No chapters found in the document.");
        return;
    }

    // 📌 Precompute total pages for all chapters
    function computeChapterPageOffsets() {
        let cumulativePages = 0;

        chapters.forEach((chapter, index) => {
            let estimatedPages = Math.ceil(chapter.scrollHeight / window.innerHeight);
            chapterPageOffsets[chapter.id] = cumulativePages;
            cumulativePages += estimatedPages;
        });

        logDebug(`[DEBUG] Computed chapter page offsets: ${JSON.stringify(chapterPageOffsets)}`);
    }

    computeChapterPageOffsets();

    // 📌 Load last selected chapter & scroll position
    window.addEventListener("load", function () {
        let savedChapter = localStorage.getItem("selectedChapter") || chapters[0].id;
        let savedScroll = localStorage.getItem("scrollPosition");

        chapterSelector.value = savedChapter;
        updateNavigationButtons(savedChapter);
        showChapter(savedChapter, false); // Show chapter first

        if (savedScroll !== null) {
            setTimeout(() => {
                logDebug(`[DEBUG] Restoring scroll position: ${savedScroll}`);
                window.scrollTo(0, parseInt(savedScroll));
            }, 100);
        }

        // ✨ Load and Apply Highlights
        loadAndApplyHighlights();
    });

    // 🌙 Handle Dark Mode
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
        darkModeButton.textContent = "☀️";
    }
    // The event listener for dark mode is correctly defined below, removing the duplicate/incomplete one.

    // 🔇 Load Mute State
    if (audio && muteToggleButton) {
        let isMuted = localStorage.getItem("audioMuted") === "true";
        audio.muted = isMuted;
        muteToggleButton.textContent = isMuted ? "🔇" : "🔊";
        logDebug(`[DEBUG] Audio mute state loaded: ${isMuted}`);
    } else {
        logDebug("[ERROR] Audio or Mute Toggle Button not found for mute state initialization.");
    }

    // 🎧 Add Event Listeners for Audio Element States (for debugging)
    if (audio) { 
        ['loadstart', 'loadeddata', 'loadedmetadata', 'canplay', 'canplaythrough', 'play', 'playing', 'pause', 'ended', 'error', 'abort', 'stalled', 'waiting', 'emptied', 'suspend'].forEach(event => {
            audio.addEventListener(event, () => {
                logDebug(`[AUDIO_EVENT] Event: '${event}'. Src: ${audio.src}. CurrentSong: '${currentSong}'. Paused: ${audio.paused}. Muted: ${audio.muted}. ReadyState: ${audio.readyState}. NetworkState: ${audio.networkState}. CurrentTime: ${audio.currentTime.toFixed(2)}s. Error: ${audio.error ? audio.error.message : 'null'}`);
            });
        });
    }

    darkModeButton.addEventListener("click", function () {
        document.body.classList.toggle("dark-mode");
        let isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
        darkModeButton.textContent = isDark ? "☀️" : "🌙";
    });

    // 🔇 Handle Mute Toggle
    if (audio && muteToggleButton) {
        muteToggleButton.addEventListener("click", function () {
            audio.muted = !audio.muted;
            localStorage.setItem("audioMuted", audio.muted ? "true" : "false");
            muteToggleButton.textContent = audio.muted ? "🔇" : "🔊";
            logDebug(`[DEBUG] Audio muted state changed: ${audio.muted}`);
        });
    } else {
        logDebug("[ERROR] Audio or Mute Toggle Button not found for mute event listener.");
    }

    // ✨ Handle Highlight Text Button
    if (highlightTextButton) {
        highlightTextButton.addEventListener("click", toggleHighlightAtSelection); // Renamed function
    } else {
        logDebug("[ERROR] Highlight Text Button not found.");
    }

    // 📖 Populate chapter dropdown
    chapters.forEach((chapter) => {
        let chapterTitleElement = chapter.querySelector(".chapter-title");
        if (chapterTitleElement) {
            let option = document.createElement("option");
            option.value = chapter.id;
            option.textContent = chapterTitleElement.textContent.trim();
            chapterSelector.appendChild(option);
        }
    });

    // 🔄 Change chapter via dropdown
    chapterSelector.addEventListener("change", function () {
        let selectedChapter = this.value;
        localStorage.setItem("selectedChapter", selectedChapter);
        updateNavigationButtons(selectedChapter);
        showChapter(selectedChapter, true);
    });

    // 📌 Generalized Chapter Navigation
    function navigateChapter(direction) {
        let currentIndex = chapters.findIndex(ch => ch.id === chapterSelector.value);
        let newIndex = currentIndex + direction;

        if (newIndex >= 0 && newIndex < chapters.length) {
            let newChapter = chapters[newIndex].id;

            updateNavigationButtons(newChapter);
            chapterSelector.value = newChapter;
            localStorage.setItem("selectedChapter", newChapter);
            showChapter(newChapter, true);
        }
    }

    prevChapterButton.addEventListener("click", () => navigateChapter(-1));
    nextChapterButton.addEventListener("click", () => navigateChapter(1));

    // ✨ Helper function to escape RegExp special characters
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    // ✨ Function to toggle highlight for selected text
    function toggleHighlightAtSelection() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            logDebug("[HIGHLIGHT] No valid selection to toggle highlight. Selection collapsed or rangeCount is 0.");
            if (selection) selection.removeAllRanges(); // Clear if any partial invalid selection exists
            return;
        }

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();

        if (selectedText.length === 0) {
            logDebug("[HIGHLIGHT] Selected text is empty after trimming. No action taken.");
            selection.removeAllRanges();
            return;
        }

        const container = range.commonAncestorContainer;
        const parentMark = container.nodeType === Node.ELEMENT_NODE ? container.closest('mark') : container.parentNode.closest('mark');
        const currentChapterId = chapterSelector.value; // Get current chapter ID

        // Unhighlight Logic
        if (parentMark && parentMark.textContent.trim() === selectedText) {
            logDebug(`[HIGHLIGHT] Attempting to UNHIGHLIGHT text: "${selectedText}" in chapter ${currentChapterId}`);
            const fragment = document.createDocumentFragment();
            while (parentMark.firstChild) {
                fragment.appendChild(parentMark.firstChild);
            }
            parentMark.parentNode.replaceChild(fragment, parentMark);

            let highlights = JSON.parse(localStorage.getItem("highlights")) || [];
            const initialLength = highlights.length;
            highlights = highlights.filter(h => !(h.text === selectedText && h.chapterId === currentChapterId));
            
            if (highlights.length < initialLength) {
                localStorage.setItem("highlights", JSON.stringify(highlights));
                logDebug(`[HIGHLIGHT] Unhighlighted and removed from localStorage: "${selectedText}" in chapter ${currentChapterId}`);
            } else {
                logDebug(`[HIGHLIGHT] Text found in a mark tag but not matching any stored highlight for chapter ${currentChapterId}: "${selectedText}"`);
            }
        } 
        // Highlight Logic
        else {
            logDebug(`[HIGHLIGHT] Attempting to HIGHLIGHT text: "${selectedText}" in chapter ${currentChapterId}`);
            
            const chapterElement = range.startContainer.closest('.chapter');
            if (!chapterElement) {
                logDebug("[HIGHLIGHT][ERROR] Selected text is not within a chapter element. Cannot highlight.");
                selection.removeAllRanges();
                return;
            }
            // Ensure the chapterElement's ID matches the currentChapterId from the selector, mostly a sanity check
            if (chapterElement.id !== currentChapterId) {
                 logDebug(`[HIGHLIGHT][WARNING] Selected text is in chapter '${chapterElement.id}' but current chapter in selector is '${currentChapterId}'. Highlighting based on selection's chapter.`);
                 // Potentially update currentChapterId = chapterElement.id; if this scenario is valid
            }

            const markElement = document.createElement("mark");
            try {
                // Check if the selection is already highlighted by a different mark (e.g. a sub-selection of an existing mark)
                // This is a complex scenario. For now, we'll allow it, which might lead to nested marks if not careful.
                // A more robust solution would be to expand the range to the parent mark if a partial selection inside a mark is made,
                // and then treat it as an unhighlight operation. But that's beyond current scope.
                
                range.surroundContents(markElement);

                let highlights = JSON.parse(localStorage.getItem("highlights")) || [];
                // Prevent duplicate entries for the exact same text in the same chapter
                const alreadyExists = highlights.some(h => h.text === selectedText && h.chapterId === currentChapterId);
                if (!alreadyExists) {
                    highlights.push({ chapterId: currentChapterId, text: selectedText });
                    localStorage.setItem("highlights", JSON.stringify(highlights));
                    logDebug(`[HIGHLIGHT] Highlighted and saved to localStorage: "${selectedText}" in chapter ${currentChapterId}`);
                } else {
                    logDebug(`[HIGHLIGHT] Text already highlighted and stored: "${selectedText}" in chapter ${currentChapterId}. No new entry added.`);
                }

            } catch (e) {
                logDebug(`[HIGHLIGHT][ERROR] Could not surround contents for highlighting: ${e.message}. This can happen if the selection is complex (e.g., spans across different block elements or contains partial HTML elements). Try selecting plain text within a single paragraph.`);
            }
        }
        selection.removeAllRanges();
    }

    // ✨ Function to load and apply highlights from localStorage
    function loadAndApplyHighlights() {
        const highlights = JSON.parse(localStorage.getItem("highlights")) || [];
        if (highlights.length === 0) {
            logDebug("[DEBUG] No highlights found in localStorage.");
            return;
        }
        logDebug(`[DEBUG] Loading ${highlights.length} highlights from localStorage.`);

        highlights.forEach(highlight => {
            const chapterElement = document.getElementById(highlight.chapterId);
            if (chapterElement && chapterElement.style.display === "block") { // Only apply to visible chapter for performance
                try {
                    const escapedText = escapeRegExp(highlight.text);
                    const regex = new RegExp(escapedText, 'g');
                    // Create a TreeWalker to iterate over text nodes
                    const walker = document.createTreeWalker(chapterElement, NodeFilter.SHOW_TEXT, null, false);
                    let node;
                    let nodesToReplace = [];

                    while (node = walker.nextNode()) {
                        if (node.nodeValue.includes(highlight.text)) {
                           // Avoid re-highlighting already marked text
                           if (node.parentNode.nodeName === 'MARK') continue;

                            const parent = node.parentNode;
                            // Check if the parent or any ancestor is already a mark to prevent nested marks from this process
                            let isAlreadyMarkedAncestor = false;
                            let tempParent = parent;
                            while(tempParent && tempParent !== chapterElement) {
                                if (tempParent.nodeName === 'MARK') {
                                    isAlreadyMarkedAncestor = true;
                                    break;
                                }
                                tempParent = tempParent.parentNode;
                            }
                            if (isAlreadyMarkedAncestor) continue;

                            nodesToReplace.push({node: node, text: highlight.text});
                        }
                    }
                    
                    // Process replacements from last to first to avoid issues with node splitting and indices
                    for (let i = nodesToReplace.length - 1; i >= 0; i--) {
                        const item = nodesToReplace[i];
                        const node = item.node;
                        const text = item.text;
                        const parent = node.parentNode;

                        const parts = node.nodeValue.split(new RegExp(`(${escapeRegExp(text)})`, 'g'));
                        parts.forEach(part => {
                            if (part === text) {
                                const mark = document.createElement('mark');
                                mark.textContent = text;
                                parent.insertBefore(mark, node.nextSibling); // Insert mark after original text part
                            } else if (part.length > 0) {
                                parent.insertBefore(document.createTextNode(part), node.nextSibling);
                            }
                        });
                        parent.removeChild(node); // Remove original combined node
                    }

                    if (nodesToReplace.length > 0) {
                         logDebug(`[DEBUG] Re-applied highlight for: "${highlight.text}" in chapter ${highlight.chapterId}`);
                    }

                } catch (e) {
                    logDebug(`[ERROR] Failed to re-apply highlight for "${highlight.text}": ${e.message}`);
                }
            } else if (!chapterElement) {
                logDebug(`[WARNING] Chapter element ID ${highlight.chapterId} not found for re-applying highlight.`);
            }
        });
    }

// 🎵 Map sections to audio files
const sectionToSongMap = {
  section1: "Eva_Angelina.mp3",
  section2: "Mojo_Pin.mp3",
  section3: "Rose_Parade.mp3"
};

let currentSong = null;

// 🎯 Function to play a song based on section ID
function playSongForSection(sectionId) {
    logDebug(`[MUSIC_LOGIC] playSongForSection CALLED for section: ${sectionId}. Current song: '${currentSong}'. Audio src: '${audio.src}'. Muted: ${audio.muted}. ReadyState: ${audio.readyState}`);
    const songFile = sectionToSongMap[sectionId];

    if (songFile && songFile !== currentSong) {
        logDebug(`[MUSIC_LOGIC] Attempting to set new song. Section: ${sectionId}, Target song file: ${songFile}, currentSong: '${currentSong}'`);
        audio.src = songFile;
        audio.load();
        logDebug(`[MUSIC_LOGIC] audio.src set to: ${audio.src}. Called audio.load(). ReadyState after load call: ${audio.readyState}, NetworkState: ${audio.networkState}`);

        // Autoplay mute/unmute strategy
        if (!firstInteractionDone) {
            if (!audio.muted) { // Only mute if not already globally muted by user
                audio.muted = true;
                logDebug(`[AUTOPLAY] Playback will start muted for ${audio.src} (awaiting first user interaction). Original audio.muted state was false.`);
            } else {
                logDebug(`[AUTOPLAY] Playback will start muted for ${audio.src} (audio already muted by user). Awaiting first user interaction.`);
            }
        } else {
            // If interaction has occurred, ensure audio is NOT muted by this autoplay strategy
            // Respect user's explicit mute toggle choice
            let userMuted = localStorage.getItem("audioMuted") === "true";
            if (audio.muted && !userMuted) {
                logDebug(`[AUTOPLAY] First interaction done. Unmuting for ${audio.src} as it was muted by autoplay strategy.`);
                audio.muted = false;
            } else if (userMuted) {
                logDebug(`[AUTOPLAY] First interaction done, but audio remains muted by user setting for ${audio.src}.`);
                audio.muted = true; // Ensure it respects user's mute
            } else {
                logDebug(`[AUTOPLAY] First interaction done. Audio will play unmuted for ${audio.src}.`);
                audio.muted = false; // Explicitly set to false if not user muted.
            }
        }
        // End of autoplay mute/unmute strategy

        if (audio.muted && !firstInteractionDone) { // Check if still muted by autoplay logic before playing
             logDebug("[AUDIO] Audio is currently muted by autoplay strategy. Playback will be silent unless unmuted by user interaction or toggle.");
        } else if (audio.muted && firstInteractionDone) {
             logDebug("[AUDIO] Audio is currently muted by user setting. Playback will be silent.");
        }


        let playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                logDebug(`[MUSIC_LOGIC] Playback SUCCEEDED for ${audio.src}. Updating currentSong from '${currentSong}' to '${songFile}'`);
                currentSong = songFile; 
            }).catch(error => {
                logDebug(`[MUSIC_LOGIC] Playback FAILED for ${audio.src}. Error: ${error.name} - ${error.message}. currentSong REMAINS '${currentSong}'`);
            });
        } else {
            logDebug("[AUDIO] audio.play() did not return a promise. This is unexpected. Playback might not have started."); // Kept specific audio log
        }
    } else if (songFile === currentSong) {
        logDebug(`[MUSIC_LOGIC] Section ${sectionId} maps to already current song: '${currentSong}'. Audio playing: ${!audio.paused}. ReadyState: ${audio.readyState}. No action taken.`);
    } else {
        logDebug(`[AUDIO] No song mapped for section ${sectionId} or songFile is null/undefined.`); // Kept specific audio log
    }
}

// 👀 Intersection Observer to detect section visibility
const observerOptions = { threshold: 0.05 }; // Rolled back from 0.5 to 0.05
logDebug(`[OBSERVER] IntersectionObserver options set to: threshold ${observerOptions.threshold}`); // Kept this specific observer log

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        // logDebug(`[OBSERVER] Intersection event for: ${entry.target.id}. Is intersecting: ${entry.isIntersecting}. Intersection Ratio: ${entry.intersectionRatio.toFixed(2)}`); // This is now more specific below
        if (entry.isIntersecting) {
            logDebug(`[MUSIC_LOGIC_OBSERVER] Section ${entry.target.id} IS intersecting. Ratio: ${entry.intersectionRatio.toFixed(2)}. Calling playSongForSection.`);
            playSongForSection(entry.target.id);
        } else {
            logDebug(`[MUSIC_LOGIC_OBSERVER] Section ${entry.target.id} is NO LONGER intersecting. Ratio: ${entry.intersectionRatio.toFixed(2)}.`);
        }
    });
}, observerOptions);

// 🔗 Observe all sections with IDs from the map
Object.keys(sectionToSongMap).forEach(sectionId => {
  const section = document.getElementById(sectionId);
  if (section) observer.observe(section);
});

    // 🔄 Show the correct chapter & hide others
    function showChapter(chapterId, shouldScrollToTop = true) {
        let found = false;
        chapters.forEach(chapter => {
            if (chapter.id === chapterId) {
                chapter.style.display = "block"; // Show the selected chapter
                found = true;
                if (shouldScrollToTop) {
                    window.scrollTo(0, 0);
                }
            } else {
                chapter.style.display = "none"; // Hide all other chapters
            }
        });

        if (!found) {
            logDebug(`[ERROR] Chapter ID ${chapterId} not found.`);
        }

        updateChapterFooter();
        updatePageNumber();
    }

    // 📌 Update Navigation Buttons (Prev/Next Visibility)
    function updateNavigationButtons(chapterId) {
        let currentIndex = chapters.findIndex(ch => ch.id === chapterId);

        prevChapterButton.classList.toggle("hidden", currentIndex === 0);
        nextChapterButton.classList.toggle("hidden", currentIndex === chapters.length - 1);

        logDebug(`[DEBUG] Prev button ${prevChapterButton.classList.contains("hidden") ? "HIDDEN" : "VISIBLE"}`);
        logDebug(`[DEBUG] Next button ${nextChapterButton.classList.contains("hidden") ? "HIDDEN" : "VISIBLE"}`);
    }

    function updateChapterFooter() {
        let activeChapter = chapters.find(ch => ch.style.display === "block");
        if (!activeChapter) {
            logDebug("[WARNING] No active chapter found.");
            return;
        }

        let chapterTitleElement = activeChapter.querySelector(".chapter-title");
        chapterFooter.textContent = chapterTitleElement
            ? chapterTitleElement.textContent.trim()
            : "Untitled";

        logDebug(`[DEBUG] Footer updated: ${chapterFooter.textContent}`);
    }

    function updatePageNumber() {
        let scrollPosition = window.scrollY;
        let pageHeight = window.innerHeight;
        let currentChapter = chapters.find(ch => ch.style.display === "block");
    
        if (!currentChapter) return;
    
        let currentChapterId = currentChapter.id;
        let currentPageInChapter = Math.ceil(scrollPosition / pageHeight) || 1; 
        let totalPageNumber = (chapterPageOffsets[currentChapterId] || 0) + currentPageInChapter;
    
        logDebug(`[DEBUG] Scroll Position: ${scrollPosition}`);
        logDebug(`[DEBUG] Page Height: ${pageHeight}`);
        logDebug(`[DEBUG] Current Chapter ID: ${currentChapterId}`);
        logDebug(`[DEBUG] Page in Chapter: ${currentPageInChapter}`);
        logDebug(`[DEBUG] Total Page Number: ${totalPageNumber}`);
    
        let pageNumberElement = document.getElementById("page-number");
        if (pageNumberElement) {
            pageNumberElement.textContent = `Page ${totalPageNumber}`;
        }
    }
    
    function updateChapterOnScroll() {
        let activeChapter = chapters.find(ch => ch.style.display === "block");

        if (activeChapter) {
            chapterSelector.value = activeChapter.id;
            localStorage.setItem("selectedChapter", activeChapter.id);
            updateChapterFooter();
        }
    }

    window.addEventListener("scroll", updateChapterOnScroll);
    window.addEventListener("scroll", updatePageNumber);

    // 📐 Handle Window Resize for Page Numbering Accuracy
    function handleResize() {
        logDebug("[DEBUG] Window resized. Recalculating page numbers and offsets...");
        computeChapterPageOffsets(); // This function uses window.innerHeight internally
        updatePageNumber();          // This function also uses window.innerHeight internally
        // Also, re-apply highlights as their positions might change relative to new page breaks
        loadAndApplyHighlights(); 
    }
    window.addEventListener("resize", handleResize);

    // ✨ Keyboard shortcut for highlighting
    document.addEventListener('keydown', function(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
            event.preventDefault(); // Prevent default browser action (e.g., opening history)
            logDebug('[HIGHLIGHT_SHORTCUT] Ctrl/Cmd+H pressed. Calling toggleHighlightAtSelection().');
            toggleHighlightAtSelection();
        }
    });

    // Autoplay Strategy: First User Interaction Handler
    function handleFirstUserInteraction() {
        if (!firstInteractionDone) {
            logDebug('[AUTOPLAY] First user interaction detected.');
            firstInteractionDone = true;

            const userActuallyMuted = localStorage.getItem("audioMuted") === "true";

            if (userActuallyMuted) {
                logDebug('[AUTOPLAY] User has explicitly muted the audio via toggle. Respecting that choice.');
                if (!audio.muted) audio.muted = true; // Ensure audio element matches persisted state
            } else {
                logDebug('[AUTOPLAY] User has not explicitly muted via toggle. Unmuting audio element now.');
                if (audio.muted) audio.muted = false; // Unmute if it was muted (e.g. by autoplay strategy)
            }
            
            // This log might be confusing as currentSong might not be the one that was playing muted.
            // The core idea is that if any audio was playing (but muted by autoplay), it becomes audible.
            // If audio was paused, it remains paused but will play unmuted next time.
            if (!audio.paused && !audio.muted && !userActuallyMuted) {
                 logDebug('[AUTOPLAY] Audio should now be audible if it was playing and muted by autoplay.');
            } else if (audio.paused && !userActuallyMuted) {
                logDebug('[AUTOPLAY] Audio is paused. Subsequent plays will be unmuted (unless user mutes again).');
            }


            // Clean up the event listener after the first interaction.
            document.removeEventListener('click', handleFirstUserInteraction);
            document.removeEventListener('touchstart', handleFirstUserInteraction);
            logDebug('[AUTOPLAY] Removed first user interaction listeners.');
        }
    }

    // Add listeners for first interaction
    document.addEventListener('click', handleFirstUserInteraction, { once: false }); // once: false to be explicit, though default
    document.addEventListener('touchstart', handleFirstUserInteraction, { once: false }); // once: false, will be removed manually


    logDebug("[DEBUG] Initialization complete.");
});

// 🛠 Debugging UI Logger
function logDebug(message) {
    let debugElement = document.getElementById("debug-log");
    if (!debugElement) {
        console.warn("[WARNING] Debugging UI not found.");
        return;
    }

    let timestamp = new Date().toISOString().split("T")[1].split(".")[0]; // HH:MM:SS format
    let logEntry = document.createElement("div");
    logEntry.textContent = `[${timestamp}] ${message}`;
    debugElement.appendChild(logEntry);

    // Auto-clear logs after 30 seconds
    setTimeout(() => {
        if (logEntry.parentNode) {
            logEntry.parentNode.removeChild(logEntry);
        }
    }, 30000); // 30,000ms = 30 seconds

    // Ensure only the last 50 messages are kept (optional)
    if (debugElement.children.length > 50) {
        debugElement.removeChild(debugElement.children[0]); // Remove the oldest message
    }

    debugElement.scrollTop = debugElement.scrollHeight; // Auto-scroll to the latest log
}
