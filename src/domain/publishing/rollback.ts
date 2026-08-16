import { randomUUID } from "node:crypto";

import type { ChapterRevision } from "@/domain/composition/model";

export function createRollbackDraft(source: ChapterRevision, actorId: string): ChapterRevision {
  if (source.status !== "published") {
    throw new Error("Only a published revision can be used as a rollback source.");
  }
  void actorId;
  return {
    ...source,
    id: randomUUID(),
    revisionNumber: source.revisionNumber + 1,
    status: "draft",
    createdAt: new Date().toISOString(),
    document: structuredClone(source.document),
    experience: structuredClone(source.experience),
    assets: structuredClone(source.assets),
  };
}
