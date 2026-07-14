import { describe, expect, it } from "vitest";

import { exportLegacyChapter } from "@/migrations/legacy-chapters";

describe("legacy chapter export", () => {
  it("converts line cues into stable block anchors without preserving HTML", () => {
    const exported = exportLegacyChapter({
      chapterId: "chapter-1",
      title: "Arrival",
      html: "<h1>Arrival</h1><p>First.</p><p>Second.</p>",
      lineCues: [{ id: "arrival", startLine: 2, endLine: 3, mainTrack: "assets/music/theme.mp3" }],
    });

    expect(exported.document.blocks).toHaveLength(3);
    expect(exported.scenes[0]?.cues[0]).toMatchObject({ layer: "music", assetPath: "assets/music/theme.mp3" });
    expect(exported.scenes[0]?.startBlockId).toBe(exported.document.blocks[1]?.id);
    expect(JSON.stringify(exported)).not.toContain("<p>");
  });
});
