import { describe, expect, it } from "vitest";

import { sampleRevision } from "@/domain/composition/fixtures";
import { checkPublishReadiness } from "@/domain/publishing/readiness";
import { validateComposition } from "@/domain/composition/validation";

describe("validateComposition", () => {
  it("accepts the representative soundtrack composition", () => {
    expect(validateComposition(sampleRevision)).toEqual({ ok: true, issues: [] });
  });

  it("rejects cues that reference unavailable assets", () => {
    const revision = {
      ...sampleRevision,
      experience: {
        ...sampleRevision.experience,
        scenes: sampleRevision.experience.scenes.map((scene) => ({
          ...scene,
          cues: scene.cues.map((cue) => ({ ...cue, assetId: cue.id === "cue-morning" ? "missing" : cue.assetId })),
        })),
      },
    };

    const result = validateComposition(revision);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "missing-asset")).toBe(true);
  });

  it("rejects overlapping music cues in one scene", () => {
    const scene = sampleRevision.experience.scenes[0];
    const revision = {
      ...sampleRevision,
      experience: {
        ...sampleRevision.experience,
        scenes: [
          {
            ...scene,
            cues: [...scene.cues, { ...scene.cues[0], id: "cue-morning-overlap" }],
          },
          sampleRevision.experience.scenes[1],
        ],
      },
    };

    const result = validateComposition(revision);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "music-overlap")).toBe(true);
  });

  it("reports readiness issues without mutating the draft", () => {
    const draft = structuredClone(sampleRevision);
    draft.status = "draft";
    draft.assets[0].status = "quarantined";

    const result = checkPublishReadiness(draft);

    expect(result.ready).toBe(false);
    expect(result.issues[0]?.code).toBe("missing-asset");
    expect(draft.status).toBe("draft");
  });
});
