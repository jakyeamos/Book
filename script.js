import chapterConfig, {
  SITE_CONFIG,
  getAmbientTrack,
  getAudioCues,
  getAudioTrack,
  getChapterTheme,
  getParticleConfig,
  getParticlePreset
} from "./chapters/config.js";

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

class AudioController {
  constructor(primary, secondary, ambient, logger, options = {}) {
    this.primary = primary;
    this.secondary = secondary;
    this.ambient = ambient;
    this.logger = logger;
    this.onPlaybackBlocked = typeof options.onPlaybackBlocked === "function"
      ? options.onPlaybackBlocked
      : null;
    this.activeMain = primary;
    this.standbyMain = secondary;
    this.currentTrack = null;
    this.currentAmbientTrack = null;
    this.defaultMainVolume = 0.85;
    this.currentMainVolume = this.defaultMainVolume;
    this.defaultAmbientVolume = 0.2;
    this.currentAmbientVolume = this.defaultAmbientVolume;
    this.isMuted = false;
  }

  notifyPlaybackBlocked(context, error) {
    if (!this.onPlaybackBlocked) {
      return;
    }

    try {
      this.onPlaybackBlocked({ context, error });
    } catch (callbackError) {
      this.logger.debug("Playback blocked callback failed", callbackError?.message || callbackError);
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    [this.primary, this.secondary, this.ambient].forEach((element) => {
      element.muted = muted;
    });
  }

  setMainVolume(volume, durationSeconds = 0.25) {
    this.currentMainVolume = clamp01(volume);
    if (this.activeMain.paused) {
      return;
    }

    if (window.gsap) {
      window.gsap.killTweensOf(this.activeMain);
      window.gsap.to(this.activeMain, {
        volume: this.currentMainVolume,
        duration: durationSeconds,
        ease: "power1.out"
      });
      return;
    }

    this.activeMain.volume = this.currentMainVolume;
  }

  setAmbientVolume(volume, durationSeconds = 0.25) {
    this.currentAmbientVolume = clamp01(volume);
    if (this.ambient.paused) {
      return;
    }

    if (window.gsap) {
      window.gsap.killTweensOf(this.ambient);
      window.gsap.to(this.ambient, {
        volume: this.currentAmbientVolume,
        duration: durationSeconds,
        ease: "power1.out"
      });
      return;
    }

    this.ambient.volume = this.currentAmbientVolume;
  }

  async crossfadeTo(trackName, durationSeconds = 1.5) {
    if (!trackName) {
      this.pauseMain();
      return;
    }

    if (this.currentTrack === trackName && !this.activeMain.paused) {
      return;
    }

    this.standbyMain.src = trackName;
    this.standbyMain.currentTime = 0;
    this.standbyMain.volume = 0;
    this.standbyMain.loop = true;

    try {
      await this.standbyMain.play();
    } catch (error) {
      this.logger.debug("Main audio play blocked by browser", error?.message || error);
      this.notifyPlaybackBlocked("main", error);
      return;
    }

    const fadeOutTarget = this.activeMain;
    const fadeInTarget = this.standbyMain;

    if (window.gsap) {
      window.gsap.killTweensOf([fadeOutTarget, fadeInTarget]);
      window.gsap.to(fadeOutTarget, { volume: 0, duration: durationSeconds, ease: "power2.out" });
      window.gsap.to(fadeInTarget, { volume: this.currentMainVolume, duration: durationSeconds, ease: "power2.out" });
      await wait(durationSeconds * 1000 + 30);
    } else {
      const start = performance.now();
      const startOut = fadeOutTarget.volume;
      const step = () => {
        const elapsed = performance.now() - start;
        const progress = Math.min(1, elapsed / (durationSeconds * 1000));
        fadeOutTarget.volume = startOut * (1 - progress);
        fadeInTarget.volume = this.currentMainVolume * progress;
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      step();
      await wait(durationSeconds * 1000 + 30);
    }

    fadeOutTarget.pause();
    fadeOutTarget.currentTime = 0;

    this.activeMain = fadeInTarget;
    this.standbyMain = fadeOutTarget;
    this.currentTrack = trackName;
    this.activeMain.volume = this.currentMainVolume;
  }

  async crossfadeAmbientTo(trackName, durationSeconds = 1.2) {
    if (!trackName) {
      if (!this.ambient.paused) {
        if (window.gsap) {
          window.gsap.killTweensOf(this.ambient);
          window.gsap.to(this.ambient, {
            volume: 0,
            duration: durationSeconds,
            ease: "power1.out",
            onComplete: () => {
              this.ambient.pause();
              this.ambient.currentTime = 0;
            }
          });
        } else {
          this.ambient.volume = 0;
          this.ambient.pause();
          this.ambient.currentTime = 0;
        }
      }
      this.currentAmbientTrack = null;
      return;
    }

    if (this.currentAmbientTrack === trackName && !this.ambient.paused) {
      return;
    }

    if (!this.ambient.paused) {
      if (window.gsap) {
        window.gsap.killTweensOf(this.ambient);
        await new Promise((resolve) => {
          window.gsap.to(this.ambient, {
            volume: 0,
            duration: durationSeconds * 0.6,
            ease: "power1.out",
            onComplete: resolve
          });
        });
      } else {
        this.ambient.volume = 0;
      }
      this.ambient.pause();
    }

    this.ambient.src = trackName;
    this.ambient.currentTime = 0;
    this.ambient.loop = true;
    this.ambient.volume = 0;

    try {
      await this.ambient.play();
    } catch (error) {
      this.logger.debug("Ambient audio play blocked by browser", error?.message || error);
      this.notifyPlaybackBlocked("ambient", error);
      return;
    }

    if (window.gsap) {
      window.gsap.to(this.ambient, { volume: this.currentAmbientVolume, duration: durationSeconds, ease: "power2.out" });
    } else {
      this.ambient.volume = this.currentAmbientVolume;
    }

    this.currentAmbientTrack = trackName;
  }

  pauseMain() {
    [this.primary, this.secondary].forEach((element) => {
      element.pause();
      element.currentTime = 0;
      element.volume = 0;
    });
    this.currentTrack = null;
  }
}

class ParticleController {
  constructor(containerId, logger, isMobile, prefersReducedMotion, isEffectsEnabled = () => true) {
    this.containerId = containerId;
    this.logger = logger;
    this.isMobile = isMobile;
    this.prefersReducedMotion = prefersReducedMotion;
    this.isEffectsEnabled = isEffectsEnabled;
    this.instance = null;
  }

  async updateForChapter(chapterId) {
    if (!window.tsParticles || this.prefersReducedMotion || !this.isEffectsEnabled()) {
      await this.destroy();
      return;
    }

    const chapterParticles = getParticleConfig(chapterId);
    const preset = getParticlePreset(chapterParticles.type);
    if (!preset) {
      await this.destroy();
      return;
    }

    const targetCount = this.isMobile
      ? Math.min(chapterParticles.count || 50, 50)
      : (chapterParticles.count || 90);

    if (!preset.particles) {
      preset.particles = {};
    }

    if (!preset.particles.number) {
      preset.particles.number = { value: targetCount };
    }

    preset.particles.number.value = Math.min(preset.particles.number.value || targetCount, targetCount);

    await this.destroy();

    try {
      this.instance = await window.tsParticles.load(this.containerId, preset);
    } catch (error) {
      this.logger.debug("Particle load failed", error?.message || error);
    }
  }

  async destroy() {
    if (this.instance) {
      try {
        await this.instance.destroy();
      } catch (error) {
        this.logger.debug("Particle destroy failed", error?.message || error);
      }
      this.instance = null;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const isDev =
    window.location.hostname.includes("localhost") ||
    window.location.hostname === "127.0.0.1" ||
    new URLSearchParams(window.location.search).has("debug");

  const Logger = {
    debug: (...args) => {
      if (isDev) {
        console.log("[DEBUG]", ...args);
      }
    },
    info: (...args) => {
      if (isDev) {
        console.info("[INFO]", ...args);
      }
    },
    error: (...args) => {
      console.error("[ERROR]", ...args);
    }
  };

  const elements = {
    chapterContainer: document.getElementById("chapter-container"),
    chapterSelector: document.getElementById("chapter-selector"),
    pageNumber: document.getElementById("page-number"),
    chapterFooter: document.getElementById("chapter-footer"),
    prevButton: document.getElementById("prev-chapter"),
    nextButton: document.getElementById("next-chapter"),
    darkModeButton: document.getElementById("dark-mode-toggle"),
    muteButton: document.getElementById("mute-toggle"),
    effectsButton: document.getElementById("effects-toggle"),
    highlightButton: document.getElementById("highlight-text-button"),
    bookContainer: document.querySelector(".book-container"),
    parallaxRoot: document.getElementById("parallax-root"),
    giscusContainer: document.getElementById("giscus-container"),
    giscusPlaceholder: document.getElementById("giscus-placeholder"),
    audioUnlockPrompt: document.getElementById("audio-unlock-prompt"),
    audioUnlockButton: document.getElementById("audio-unlock-button")
  };

  const primaryAudio = document.getElementById("background-audio");
  const secondaryAudio = document.getElementById("background-audio-secondary");
  const ambientAudio = document.getElementById("ambient-audio");

  if (!elements.chapterContainer || !elements.chapterSelector || !primaryAudio || !secondaryAudio || !ambientAudio) {
    Logger.error("Missing critical DOM elements. App initialization aborted.");
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const audioController = new AudioController(primaryAudio, secondaryAudio, ambientAudio, Logger, {
    onPlaybackBlocked: () => {
      if (!isMobile || audioController.isMuted) {
        return;
      }
      showAudioUnlockPrompt();
    }
  });
  const particleController = new ParticleController(
    "particles-container",
    Logger,
    isMobile,
    prefersReducedMotion,
    () => state.effectsEnabled
  );

  const state = {
    chapterManifest: [],
    chapterCache: new Map(),
    currentChapterId: null,
    cleanupFns: [],
    highlights: JSON.parse(localStorage.getItem("highlights") || "[]"),
    effectsEnabled: localStorage.getItem("effectsEnabled") !== "false",
    resumeAudioSync: null
  };

  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
  }

  function registerCleanup(cleanupFn) {
    state.cleanupFns.push(cleanupFn);
  }

  function resetChapterEffects() {
    while (state.cleanupFns.length > 0) {
      const cleanup = state.cleanupFns.pop();
      try {
        cleanup();
      } catch (error) {
        Logger.debug("Cleanup error", error?.message || error);
      }
    }
  }

  function applyTheme(chapterId) {
    const theme = getChapterTheme(chapterId);

    document.documentElement.style.setProperty("--chapter-accent-color", theme.accentColor);
    document.documentElement.style.setProperty("--chapter-background-tint", theme.backgroundTint);
    document.documentElement.style.setProperty("--chapter-background-image", theme.backgroundImage);
    document.documentElement.style.setProperty(
      "--chapter-transition-duration",
      `${theme.transitionDuration || chapterConfig.defaultTheme.transitionDuration}s`
    );

    if (elements.bookContainer) {
      elements.bookContainer.setAttribute("data-chapter", chapterId);
    }
  }

  function updateNavigationButtons(chapterId) {
    const index = state.chapterManifest.findIndex((entry) => entry.id === chapterId);
    elements.prevButton.classList.toggle("hidden", index <= 0);
    elements.nextButton.classList.toggle("hidden", index === -1 || index >= state.chapterManifest.length - 1);
  }

  function updateChapterFooter(title) {
    elements.chapterFooter.textContent = title || "Untitled";
  }

  function updatePageNumber() {
    const page = Math.max(1, Math.ceil((window.scrollY + 1) / Math.max(window.innerHeight, 1)));
    elements.pageNumber.textContent = `Page ${page}`;
  }

  let lastScrollSaveAt = 0;

  function saveScrollPosition() {
    const now = Date.now();
    if (now - lastScrollSaveAt < 500) {
      return;
    }

    lastScrollSaveAt = now;
    localStorage.setItem("scrollPosition", String(Math.round(window.scrollY)));
  }

  function populateChapterDropdown() {
    elements.chapterSelector.innerHTML = "";

    state.chapterManifest.forEach((chapter) => {
      const option = document.createElement("option");
      option.value = chapter.id;
      option.textContent = `Chapter ${chapter.number}: ${chapter.title}`;
      elements.chapterSelector.appendChild(option);
    });
  }

  async function fetchChapterMarkup(chapterId) {
    const chapterMeta = state.chapterManifest.find((entry) => entry.id === chapterId);
    if (!chapterMeta) {
      return null;
    }

    if (state.chapterCache.has(chapterId)) {
      return state.chapterCache.get(chapterId);
    }

    const chapterPath = chapterMeta.file.includes("/")
      ? chapterMeta.file
      : `chapters/${chapterMeta.file}`;

    const response = await fetch(chapterPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${chapterPath}: ${response.status}`);
    }

    const markup = await response.text();
    state.chapterCache.set(chapterId, markup);
    return markup;
  }

  async function transitionOutCurrentChapter() {
    const chapter = elements.chapterContainer.querySelector(".chapter");
    if (!chapter) {
      return;
    }

    chapter.classList.add("fading-out");

    const durationVar = getComputedStyle(document.documentElement)
      .getPropertyValue("--chapter-transition-duration")
      .trim();
    const numericDuration = Number.parseFloat(durationVar.replace("s", ""));
    const fadeMs = Number.isFinite(numericDuration) ? numericDuration * 1000 : 500;
    await wait(Math.max(fadeMs, 250));
  }

  function initParallax(chapterId) {
    elements.parallaxRoot.innerHTML = "";

    const theme = getChapterTheme(chapterId);
    const layers = Array.isArray(theme.backgroundLayers) ? theme.backgroundLayers : [];

    if (layers.length === 0) {
      return;
    }

    if (prefersReducedMotion || !state.effectsEnabled) {
      elements.parallaxRoot.classList.add("parallax-disabled");
      return;
    }

    elements.parallaxRoot.classList.remove("parallax-disabled");

    const container = document.createElement("div");
    container.className = "parallax-container";
    elements.parallaxRoot.appendChild(container);

    const layerElements = [];
    const scrollTriggers = [];

    layers.forEach((layer, index) => {
      const layerElement = document.createElement("div");
      layerElement.className = "parallax-layer";

      if (index === 0) {
        layerElement.classList.add("parallax-layer-bg");
      } else if (index === 1) {
        layerElement.classList.add("parallax-layer-mid");
      } else {
        layerElement.classList.add("parallax-layer-front");
      }

      const backgroundParts = [];
      if (layer.image) {
        backgroundParts.push(`url('${layer.image}')`);
      }
      if (layer.fallback) {
        backgroundParts.push(layer.fallback);
      }

      layerElement.style.backgroundImage = backgroundParts.join(", ");
      layerElement.style.opacity = String(layer.opacity ?? 0.5);
      layerElement.style.zIndex = String(layer.zIndex ?? index - 3);

      container.appendChild(layerElement);
      layerElements.push({ element: layerElement, speed: layer.speed || 0.2 });

      if (window.gsap && window.ScrollTrigger) {
        const tween = window.gsap.to(layerElement, {
          yPercent: (layer.speed || 0.2) * 120,
          ease: "none",
          scrollTrigger: {
            trigger: document.body,
            start: "top top",
            end: "bottom bottom",
            scrub: true
          }
        });
        scrollTriggers.push(tween.scrollTrigger);
      }
    });

    if (!window.gsap || !window.ScrollTrigger) {
      const onScroll = () => {
        const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const progress = window.scrollY / total;
        layerElements.forEach((layerObject) => {
          layerObject.element.style.transform = `translateY(${progress * layerObject.speed * 160}px)`;
        });
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();

      registerCleanup(() => {
        window.removeEventListener("scroll", onScroll);
      });
    }

    registerCleanup(() => {
      scrollTriggers.forEach((trigger) => trigger?.kill());
      elements.parallaxRoot.innerHTML = "";
    });
  }

  function setupParagraphAnimations(chapterElement) {
    const candidates = Array.from(chapterElement.querySelectorAll(".book-section > p"));

    const paragraphs = candidates.filter((paragraph) => {
      if (paragraph.classList.contains("date-location")) {
        return false;
      }
      if (paragraph.closest(".poetic-text")) {
        return false;
      }
      if (paragraph.querySelector(".bold-grow-1, .bold-grow-2, .bold-grow-3, .bold-grow-4")) {
        return false;
      }
      return true;
    });

    paragraphs.forEach((paragraph) => {
      paragraph.classList.add("paragraph-fade");
    });

    if (paragraphs.length === 0) {
      return;
    }

    if (!state.effectsEnabled) {
      paragraphs.forEach((paragraph) => {
        paragraph.classList.add("visible");
      });
      return;
    }

    if (window.gsap && window.ScrollTrigger) {
      const triggers = paragraphs.map((paragraph) => {
        return window.ScrollTrigger.create({
          trigger: paragraph,
          start: "top 85%",
          onEnter: () => {
            paragraph.classList.add("visible");
          },
          onEnterBack: () => {
            paragraph.classList.add("visible");
          }
        });
      });

      registerCleanup(() => {
        triggers.forEach((trigger) => trigger.kill());
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    }, { threshold: 0.2 });

    paragraphs.forEach((paragraph) => observer.observe(paragraph));

    registerCleanup(() => {
      observer.disconnect();
    });
  }

  function setupTitleAnimation(chapterElement) {
    const title = chapterElement.querySelector(".chapter-title");
    if (!title) {
      return;
    }

    title.classList.remove("active");
    title.classList.add("chapter-title-entrance");

    if (!state.effectsEnabled) {
      title.classList.add("active");
      return;
    }

    requestAnimationFrame(() => {
      title.classList.add("active");

      if (window.gsap) {
        window.gsap.fromTo(
          title,
          { opacity: 0, y: -24, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: "back.out(1.2)" }
        );
      }
    });
  }

  function setupPoetryTypewriter(chapterElement) {
    const poetryBlocks = Array.from(chapterElement.querySelectorAll(".poetic-text"));

    poetryBlocks.forEach((block) => {
      const lines = Array.from(block.querySelectorAll("p"));
      if (lines.length === 0) {
        return;
      }

      if (!state.effectsEnabled) {
        block.classList.remove("poetry-pending", "skip-mode");
        block.classList.add("revealed");
        block.dataset.poetryDone = "true";
        lines.forEach((line) => {
          line.style.opacity = "1";
          line.style.transform = "translateY(0)";
        });
        return;
      }

      block.classList.add("poetry-pending", "skip-mode");
      block.dataset.poetryDone = "false";

      const revealImmediately = () => {
        if (window.gsap) {
          window.gsap.killTweensOf(lines);
        }

        lines.forEach((line) => {
          line.style.opacity = "1";
          line.style.transform = "translateY(0)";
        });

        block.classList.remove("poetry-pending");
        block.classList.add("revealed");
        block.dataset.poetryDone = "true";
      };

      const runAnimation = () => {
        if (block.dataset.poetryDone === "true") {
          return;
        }

        if (window.gsap) {
          window.gsap.set(lines, { opacity: 0, y: 6 });
          window.gsap.to(lines, {
            opacity: 1,
            y: 0,
            duration: 0.32,
            stagger: 0.12,
            ease: "power2.out",
            onComplete: () => {
              block.classList.remove("poetry-pending");
              block.classList.add("revealed");
              block.dataset.poetryDone = "true";
            }
          });
        } else {
          revealImmediately();
        }
      };

      let trigger = null;
      let observer = null;

      if (window.ScrollTrigger && window.gsap) {
        trigger = window.ScrollTrigger.create({
          trigger: block,
          start: "top 80%",
          once: true,
          onEnter: runAnimation
        });
      } else {
        observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              runAnimation();
              observer.disconnect();
            }
          });
        }, { threshold: 0.2 });
        observer.observe(block);
      }

      const skipHandler = () => {
        if (block.dataset.poetryDone !== "true") {
          revealImmediately();
        }
      };

      block.addEventListener("click", skipHandler);

      registerCleanup(() => {
        trigger?.kill();
        observer?.disconnect();
        block.removeEventListener("click", skipHandler);
      });
    });
  }

  function setupBoldGrowAnimation(chapterElement) {
    const boldElements = Array.from(chapterElement.querySelectorAll(".bold-grow-1, .bold-grow-2, .bold-grow-3, .bold-grow-4"));

    if (boldElements.length === 0) {
      return;
    }

    const groupedByParent = new Map();
    boldElements.forEach((element) => {
      if (element.dataset.boldAnimated === "true") {
        return;
      }

      const parent = element.parentElement;
      if (!groupedByParent.has(parent)) {
        groupedByParent.set(parent, []);
      }
      groupedByParent.get(parent).push(element);
    });

    if (!state.effectsEnabled) {
      groupedByParent.forEach((group) => {
        group.forEach((element) => {
          element.classList.add("bold-grow-animated");
          element.dataset.boldAnimated = "true";
        });
      });
      return;
    }

    groupedByParent.forEach((group) => {
      const triggerElement = group[0];

      const animate = () => {
        group.forEach((element) => {
          element.classList.add("bold-grow-animated");
        });

        if (window.gsap) {
          window.gsap.fromTo(
            group,
            { opacity: 0.45, scale: 1 },
            {
              opacity: 1,
              scale: (_, target) => {
                const scale = Number.parseFloat(
                  getComputedStyle(target).getPropertyValue("--bold-grow-scale") || "1.05"
                );
                return Number.isFinite(scale) ? scale : 1.05;
              },
              duration: 0.55,
              stagger: 0.15,
              ease: "power2.out",
              onComplete: () => {
                group.forEach((element) => {
                  element.dataset.boldAnimated = "true";
                });
              }
            }
          );
        } else {
          group.forEach((element) => {
            element.dataset.boldAnimated = "true";
          });
        }
      };

      if (window.ScrollTrigger && window.gsap) {
        const trigger = window.ScrollTrigger.create({
          trigger: triggerElement,
          start: "top 85%",
          once: true,
          onEnter: animate
        });

        registerCleanup(() => {
          trigger.kill();
        });
      } else {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animate();
              observer.disconnect();
            }
          });
        }, { threshold: 0.3 });

        observer.observe(triggerElement);
        registerCleanup(() => observer.disconnect());
      }
    });
  }

  function collectLineAnchors(chapterElement) {
    const candidates = Array.from(
      chapterElement.querySelectorAll(
        ".book-section > h2, .book-section > h3, .book-section > p, .book-section li"
      )
    );

    const anchors = candidates.filter((element) => {
      return Boolean(element.textContent && element.textContent.trim().length > 0);
    });

    anchors.forEach((element, index) => {
      element.dataset.lineNumber = String(index + 1);
    });

    return anchors;
  }

  function getViewportLineNumber(anchors) {
    if (!anchors.length) {
      return 1;
    }

    const targetY = window.innerHeight * 0.45;
    let closestLine = 1;
    let minDistance = Number.POSITIVE_INFINITY;

    anchors.forEach((anchor) => {
      const rect = anchor.getBoundingClientRect();
      const midpoint = rect.top + (rect.height || 1) * 0.5;
      const distance = Math.abs(midpoint - targetY);
      if (distance < minDistance) {
        minDistance = distance;
        closestLine = Number.parseInt(anchor.dataset.lineNumber || "1", 10);
      }
    });

    return Number.isFinite(closestLine) ? closestLine : 1;
  }

  function resolveCueForLine(cues, lineNumber) {
    return cues.find((cue) => lineNumber >= cue.startLine && lineNumber <= cue.endLine) || null;
  }

  function calculateCueVolume(cue, lineNumber, type) {
    if (!cue) {
      return 0;
    }

    const targetVolume = type === "ambient" ? cue.ambientTargetVolume : cue.mainTargetVolume;
    const fadeInLines = Math.max(0, cue.fadeInLines || 0);
    const fadeOutLines = Math.max(0, cue.fadeOutLines || 0);

    let inGain = 1;
    let outGain = 1;

    if (fadeInLines > 0) {
      const progressIn = (lineNumber - cue.startLine + 1) / fadeInLines;
      inGain = clamp01(progressIn);
    }

    if (Number.isFinite(cue.endLine) && fadeOutLines > 0) {
      const progressOut = (cue.endLine - lineNumber + 1) / fadeOutLines;
      outGain = clamp01(progressOut);
    }

    return clamp01(targetVolume) * Math.min(inGain, outGain);
  }

  function setupLineCueAudio(chapterElement, chapterId) {
    const cues = getAudioCues(chapterId);
    const lineAnchors = collectLineAnchors(chapterElement);

    if (!lineAnchors.length || !cues.length) {
      const playDefaultAudio = async () => {
        await audioController.crossfadeTo(getAudioTrack(chapterId));
        await audioController.crossfadeAmbientTo(getAmbientTrack(chapterId));
        audioController.setMainVolume(0.85, 0.2);
        audioController.setAmbientVolume(0.2, 0.2);
      };

      state.resumeAudioSync = playDefaultAudio;
      void playDefaultAudio();

      registerCleanup(() => {
        if (state.resumeAudioSync === playDefaultAudio) {
          state.resumeAudioSync = null;
        }
      });
      return;
    }

    let rafScheduled = false;
    let destroyed = false;
    let lastCueId = "";

    const syncToViewportLine = async () => {
      if (destroyed) {
        return;
      }

      const lineNumber = getViewportLineNumber(lineAnchors);
      const cue = resolveCueForLine(cues, lineNumber);

      if (!cue) {
        audioController.pauseMain();
        await audioController.crossfadeAmbientTo(null, 0.8);
        if (destroyed) {
          return;
        }
        return;
      }

      if (cue.id !== lastCueId) {
        await audioController.crossfadeTo(cue.mainTrack, cue.crossfadeSeconds);
        if (destroyed) {
          return;
        }
        await audioController.crossfadeAmbientTo(cue.ambientTrack, cue.ambientCrossfadeSeconds);
        if (destroyed) {
          return;
        }
        lastCueId = cue.id;
      }

      if (destroyed) {
        return;
      }

      audioController.setMainVolume(calculateCueVolume(cue, lineNumber, "main"), 0.3);
      audioController.setAmbientVolume(calculateCueVolume(cue, lineNumber, "ambient"), 0.3);
    };

    state.resumeAudioSync = syncToViewportLine;

    const queueSync = () => {
      if (rafScheduled) {
        return;
      }

      rafScheduled = true;
      requestAnimationFrame(() => {
        rafScheduled = false;
        void syncToViewportLine();
      });
    };

    window.addEventListener("scroll", queueSync, { passive: true });
    window.addEventListener("resize", queueSync);

    void syncToViewportLine();

    registerCleanup(() => {
      destroyed = true;
      if (state.resumeAudioSync === syncToViewportLine) {
        state.resumeAudioSync = null;
      }
      window.removeEventListener("scroll", queueSync);
      window.removeEventListener("resize", queueSync);
    });
  }

  function applyHighlightToChapter(chapterElement, text) {
    if (!text) {
      return;
    }

    const walker = document.createTreeWalker(chapterElement, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.includes(text)) {
          return NodeFilter.FILTER_SKIP;
        }

        if (node.parentElement && node.parentElement.closest("mark")) {
          return NodeFilter.FILTER_SKIP;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let textNode = null;
    while ((textNode = walker.nextNode())) {
      const value = textNode.nodeValue;
      const matchIndex = value.indexOf(text);
      if (matchIndex === -1) {
        continue;
      }

      const before = value.slice(0, matchIndex);
      const match = value.slice(matchIndex, matchIndex + text.length);
      const after = value.slice(matchIndex + text.length);

      const fragment = document.createDocumentFragment();

      if (before) {
        fragment.appendChild(document.createTextNode(before));
      }

      const mark = document.createElement("mark");
      mark.textContent = match;
      fragment.appendChild(mark);

      if (after) {
        fragment.appendChild(document.createTextNode(after));
      }

      textNode.parentNode.replaceChild(fragment, textNode);
      break;
    }
  }

  function loadAndApplyHighlights(chapterId) {
    const chapterElement = elements.chapterContainer.querySelector(".chapter");
    if (!chapterElement) {
      return;
    }

    const relevantHighlights = state.highlights.filter((item) => item.chapterId === chapterId);
    relevantHighlights.forEach((highlight) => {
      applyHighlightToChapter(chapterElement, highlight.text);
    });
  }

  function highlightSelectedText() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    if (!selectedText) {
      selection.removeAllRanges();
      return;
    }

    const chapterElement = elements.chapterContainer.querySelector(".chapter");
    if (!chapterElement || !chapterElement.contains(range.commonAncestorContainer)) {
      selection.removeAllRanges();
      return;
    }

    try {
      const mark = document.createElement("mark");
      range.surroundContents(mark);

      if (state.currentChapterId) {
        state.highlights.push({ chapterId: state.currentChapterId, text: selectedText });
        localStorage.setItem("highlights", JSON.stringify(state.highlights));
      }
    } catch (error) {
      Logger.debug("Unable to apply highlight for complex range", error?.message || error);
      const chapterText = chapterElement.textContent || "";
      if (chapterText.includes(selectedText) && state.currentChapterId) {
        state.highlights.push({ chapterId: state.currentChapterId, text: selectedText });
        localStorage.setItem("highlights", JSON.stringify(state.highlights));
        loadAndApplyHighlights(state.currentChapterId);
      }
    }

    selection.removeAllRanges();
  }

  function setupGiscus() {
    if (!elements.giscusContainer || !elements.giscusPlaceholder) {
      return;
    }

    const giscusConfig = SITE_CONFIG?.giscus || {};
    const requiredValues = [giscusConfig.repo, giscusConfig.repoId, giscusConfig.categoryId];
    const configured = requiredValues.every((value) => {
      return Boolean(value) && !String(value).includes("REPLACE") && !String(value).includes("[");
    });

    if (!configured) {
      elements.giscusPlaceholder.classList.remove("hidden");
      return;
    }

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.setAttribute("data-repo", giscusConfig.repo);
    script.setAttribute("data-repo-id", giscusConfig.repoId);
    script.setAttribute("data-category", giscusConfig.category || "General");
    script.setAttribute("data-category-id", giscusConfig.categoryId);
    script.setAttribute("data-mapping", giscusConfig.mapping || "title");
    script.setAttribute("data-strict", giscusConfig.strict || "0");
    script.setAttribute("data-reactions-enabled", giscusConfig.reactionsEnabled || "1");
    script.setAttribute("data-emit-metadata", giscusConfig.emitMetadata || "0");
    script.setAttribute("data-input-position", giscusConfig.inputPosition || "top");
    script.setAttribute("data-theme", giscusConfig.theme || "dark");
    script.setAttribute("data-lang", giscusConfig.lang || "en");
    script.setAttribute("data-loading", giscusConfig.loading || "lazy");
    script.setAttribute("crossorigin", "anonymous");
    script.async = true;

    elements.giscusContainer.replaceChildren(script);
    elements.giscusPlaceholder.classList.add("hidden");
  }

  async function setupChapterExperience(chapterId, chapterTitle) {
    const chapterElement = elements.chapterContainer.querySelector(".chapter");
    if (!chapterElement) {
      return;
    }

    applyTheme(chapterId);
    updateChapterFooter(chapterTitle);
    updateNavigationButtons(chapterId);

    initParallax(chapterId);
    setupTitleAnimation(chapterElement);
    setupParagraphAnimations(chapterElement);
    setupPoetryTypewriter(chapterElement);
    setupBoldGrowAnimation(chapterElement);
    setupLineCueAudio(chapterElement, chapterId);

    await particleController.updateForChapter(chapterId);

    loadAndApplyHighlights(chapterId);
  }

  async function showChapter(chapterId, shouldScrollToTop = true) {
    const chapterMeta = state.chapterManifest.find((entry) => entry.id === chapterId);
    if (!chapterMeta) {
      Logger.error(`Chapter ${chapterId} not found in manifest.`);
      return;
    }

    await transitionOutCurrentChapter();

    resetChapterEffects();

    try {
      const markup = await fetchChapterMarkup(chapterId);
      if (!markup) {
        return;
      }

      elements.chapterContainer.innerHTML = markup;

      const chapterElement = elements.chapterContainer.querySelector(".chapter");
      if (chapterElement) {
        chapterElement.classList.add("fading-in");
        requestAnimationFrame(() => {
          chapterElement.classList.add("is-visible");
        });
      }

      state.currentChapterId = chapterId;
      elements.chapterSelector.value = chapterId;
      localStorage.setItem("selectedChapter", chapterId);

      await setupChapterExperience(chapterId, chapterMeta.title);

      if (shouldScrollToTop) {
        window.scrollTo({ top: 0, behavior: "auto" });
      }

      updatePageNumber();
    } catch (error) {
      Logger.error(error?.message || error);
      elements.chapterContainer.innerHTML = `<p>Failed to load ${chapterMeta.file}. Run this project from an HTTP server (not file://).</p>`;
    }
  }

  function navigateChapter(direction) {
    if (state.chapterManifest.length === 0) {
      return;
    }

    const index = state.chapterManifest.findIndex((entry) => entry.id === elements.chapterSelector.value);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= state.chapterManifest.length) {
      return;
    }

    const nextChapter = state.chapterManifest[nextIndex];
    showChapter(nextChapter.id, true);
  }

  async function loadManifestAndBoot() {
    try {
      const response = await fetch("chapters/index.json");
      if (!response.ok) {
        throw new Error(`Manifest fetch failed: ${response.status}`);
      }

      state.chapterManifest = await response.json();
      populateChapterDropdown();

      const savedChapter = localStorage.getItem("selectedChapter");
      const initialChapter = state.chapterManifest.find((entry) => entry.id === savedChapter)
        ? savedChapter
        : state.chapterManifest[0]?.id;

      if (!initialChapter) {
        throw new Error("Manifest is empty.");
      }

      await showChapter(initialChapter, false);

      const savedScroll = Number.parseInt(localStorage.getItem("scrollPosition") || "0", 10);
      if (Number.isFinite(savedScroll) && savedScroll > 0) {
        setTimeout(() => {
          window.scrollTo(0, savedScroll);
          updatePageNumber();
        }, 120);
      }
    } catch (error) {
      Logger.error(
        `${error?.message || error}. Note: fetch() requires a local HTTP server. file:// protocol will not work.`
      );
      elements.chapterContainer.innerHTML = "<p>Unable to load chapter manifest. Start a local HTTP server and reload.</p>";
    }
  }

  function applyEffectsPreference(enabled) {
    state.effectsEnabled = enabled;
    localStorage.setItem("effectsEnabled", enabled ? "true" : "false");
    document.body.classList.toggle("effects-disabled", !enabled);

    if (elements.effectsButton) {
      elements.effectsButton.textContent = enabled ? "Effects On" : "Effects Off";
    }
  }

  function showAudioUnlockPrompt() {
    if (!elements.audioUnlockPrompt || !isMobile) {
      return;
    }

    elements.audioUnlockPrompt.classList.remove("hidden");
  }

  function hideAudioUnlockPrompt() {
    if (!elements.audioUnlockPrompt) {
      return;
    }

    elements.audioUnlockPrompt.classList.add("hidden");
  }

  function initializeDarkMode() {
    const darkModeEnabled = localStorage.getItem("darkMode") === "enabled";
    document.body.classList.toggle("dark-mode", darkModeEnabled);
    elements.darkModeButton.textContent = darkModeEnabled ? "Light" : "Dark";
  }

  function initializeMuteState() {
    const muted = localStorage.getItem("audioMuted") === "true";
    audioController.setMuted(muted);
    elements.muteButton.textContent = muted ? "Unmute" : "Mute";
  }

  function initializeEffectsState() {
    const effectsEnabled = localStorage.getItem("effectsEnabled") !== "false";
    applyEffectsPreference(effectsEnabled);
  }

  elements.chapterSelector.addEventListener("change", () => {
    showChapter(elements.chapterSelector.value, true);
  });

  elements.prevButton.addEventListener("click", () => {
    navigateChapter(-1);
  });

  elements.nextButton.addEventListener("click", () => {
    navigateChapter(1);
  });

  elements.darkModeButton.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const enabled = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", enabled ? "enabled" : "disabled");
    elements.darkModeButton.textContent = enabled ? "Light" : "Dark";
  });

  elements.muteButton.addEventListener("click", () => {
    const muted = !(localStorage.getItem("audioMuted") === "true");
    localStorage.setItem("audioMuted", muted ? "true" : "false");
    audioController.setMuted(muted);
    elements.muteButton.textContent = muted ? "Unmute" : "Mute";

    if (muted) {
      hideAudioUnlockPrompt();
    }
  });

  if (elements.effectsButton) {
    elements.effectsButton.addEventListener("click", async () => {
      const nextEnabled = !state.effectsEnabled;
      applyEffectsPreference(nextEnabled);

      if (!state.currentChapterId) {
        return;
      }

      const chapterMeta = state.chapterManifest.find((entry) => entry.id === state.currentChapterId);
      resetChapterEffects();
      await setupChapterExperience(state.currentChapterId, chapterMeta?.title || "Untitled");
    });
  }

  if (elements.audioUnlockButton) {
    elements.audioUnlockButton.addEventListener("click", async () => {
      hideAudioUnlockPrompt();

      if (!state.currentChapterId || audioController.isMuted) {
        return;
      }

      if (typeof state.resumeAudioSync === "function") {
        await state.resumeAudioSync();
        return;
      }

      await audioController.crossfadeTo(getAudioTrack(state.currentChapterId));
      await audioController.crossfadeAmbientTo(getAmbientTrack(state.currentChapterId));
    });
  }

  elements.highlightButton.addEventListener("click", highlightSelectedText);

  window.addEventListener("scroll", () => {
    updatePageNumber();
    saveScrollPosition();
  }, { passive: true });

  window.addEventListener("resize", () => {
    updatePageNumber();
  });

  initializeDarkMode();
  initializeMuteState();
  initializeEffectsState();
  setupGiscus();
  await loadManifestAndBoot();
});

