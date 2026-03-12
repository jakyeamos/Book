const DEFAULT_THEME = {
  accentColor: "#9aa6b2",
  backgroundTint: "rgba(17, 24, 39, 0.62)",
  backgroundImage: "linear-gradient(140deg, #0f172a 0%, #1f2937 45%, #374151 100%)",
  transitionDuration: 0.5,
  backgroundLayers: []
};

const BASE_AUDIO = {
  mainTrack: "assets/music/Eva_Angelina.mp3",
  ambientTrack: null,
  lineCues: []
};

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export const PARTICLE_PRESETS = {
  none: null,
  dust: {
    fullScreen: { enable: true, zIndex: 0 },
    particles: {
      number: { value: 90, density: { enable: true, area: 900 } },
      color: { value: "#d9d2bf" },
      opacity: { value: { min: 0.08, max: 0.28 } },
      size: { value: { min: 1, max: 3 } },
      move: { enable: true, speed: 0.4, direction: "top", random: true, outModes: { default: "out" } }
    },
    detectRetina: true
  },
  rain: {
    fullScreen: { enable: true, zIndex: 0 },
    particles: {
      number: { value: 120, density: { enable: true, area: 900 } },
      color: { value: "#9caecf" },
      opacity: { value: { min: 0.2, max: 0.45 } },
      shape: { type: "line" },
      size: { value: { min: 7, max: 16 } },
      rotate: { value: 15 },
      move: { enable: true, speed: 5.5, direction: "bottom", straight: true, outModes: { default: "out" } }
    },
    detectRetina: true
  },
  embers: {
    fullScreen: { enable: true, zIndex: 0 },
    particles: {
      number: { value: 70, density: { enable: true, area: 900 } },
      color: { value: ["#ff5a2a", "#ff9b42", "#ffd39a"] },
      opacity: { value: { min: 0.2, max: 0.55 } },
      size: { value: { min: 1, max: 4 } },
      move: { enable: true, speed: 1.1, direction: "top", random: true, outModes: { default: "out" } }
    },
    detectRetina: true
  },
  snow: {
    fullScreen: { enable: true, zIndex: 0 },
    particles: {
      number: { value: 100, density: { enable: true, area: 900 } },
      color: { value: "#f5f8ff" },
      opacity: { value: { min: 0.2, max: 0.45 } },
      size: { value: { min: 1, max: 4 } },
      move: { enable: true, speed: 1.5, direction: "bottom", random: true, outModes: { default: "out" } }
    },
    detectRetina: true
  },
  stars: {
    fullScreen: { enable: true, zIndex: 0 },
    particles: {
      number: { value: 60, density: { enable: true, area: 900 } },
      color: { value: ["#f8fafc", "#cbd5e1"] },
      opacity: {
        value: { min: 0.15, max: 0.7 },
        animation: { enable: true, speed: 0.6, minimumValue: 0.08, sync: false }
      },
      size: { value: { min: 1, max: 3 } },
      move: { enable: false }
    },
    detectRetina: true
  }
};

const LAYER_LIBRARY = {
  chapter1: [
    { fallback: "linear-gradient(180deg, rgba(161,174,187,0.26), rgba(30,41,59,0.08))", speed: 0.18, zIndex: -3, opacity: 0.5 },
    { fallback: "linear-gradient(180deg, rgba(59,74,92,0.44), rgba(2,6,23,0.2))", speed: 0.32, zIndex: -2, opacity: 0.52 }
  ],
  chapter2: [
    { fallback: "linear-gradient(180deg, rgba(66,95,114,0.34), rgba(15,23,42,0.12))", speed: 0.22, zIndex: -3, opacity: 0.54 },
    { fallback: "linear-gradient(180deg, rgba(28,37,57,0.48), rgba(15,23,42,0.28))", speed: 0.4, zIndex: -2, opacity: 0.48 }
  ],
  chapter3: [
    { fallback: "linear-gradient(180deg, rgba(145,122,103,0.38), rgba(50,33,25,0.12))", speed: 0.16, zIndex: -3, opacity: 0.4 }
  ],
  chapter4: [
    { fallback: "linear-gradient(180deg, rgba(236,190,126,0.26), rgba(83,58,44,0.12))", speed: 0.16, zIndex: -3, opacity: 0.45 }
  ],
  chapter5: [
    { fallback: "linear-gradient(180deg, rgba(240,176,89,0.26), rgba(117,69,31,0.12))", speed: 0.16, zIndex: -3, opacity: 0.45 }
  ],
  chapter6: [
    { fallback: "linear-gradient(180deg, rgba(59,74,112,0.28), rgba(15,23,42,0.1))", speed: 0.18, zIndex: -3, opacity: 0.46 }
  ],
  chapter7: [
    { fallback: "linear-gradient(180deg, rgba(130,139,155,0.24), rgba(38,45,64,0.15))", speed: 0.2, zIndex: -3, opacity: 0.5 }
  ],
  chapter8: [
    { fallback: "linear-gradient(180deg, rgba(202,164,121,0.22), rgba(72,48,33,0.1))", speed: 0.18, zIndex: -3, opacity: 0.48 }
  ],
  chapter9: [
    { fallback: "linear-gradient(180deg, rgba(250,218,170,0.22), rgba(106,73,45,0.11))", speed: 0.18, zIndex: -3, opacity: 0.48 }
  ],
  chapter10: [
    { fallback: "linear-gradient(180deg, rgba(231,204,158,0.2), rgba(80,62,45,0.12))", speed: 0.2, zIndex: -3, opacity: 0.48 }
  ],
  chapter15: [
    { fallback: "linear-gradient(180deg, rgba(91,43,66,0.28), rgba(38,20,31,0.12))", speed: 0.22, zIndex: -3, opacity: 0.52 }
  ]
};

export const CHAPTERS = {
  chapter1: {
    metadata: { number: 1, title: "The Ritual", pov: "Xander" },
    theme: {
      accentColor: "#8fa4b8",
      backgroundTint: "rgba(36, 48, 67, 0.6)",
      backgroundImage: "linear-gradient(145deg, #0f172a 0%, #1e293b 45%, #334155 100%)",
      transitionDuration: 0.55,
      backgroundLayers: LAYER_LIBRARY.chapter1
    },
    audio: {
      mainTrack: "assets/music/Eva_Angelina.mp3",
      ambientTrack: null,
      lineCues: [
        {
          id: "ritual-intro",
          startLine: 1,
          endLine: 90,
          mainTrack: "assets/music/Eva_Angelina.mp3",
          ambientTrack: null,
          fadeInLines: 10,
          fadeOutLines: 14,
          mainTargetVolume: 0.82,
          ambientTargetVolume: 0.16,
          crossfadeSeconds: 1.2,
          ambientCrossfadeSeconds: 1.0
        },
        {
          id: "ritual-build",
          startLine: 91,
          endLine: 220,
          mainTrack: "assets/music/Mojo_Pin.mp3",
          ambientTrack: null,
          fadeInLines: 16,
          fadeOutLines: 14,
          mainTargetVolume: 0.88,
          ambientTargetVolume: 0.2,
          crossfadeSeconds: 1.3,
          ambientCrossfadeSeconds: 1.0
        },
        {
          id: "ritual-descent",
          startLine: 221,
          endLine: null,
          mainTrack: "assets/music/Rose_Parade.mp3",
          ambientTrack: null,
          fadeInLines: 14,
          fadeOutLines: 20,
          mainTargetVolume: 0.8,
          ambientTargetVolume: 0.18,
          crossfadeSeconds: 1.4,
          ambientCrossfadeSeconds: 1.2
        }
      ]
    },
    particles: { type: "dust", count: 90 }
  },
  chapter2: {
    metadata: { number: 2, title: "The Routine", pov: "Nico" },
    theme: {
      accentColor: "#7ea0a3",
      backgroundTint: "rgba(31, 53, 57, 0.62)",
      backgroundImage: "linear-gradient(135deg, #102a43 0%, #243b53 45%, #334e68 100%)",
      transitionDuration: 0.55,
      backgroundLayers: LAYER_LIBRARY.chapter2
    },
    audio: {
      mainTrack: "assets/music/Mojo_Pin.mp3",
      ambientTrack: null,
      lineCues: [
        {
          id: "routine-precision",
          startLine: 1,
          endLine: 120,
          mainTrack: "assets/music/Mojo_Pin.mp3",
          ambientTrack: null,
          fadeInLines: 8,
          fadeOutLines: 12,
          mainTargetVolume: 0.86,
          ambientTargetVolume: 0.2,
          crossfadeSeconds: 1.1,
          ambientCrossfadeSeconds: 0.9
        },
        {
          id: "routine-tension",
          startLine: 121,
          endLine: 260,
          mainTrack: "assets/music/Rose_Parade.mp3",
          ambientTrack: null,
          fadeInLines: 12,
          fadeOutLines: 12,
          mainTargetVolume: 0.9,
          ambientTargetVolume: 0.22,
          crossfadeSeconds: 1.25,
          ambientCrossfadeSeconds: 1.0
        },
        {
          id: "routine-release",
          startLine: 261,
          endLine: null,
          mainTrack: "assets/music/Eva_Angelina.mp3",
          ambientTrack: null,
          fadeInLines: 10,
          fadeOutLines: 14,
          mainTargetVolume: 0.82,
          ambientTargetVolume: 0.18,
          crossfadeSeconds: 1.3,
          ambientCrossfadeSeconds: 1.1
        }
      ]
    },
    particles: { type: "rain", count: 120 }
  },
  chapter3: {
    metadata: { number: 3, title: "Left Alone", pov: "Nico" },
    theme: {
      accentColor: "#af8f74",
      backgroundTint: "rgba(73, 49, 38, 0.58)",
      backgroundImage: "linear-gradient(150deg, #3f2f28 0%, #6c4f3d 55%, #8f6f58 100%)",
      backgroundLayers: LAYER_LIBRARY.chapter3
    },
    audio: {
      mainTrack: "assets/music/Rose_Parade.mp3",
      ambientTrack: null,
      lineCues: [
        {
          id: "left-alone-warmth",
          startLine: 1,
          endLine: 70,
          mainTrack: "assets/music/Eva_Angelina.mp3",
          ambientTrack: null,
          fadeInLines: 8,
          fadeOutLines: 12,
          mainTargetVolume: 0.8,
          ambientTargetVolume: 0.14,
          crossfadeSeconds: 1.1,
          ambientCrossfadeSeconds: 0.9
        },
        {
          id: "left-alone-fracture",
          startLine: 71,
          endLine: 175,
          mainTrack: "assets/music/Mojo_Pin.mp3",
          ambientTrack: null,
          fadeInLines: 12,
          fadeOutLines: 14,
          mainTargetVolume: 0.9,
          ambientTargetVolume: 0.22,
          crossfadeSeconds: 1.3,
          ambientCrossfadeSeconds: 1.0
        },
        {
          id: "left-alone-fallout",
          startLine: 176,
          endLine: null,
          mainTrack: "assets/music/Rose_Parade.mp3",
          ambientTrack: null,
          fadeInLines: 14,
          fadeOutLines: 18,
          mainTargetVolume: 0.82,
          ambientTargetVolume: 0.16,
          crossfadeSeconds: 1.4,
          ambientCrossfadeSeconds: 1.2
        }
      ]
    },
    particles: { type: "none", count: 0 }
  },
  chapter4: {
    metadata: { number: 4, title: "A Library for One", pov: "Nico" },
    theme: {
      accentColor: "#e0b679",
      backgroundTint: "rgba(84, 59, 36, 0.54)",
      backgroundImage: "linear-gradient(145deg, #4b3622 0%, #805d39 52%, #b08b56 100%)",
      backgroundLayers: LAYER_LIBRARY.chapter4
    },
    audio: {
      mainTrack: "assets/music/Eva_Angelina.mp3",
      ambientTrack: null,
      lineCues: [
        {
          id: "library-rhythm",
          startLine: 1,
          endLine: 95,
          mainTrack: "assets/music/Eva_Angelina.mp3",
          ambientTrack: null,
          fadeInLines: 10,
          fadeOutLines: 12,
          mainTargetVolume: 0.78,
          ambientTargetVolume: 0.14,
          crossfadeSeconds: 1.1,
          ambientCrossfadeSeconds: 0.9
        },
        {
          id: "library-connection",
          startLine: 96,
          endLine: 190,
          mainTrack: "assets/music/Rose_Parade.mp3",
          ambientTrack: null,
          fadeInLines: 12,
          fadeOutLines: 12,
          mainTargetVolume: 0.84,
          ambientTargetVolume: 0.16,
          crossfadeSeconds: 1.2,
          ambientCrossfadeSeconds: 1.0
        },
        {
          id: "library-home-static",
          startLine: 191,
          endLine: null,
          mainTrack: "assets/music/Mojo_Pin.mp3",
          ambientTrack: null,
          fadeInLines: 14,
          fadeOutLines: 16,
          mainTargetVolume: 0.9,
          ambientTargetVolume: 0.2,
          crossfadeSeconds: 1.3,
          ambientCrossfadeSeconds: 1.1
        }
      ]
    },
    particles: { type: "none", count: 0 }
  },
  chapter5: {
    metadata: { number: 5, title: "The Girl with the Hammer", pov: "Nico" },
    theme: {
      accentColor: "#f1c27d",
      backgroundTint: "rgba(110, 67, 28, 0.5)",
      backgroundImage: "linear-gradient(145deg, #4a2f17 0%, #7d4a21 52%, #b76a25 100%)",
      backgroundLayers: LAYER_LIBRARY.chapter5
    },
    audio: {
      mainTrack: "assets/music/Eva_Angelina.mp3",
      ambientTrack: null,
      lineCues: [
        {
          id: "hammer-bright",
          startLine: 1,
          endLine: 90,
          mainTrack: "assets/music/Eva_Angelina.mp3",
          ambientTrack: null,
          fadeInLines: 8,
          fadeOutLines: 12,
          mainTargetVolume: 0.82,
          ambientTargetVolume: 0.14,
          crossfadeSeconds: 1.1,
          ambientCrossfadeSeconds: 0.9
        },
        {
          id: "hammer-pressure",
          startLine: 91,
          endLine: 210,
          mainTrack: "assets/music/Mojo_Pin.mp3",
          ambientTrack: null,
          fadeInLines: 12,
          fadeOutLines: 14,
          mainTargetVolume: 0.9,
          ambientTargetVolume: 0.22,
          crossfadeSeconds: 1.3,
          ambientCrossfadeSeconds: 1.0
        },
        {
          id: "hammer-afterglow",
          startLine: 211,
          endLine: null,
          mainTrack: "assets/music/Rose_Parade.mp3",
          ambientTrack: null,
          fadeInLines: 14,
          fadeOutLines: 16,
          mainTargetVolume: 0.84,
          ambientTargetVolume: 0.16,
          crossfadeSeconds: 1.3,
          ambientCrossfadeSeconds: 1.1
        }
      ]
    },
    particles: { type: "none", count: 0 }
  },
  chapter6: {
    metadata: { number: 6, title: "Hope", pov: "Nico" },
    theme: {
      accentColor: "#6f86b7",
      backgroundTint: "rgba(35, 45, 74, 0.6)",
      backgroundImage: "linear-gradient(145deg, #13233a 0%, #2e4a73 52%, #5574a0 100%)",
      backgroundLayers: LAYER_LIBRARY.chapter6
    },
    audio: {
      mainTrack: "assets/music/Rose_Parade.mp3",
      ambientTrack: null,
      lineCues: [
        {
          id: "hope-rise",
          startLine: 1,
          endLine: 85,
          mainTrack: "assets/music/Eva_Angelina.mp3",
          ambientTrack: null,
          fadeInLines: 8,
          fadeOutLines: 10,
          mainTargetVolume: 0.8,
          ambientTargetVolume: 0.14,
          crossfadeSeconds: 1.1,
          ambientCrossfadeSeconds: 0.9
        },
        {
          id: "hope-fragile",
          startLine: 86,
          endLine: 175,
          mainTrack: "assets/music/Rose_Parade.mp3",
          ambientTrack: null,
          fadeInLines: 10,
          fadeOutLines: 12,
          mainTargetVolume: 0.84,
          ambientTargetVolume: 0.16,
          crossfadeSeconds: 1.2,
          ambientCrossfadeSeconds: 1.0
        },
        {
          id: "hope-collapse",
          startLine: 176,
          endLine: null,
          mainTrack: "assets/music/Mojo_Pin.mp3",
          ambientTrack: null,
          fadeInLines: 12,
          fadeOutLines: 16,
          mainTargetVolume: 0.9,
          ambientTargetVolume: 0.22,
          crossfadeSeconds: 1.35,
          ambientCrossfadeSeconds: 1.1
        }
      ]
    },
    particles: { type: "none", count: 0 }
  },
  chapter7: {
    metadata: { number: 7, title: "All Good Things", pov: "Nico" },
    theme: {
      accentColor: "#9aa3ad",
      backgroundTint: "rgba(43, 51, 64, 0.6)",
      backgroundImage: "linear-gradient(145deg, #1f2733 0%, #3d4a5c 55%, #5f6f83 100%)",
      backgroundLayers: LAYER_LIBRARY.chapter7
    },
    audio: {
      mainTrack: "assets/music/Rose_Parade.mp3",
      ambientTrack: null,
      lineCues: [
        {
          id: "all-good-light",
          startLine: 1,
          endLine: 120,
          mainTrack: "assets/music/Eva_Angelina.mp3",
          ambientTrack: null,
          fadeInLines: 10,
          fadeOutLines: 12,
          mainTargetVolume: 0.78,
          ambientTargetVolume: 0.14,
          crossfadeSeconds: 1.1,
          ambientCrossfadeSeconds: 0.9
        },
        {
          id: "all-good-impact",
          startLine: 121,
          endLine: 260,
          mainTrack: "assets/music/Mojo_Pin.mp3",
          ambientTrack: null,
          fadeInLines: 14,
          fadeOutLines: 14,
          mainTargetVolume: 0.92,
          ambientTargetVolume: 0.24,
          crossfadeSeconds: 1.35,
          ambientCrossfadeSeconds: 1.1
        },
        {
          id: "all-good-ash",
          startLine: 261,
          endLine: null,
          mainTrack: "assets/music/Rose_Parade.mp3",
          ambientTrack: null,
          fadeInLines: 12,
          fadeOutLines: 18,
          mainTargetVolume: 0.82,
          ambientTargetVolume: 0.18,
          crossfadeSeconds: 1.4,
          ambientCrossfadeSeconds: 1.2
        }
      ]
    },
    particles: { type: "stars", count: 70 }
  },
  chapter8: {
    metadata: { number: 8, title: "Static Between Stations", pov: "Nico" },
    theme: {
      accentColor: "#c7a67e",
      backgroundTint: "rgba(71, 52, 35, 0.58)",
      backgroundImage: "linear-gradient(145deg, #2d2b33 0%, #5c4f4c 52%, #8a7a66 100%)",
      backgroundLayers: LAYER_LIBRARY.chapter8
    },
    audio: {
      mainTrack: "assets/music/Mojo_Pin.mp3",
      ambientTrack: null,
      lineCues: [
        {
          id: "static-call",
          startLine: 1,
          endLine: 140,
          mainTrack: "assets/music/Mojo_Pin.mp3",
          ambientTrack: null,
          fadeInLines: 10,
          fadeOutLines: 12,
          mainTargetVolume: 0.88,
          ambientTargetVolume: 0.22,
          crossfadeSeconds: 1.2,
          ambientCrossfadeSeconds: 1.0
        },
        {
          id: "static-soften",
          startLine: 141,
          endLine: 280,
          mainTrack: "assets/music/Eva_Angelina.mp3",
          ambientTrack: null,
          fadeInLines: 12,
          fadeOutLines: 14,
          mainTargetVolume: 0.8,
          ambientTargetVolume: 0.16,
          crossfadeSeconds: 1.2,
          ambientCrossfadeSeconds: 1.0
        },
        {
          id: "static-frayed",
          startLine: 281,
          endLine: null,
          mainTrack: "assets/music/Rose_Parade.mp3",
          ambientTrack: null,
          fadeInLines: 14,
          fadeOutLines: 16,
          mainTargetVolume: 0.84,
          ambientTargetVolume: 0.18,
          crossfadeSeconds: 1.3,
          ambientCrossfadeSeconds: 1.1
        }
      ]
    },
    particles: { type: "dust", count: 75 }
  },
  chapter9: {
    metadata: { number: 9, title: "Golden", pov: "Gianna" },
    theme: {
      accentColor: "#e7c98b",
      backgroundTint: "rgba(101, 73, 45, 0.52)",
      backgroundImage: "linear-gradient(145deg, #3b2a1f 0%, #7a5f42 52%, #c2a77a 100%)",
      backgroundLayers: LAYER_LIBRARY.chapter9
    },
    audio: {
      mainTrack: "assets/music/Rose_Parade.mp3",
      ambientTrack: null,
      lineCues: [
        {
          id: "golden-performance",
          startLine: 1,
          endLine: 120,
          mainTrack: "assets/music/Eva_Angelina.mp3",
          ambientTrack: null,
          fadeInLines: 10,
          fadeOutLines: 10,
          mainTargetVolume: 0.78,
          ambientTargetVolume: 0.16,
          crossfadeSeconds: 1.1,
          ambientCrossfadeSeconds: 0.9
        },
        {
          id: "golden-cracks",
          startLine: 121,
          endLine: 260,
          mainTrack: "assets/music/Mojo_Pin.mp3",
          ambientTrack: null,
          fadeInLines: 12,
          fadeOutLines: 12,
          mainTargetVolume: 0.9,
          ambientTargetVolume: 0.22,
          crossfadeSeconds: 1.3,
          ambientCrossfadeSeconds: 1.0
        },
        {
          id: "golden-mask",
          startLine: 261,
          endLine: null,
          mainTrack: "assets/music/Rose_Parade.mp3",
          ambientTrack: null,
          fadeInLines: 14,
          fadeOutLines: 16,
          mainTargetVolume: 0.84,
          ambientTargetVolume: 0.18,
          crossfadeSeconds: 1.3,
          ambientCrossfadeSeconds: 1.1
        }
      ]
    },
    particles: { type: "embers", count: 65 }
  },
  chapter10: {
    metadata: { number: 10, title: "Gianna's Week", pov: "Gianna" },
    theme: {
      accentColor: "#d9b989",
      backgroundTint: "rgba(93, 72, 49, 0.5)",
      backgroundImage: "linear-gradient(145deg, #2e2a2f 0%, #635348 54%, #a58a70 100%)",
      backgroundLayers: LAYER_LIBRARY.chapter10
    },
    audio: {
      mainTrack: "assets/music/Rose_Parade.mp3",
      ambientTrack: null,
      lineCues: [
        {
          id: "week-monday-flow",
          startLine: 1,
          endLine: 110,
          mainTrack: "assets/music/Eva_Angelina.mp3",
          ambientTrack: null,
          fadeInLines: 8,
          fadeOutLines: 10,
          mainTargetVolume: 0.8,
          ambientTargetVolume: 0.15,
          crossfadeSeconds: 1.1,
          ambientCrossfadeSeconds: 0.9
        },
        {
          id: "week-mid-pressure",
          startLine: 111,
          endLine: 250,
          mainTrack: "assets/music/Rose_Parade.mp3",
          ambientTrack: null,
          fadeInLines: 12,
          fadeOutLines: 12,
          mainTargetVolume: 0.86,
          ambientTargetVolume: 0.18,
          crossfadeSeconds: 1.2,
          ambientCrossfadeSeconds: 1.0
        },
        {
          id: "week-threshold",
          startLine: 251,
          endLine: null,
          mainTrack: "assets/music/Mojo_Pin.mp3",
          ambientTrack: null,
          fadeInLines: 14,
          fadeOutLines: 16,
          mainTargetVolume: 0.9,
          ambientTargetVolume: 0.22,
          crossfadeSeconds: 1.3,
          ambientCrossfadeSeconds: 1.1
        }
      ]
    },
    particles: { type: "dust", count: 70 }
  },
  chapter15: {
    metadata: { number: 15, title: "Blackberries", pov: "Xander" },
    theme: {
      accentColor: "#8b4b64",
      backgroundTint: "rgba(56, 28, 44, 0.62)",
      backgroundImage: "linear-gradient(145deg, #1f1020 0%, #4a1f36 52%, #7e3958 100%)",
      backgroundLayers: LAYER_LIBRARY.chapter15
    },
    audio: {
      mainTrack: "assets/music/Eva_Angelina.mp3",
      ambientTrack: null,
      lineCues: [
        {
          id: "blackberries-memory",
          startLine: 1,
          endLine: 45,
          mainTrack: "assets/music/Eva_Angelina.mp3",
          ambientTrack: null,
          fadeInLines: 6,
          fadeOutLines: 8,
          mainTargetVolume: 0.78,
          ambientTargetVolume: 0.14,
          crossfadeSeconds: 1.0,
          ambientCrossfadeSeconds: 0.8
        },
        {
          id: "blackberries-stain",
          startLine: 46,
          endLine: 95,
          mainTrack: "assets/music/Rose_Parade.mp3",
          ambientTrack: null,
          fadeInLines: 8,
          fadeOutLines: 8,
          mainTargetVolume: 0.84,
          ambientTargetVolume: 0.16,
          crossfadeSeconds: 1.1,
          ambientCrossfadeSeconds: 0.9
        },
        {
          id: "blackberries-poem-tail",
          startLine: 96,
          endLine: null,
          mainTrack: "assets/music/Mojo_Pin.mp3",
          ambientTrack: null,
          fadeInLines: 10,
          fadeOutLines: 12,
          mainTargetVolume: 0.82,
          ambientTargetVolume: 0.14,
          crossfadeSeconds: 1.2,
          ambientCrossfadeSeconds: 1.0
        }
      ]
    },
    particles: { type: "stars", count: 60 }
  }
};

export const SITE_CONFIG = {
  giscus: {
    repo: "jakyeamos/Book",
    repoId: "R_kgDON7yUpw",
    category: "General",
    categoryId: "DIC_kwDON7yUp84C4Klc",
    mapping: "title",
    strict: "0",
    reactionsEnabled: "1",
    emitMetadata: "0",
    inputPosition: "top",
    theme: "dark",
    themeDirectory: "/assets/giscus-themes",
    lang: "en",
    loading: "lazy"
  }
};

export function getChapterConfig(chapterId) {
  return CHAPTERS[chapterId] || null;
}

export function getChapterTheme(chapterId) {
  const chapter = getChapterConfig(chapterId);
  return {
    ...DEFAULT_THEME,
    ...(chapter?.theme || {})
  };
}

export function getChapterMetadata(chapterId) {
  const chapter = getChapterConfig(chapterId);
  return chapter?.metadata || { number: 0, title: "Untitled", pov: "Unknown" };
}

export function getAudioTrack(chapterId) {
  const chapter = getChapterConfig(chapterId);
  return chapter?.audio?.mainTrack || BASE_AUDIO.mainTrack;
}

export function getAmbientTrack(chapterId) {
  const chapter = getChapterConfig(chapterId);
  return chapter?.audio?.ambientTrack ?? null;
}

function normalizeCue(cue, fallbackMainTrack, fallbackAmbientTrack, index) {
  const startLine = Number.isFinite(cue?.startLine) ? Math.max(1, Math.floor(cue.startLine)) : 1;
  const endLine = cue?.endLine === null || cue?.endLine === undefined
    ? Infinity
    : (Number.isFinite(cue.endLine) ? Math.max(startLine, Math.floor(cue.endLine)) : Infinity);

  return {
    id: cue?.id || `cue-${index + 1}`,
    startLine,
    endLine,
    mainTrack: cue?.mainTrack ?? cue?.track ?? fallbackMainTrack ?? null,
    ambientTrack: cue?.ambientTrack ?? fallbackAmbientTrack ?? null,
    fadeInLines: Number.isFinite(cue?.fadeInLines) ? Math.max(0, Math.floor(cue.fadeInLines)) : 8,
    fadeOutLines: Number.isFinite(cue?.fadeOutLines) ? Math.max(0, Math.floor(cue.fadeOutLines)) : 10,
    mainTargetVolume: Number.isFinite(cue?.mainTargetVolume) ? clamp01(cue.mainTargetVolume) : 0.85,
    ambientTargetVolume: Number.isFinite(cue?.ambientTargetVolume) ? clamp01(cue.ambientTargetVolume) : 0.2,
    crossfadeSeconds: Number.isFinite(cue?.crossfadeSeconds) ? Math.max(0.1, cue.crossfadeSeconds) : 1.3,
    ambientCrossfadeSeconds: Number.isFinite(cue?.ambientCrossfadeSeconds)
      ? Math.max(0.1, cue.ambientCrossfadeSeconds)
      : 1.1
  };
}

export function getAudioCues(chapterId) {
  const chapter = getChapterConfig(chapterId);
  const chapterAudio = chapter?.audio || BASE_AUDIO;
  const lineCues = Array.isArray(chapterAudio.lineCues) ? chapterAudio.lineCues : [];

  const normalized = (lineCues.length > 0 ? lineCues : [{
    id: "default",
    startLine: 1,
    endLine: null,
    mainTrack: chapterAudio.mainTrack || BASE_AUDIO.mainTrack,
    ambientTrack: chapterAudio.ambientTrack ?? BASE_AUDIO.ambientTrack
  }])
    .map((cue, index) => normalizeCue(cue, chapterAudio.mainTrack, chapterAudio.ambientTrack, index))
    .sort((a, b) => a.startLine - b.startLine);

  return normalized;
}

export function getParticleConfig(chapterId) {
  const chapter = getChapterConfig(chapterId);
  return chapter?.particles || { type: "none", count: 0 };
}

export function getParticlePreset(presetName) {
  if (!presetName || !PARTICLE_PRESETS[presetName]) {
    return PARTICLE_PRESETS.none;
  }

  const preset = PARTICLE_PRESETS[presetName];
  return preset ? JSON.parse(JSON.stringify(preset)) : null;
}

const chapterConfig = {
  defaultTheme: DEFAULT_THEME,
  particlePresets: PARTICLE_PRESETS,
  chapters: CHAPTERS,
  site: SITE_CONFIG
};

export default chapterConfig;

