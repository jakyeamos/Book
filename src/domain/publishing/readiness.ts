import { validateComposition, type CompositionIssue } from "@/domain/composition/validation";
import type { ChapterRevision } from "@/domain/composition/model";

export interface PublishReadiness {
  ready: boolean;
  issues: CompositionIssue[];
}

export function checkPublishReadiness(revision: ChapterRevision): PublishReadiness {
  const result = validateComposition(revision);
  return { ready: result.ok, issues: result.issues };
}

export function assertPublishable(revision: ChapterRevision): void {
  const result = checkPublishReadiness(revision);
  if (!result.ready) {
    const summary = result.issues.map((issue) => issue.message).join(" ");
    throw new Error(`Revision ${revision.id} is not ready to publish. ${summary}`);
  }
}
