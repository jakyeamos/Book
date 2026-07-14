import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";

import { sampleRevision } from "@/domain/composition/fixtures";
import { saveDraftRevision } from "@/db/repositories/compositions";

describe("draft composition persistence", () => {
  it("writes the revision and normalized scene/cue rows through one client", async () => {
    const query = vi.fn(async (...args: unknown[]) => { void args; return { rowCount: 1, rows: [] }; });
    const client = { query } as unknown as PoolClient;
    const draft = { ...sampleRevision, status: "draft" as const };

    await saveDraftRevision(client, { chapterId: draft.chapterId, revision: draft, actorId: "editor-1" });

    expect(query).toHaveBeenCalled();
    expect(query.mock.calls.some(([sql]) => String(sql).includes("v2_chapter_revisions"))).toBe(true);
    expect(query.mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO v2_audio_cues")).length).toBe(3);
  });

  it("never autosaves a published revision", async () => {
    const query = vi.fn((...args: unknown[]) => { void args; return undefined; });
    const client = { query } as unknown as PoolClient;

    await expect(saveDraftRevision(client, { chapterId: sampleRevision.chapterId, revision: sampleRevision, actorId: "editor-1" })).rejects.toThrow(/draft/i);
    expect(query).not.toHaveBeenCalled();
  });
});
