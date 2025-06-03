document.addEventListener("DOMContentLoaded", function () {
    logDebug("[DEBUG] DOM fully loaded. Initializing scripts...");

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
        highlightTextButton.addEventListener("click", highlightSelectedText);
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

    // ✨ Function to highlight selected text
    function highlightSelectedText() {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
            logDebug("[INFO] No text selected or selection is collapsed.");
            // Optionally, provide user feedback here (e.g., an alert or a temporary message)
            return;
        }

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();

        if (selectedText.length === 0) {
            logDebug("[INFO] Selected text is empty after trimming.");
            selection.removeAllRanges();
            return;
        }

        // Basic check: Ensure selection is within a chapter
        let parentNode = range.commonAncestorContainer;
        let inChapter = false;
        while(parentNode) {
            if (parentNode.nodeType === Node.ELEMENT_NODE && parentNode.classList && parentNode.classList.contains('chapter')) {
                inChapter = true;
                break;
            }
            parentNode = parentNode.parentNode;
        }

        if (!inChapter) {
            logDebug("[WARNING] Highlight attempt outside of a chapter. Ignoring.");
            selection.removeAllRanges(); // Clear selection to avoid confusion
            // alert("Please select text within a chapter to highlight."); // Optional user feedback
            return;
        }


        const markElement = document.createElement("mark");
        try {
            range.surroundContents(markElement); // This can fail if selection spans across non-text nodes or complex structures

            const currentChapterId = chapterSelector.value;
            let highlights = JSON.parse(localStorage.getItem("highlights")) || [];
            highlights.push({ chapterId: currentChapterId, text: selectedText });
            localStorage.setItem("highlights", JSON.stringify(highlights));
            logDebug(`[DEBUG] Highlighted and saved: "${selectedText}" in chapter ${currentChapterId}`);

        } catch (e) {
            logDebug(`[ERROR] Could not surround contents for highlighting: ${e.message}. This can happen if the selection is complex (e.g., spans across different block elements or contains partial HTML elements). Try selecting plain text within a single paragraph.`);
            // Fallback for complex selections: Manually wrap matching text nodes (less precise)
            // This is a simplified fallback and might not work perfectly.
            // For a robust solution, a more sophisticated range analysis is needed.
            // For now, we just log the error and don't save the highlight to avoid issues.
        } finally {
            selection.removeAllRanges(); // Clear selection in all cases
        }
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
    const songFile = sectionToSongMap[sectionId];
    logDebug(`[AUDIO] Evaluating playSongForSection for section: ${sectionId}. Mapped song: ${songFile}. Current song: ${currentSong}`);

    if (songFile && songFile !== currentSong) {
        logDebug(`[AUDIO] New song detected. Attempting to play: ${songFile} for section: ${sectionId}.`);
        audio.src = songFile;
        logDebug(`[AUDIO] Set audio.src to: ${audio.src}`);
        audio.load(); // Explicitly load the new source

        if (audio.muted) {
            logDebug("[AUDIO] Audio is currently muted by global mute setting. Playback will be silent unless unmuted by user.");
        }

        let playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                logDebug(`[AUDIO] Playback STARTED successfully for: ${audio.src}`);
                currentSong = songFile; // Update currentSong only on successful play
            }).catch(error => {
                logDebug(`[AUDIO] Playback FAILED for: ${audio.src}. Error: ${error.name} - ${error.message}`);
                // If it failed, currentSong is not updated, allowing retry if another intersecting event happens.
            });
        } else {
            logDebug("[AUDIO] audio.play() did not return a promise. This is unexpected. Playback might not have started.");
        }
    } else if (songFile === currentSong) {
        logDebug(`[AUDIO] Section ${sectionId} maps to current song ${currentSong}. No change needed.`);
    } else {
        logDebug(`[AUDIO] No song mapped for section ${sectionId} or songFile is null/undefined.`);
    }
}

// 👀 Intersection Observer to detect section visibility
const observerOptions = { threshold: 0.5 }; // Changed from 0.05 to 0.5
logDebug(`[OBSERVER] IntersectionObserver options set to: threshold ${observerOptions.threshold}`);

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        logDebug(`[OBSERVER] Intersection event for: ${entry.target.id}. Is intersecting: ${entry.isIntersecting}. Intersection Ratio: ${entry.intersectionRatio.toFixed(2)}`);
        if (entry.isIntersecting) {
            logDebug(`[OBSERVER] Section ${entry.target.id} is visible.`);
            playSongForSection(entry.target.id);
        } else {
            // Optional: Log when a section scrolls out of view
            // logDebug(`[OBSERVER] Section ${entry.target.id} is no longer visible.`);
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
