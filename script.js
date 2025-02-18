document.addEventListener("DOMContentLoaded", function () {
    logDebug("[DEBUG] DOM fully loaded. Initializing scripts...");

    const audio = document.getElementById("background-audio");
    const darkModeButton = document.getElementById("dark-mode-toggle");
    const chapterSelector = document.getElementById("chapter-selector");
    const pageNumber = document.getElementById("page-number");
    const chapterFooter = document.getElementById("chapter-footer");
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
        showChapter(savedChapter, false);

        if (savedScroll !== null) {
            setTimeout(() => {
                logDebug(`[DEBUG] Restoring scroll position: ${savedScroll}`);
                window.scrollTo(0, parseInt(savedScroll));
            }, 100);
        }
    });

    // 🌙 Handle Dark Mode
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
        darkModeButton.textContent = "☀️";
    }

    darkModeButton.addEventListener("click", function () {
        document.body.classList.toggle("dark-mode");
        let isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
        darkModeButton.textContent = isDark ? "☀️" : "🌙";
    });

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
  
  if (songFile && songFile !== currentSong) {
    audio.src = songFile;
    audio.play().catch(err => console.log('Autoplay blocked:', err));
    currentSong = songFile;
  }
}

// 👀 Intersection Observer to detect section visibility
const observerOptions = { threshold: 0.05 }; // Trigger when 50% of section is visible

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      playSongForSection(entry.target.id);
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
