import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  canCutoverLegacyAssets,
  exportLegacyAudioManifest,
  reconcileLegacyAssets,
  sha256File,
} from "@/migrations/legacy-assets";

function checksum(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

describe("legacy asset reconciliation", () => {
  it("exports stable manifest identities and classifies music versus ambience", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "book-v2-assets-"));
    try {
      await mkdir(path.join(root, "assets/music"), { recursive: true });
      await mkdir(path.join(root, "assets/library"), { recursive: true });
      await writeFile(path.join(root, "assets/music/theme.MP3"), "music");
      await writeFile(path.join(root, "assets/library/room.wav"), "ambience");

      const first = await exportLegacyAudioManifest({ rootDir: root });
      const second = await exportLegacyAudioManifest({ rootDir: root });

      expect(second).toEqual(first);
      expect(first).toHaveLength(2);
      expect(first[0]?.kind).toBe("ambience");
      expect(first[1]?.kind).toBe("music");
      expect(first.every((entry) => entry.id.startsWith("legacy_"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("is idempotent and quarantines missing, mismatched, and duplicate objects", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "book-v2-assets-"));
    try {
      const audioPath = path.join(root, "theme.mp3");
      await writeFile(audioPath, "same bytes");
      const validChecksum = checksum("same bytes");
      const entries = [
        { id: "theme", title: "Theme", kind: "music" as const, sourcePath: audioPath, expectedChecksum: validChecksum, expectedByteSize: 10 },
        { id: "broken", title: "Broken", kind: "music" as const, sourcePath: audioPath, expectedChecksum: checksum("other bytes") },
        { id: "missing", title: "Missing", kind: "ambience" as const, sourcePath: path.join(root, "gone.mp3") },
        { id: "duplicate", title: "Duplicate", kind: "ambience" as const, sourcePath: audioPath },
      ];

      const first = await reconcileLegacyAssets(entries);
      const second = await reconcileLegacyAssets(entries);

      expect(second).toEqual(first);
      expect(first.readyCount).toBe(1);
      expect(first.quarantinedCount).toBe(3);
      expect(first.entries[0]).toMatchObject({
        id: "theme",
        status: "ready",
        checksum: validChecksum,
        byteSize: 10,
        storageKey: `audio/theme/${validChecksum}.mp3`,
        reasons: [],
      });
      expect(first.entries[1]?.reasons).toContain("checksum-mismatch");
      expect(first.entries[2]?.reasons).toContain("missing-source");
      expect(first.entries[3]?.reasons).toContain("duplicate-checksum:theme");
      expect(canCutoverLegacyAssets(first)).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("computes byte size and sha256 for reconciliation tooling", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "book-v2-assets-"));
    try {
      const filePath = path.join(root, "asset.ogg");
      await writeFile(filePath, "payload");
      await expect(sha256File(filePath)).resolves.toEqual({ checksum: checksum("payload"), byteSize: 7 });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
