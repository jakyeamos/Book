import type { ChapterRevision } from "./model";

const now = "2036-03-08T08:00:00.000Z";

export const sampleRevision: ChapterRevision = {
  id: "revision-ritual-1",
  chapterId: "chapter-1",
  slug: "the-ritual",
  title: "The Ritual",
  revisionNumber: 1,
  status: "published",
  visibility: "public",
  createdAt: now,
  document: {
    blocks: [
      { id: "b1", type: "heading", text: "The Ritual", emphasis: false },
      { id: "b2", type: "paragraph", text: "A cold morning gathers at the edge of the room.", emphasis: false },
      { id: "b3", type: "paragraph", text: "He moves through the familiar motions, one careful breath at a time.", emphasis: false },
      { id: "b4", type: "verse", text: "Hold.\nShiver.\nRelease.", emphasis: true },
      { id: "b5", type: "paragraph", text: "Beyond the window, the city waits beneath a veil of grey.", emphasis: false },
      { id: "b6", type: "paragraph", text: "The library will be open. The walk is already known.", emphasis: false },
    ],
  },
  experience: {
    theme: { background: "oklch(0.16 0.025 255)", foreground: "oklch(0.93 0.025 88)", accent: "oklch(0.68 0.13 165)" },
    motion: [{ id: "motion-1", blockId: "b4", intensity: "subtle" }],
    scenes: [
      {
        id: "scene-bedroom",
        revisionId: "revision-ritual-1",
        label: "Before the window",
        startBlockId: "b1",
        endBlockId: "b4",
        orderIndex: 0,
        cues: [
          { id: "cue-morning", sceneId: "scene-bedroom", assetId: "asset-morning", layer: "music", startBlockId: "b1", endBlockId: "b4", offsetMs: 0, loop: true, gainDb: -18, fadeInMs: 1200, fadeOutMs: 1800 },
          { id: "cue-room-tone", sceneId: "scene-bedroom", assetId: "asset-room-tone", layer: "ambience", startBlockId: "b2", endBlockId: "b4", offsetMs: 0, loop: true, gainDb: -28, fadeInMs: 800, fadeOutMs: 900, duckMusicDb: -4, duckAttackMs: 400, duckReleaseMs: 900 },
        ],
      },
      {
        id: "scene-library",
        revisionId: "revision-ritual-1",
        label: "The library",
        startBlockId: "b5",
        endBlockId: "b6",
        orderIndex: 1,
        cues: [
          { id: "cue-library", sceneId: "scene-library", assetId: "asset-library", layer: "music", startBlockId: "b5", endBlockId: "b6", offsetMs: 0, loop: true, gainDb: -20, fadeInMs: 1800, fadeOutMs: 1200 },
        ],
      },
    ],
  },
  assets: [
    { id: "asset-morning", title: "Morning light", kind: "music", contentType: "audio/mpeg", storageKey: "audio/asset-morning/demo.mp3", checksum: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", byteSize: 1, durationMs: 180000, waveformPeaks: [0.22, 0.42, 0.35, 0.5, 0.28], status: "ready" },
    { id: "asset-room-tone", title: "Room tone", kind: "ambience", contentType: "audio/mpeg", storageKey: "audio/asset-room-tone/demo.mp3", checksum: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", byteSize: 1, durationMs: 90000, waveformPeaks: [0.08, 0.12, 0.1, 0.14, 0.09], status: "ready" },
    { id: "asset-library", title: "Stacks at dusk", kind: "music", contentType: "audio/mpeg", storageKey: "audio/asset-library/demo.mp3", checksum: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc", byteSize: 1, durationMs: 210000, waveformPeaks: [0.19, 0.3, 0.24, 0.4, 0.26], status: "ready" },
  ],
};
