import { describe, expect, it } from "vitest";

import { sampleRevision } from "@/domain/composition/fixtures";
import { createRollbackDraft } from "@/domain/publishing/rollback";

describe("revision rollback", () => {
  it("creates a new draft while leaving the published source untouched", () => {
    const draft = createRollbackDraft(sampleRevision, "editor-1");

    expect(draft.id).not.toBe(sampleRevision.id);
    expect(draft.revisionNumber).toBe(sampleRevision.revisionNumber + 1);
    expect(draft.status).toBe("draft");
    expect(draft.document).toEqual(sampleRevision.document);
    expect(sampleRevision.status).toBe("published");
  });

  it("rejects a draft as a rollback source", () => {
    expect(() => createRollbackDraft({ ...sampleRevision, status: "draft" }, "editor-1")).toThrow(/published/i);
  });
});
