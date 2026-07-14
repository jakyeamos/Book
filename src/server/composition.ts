import type { ChapterRevision } from "@/domain/composition/model";
import { validateComposition } from "@/domain/composition/validation";
import { withTransaction } from "@/db/client";
import { saveDraftRevision } from "@/db/repositories/compositions";

export interface AutosaveCompositionInput {
  chapterId: string;
  revision: ChapterRevision;
  actorId: string;
}

export async function autosaveComposition(input: AutosaveCompositionInput): Promise<void> {
  const validation = validateComposition(input.revision);
  if (!validation.ok) {
    throw new Error(`Composition cannot be saved: ${validation.issues.map((issue) => issue.message).join(" ")}`);
  }
  await withTransaction((client) => saveDraftRevision(client, input));
}
