import { HighlightRecord, nowReaderIso } from "../../../shared/src/reader/schema";
import { ReaderSyncRepository } from "./reader-sync.repository";

export interface AnchorReconcileResult {
  highlightId: string;
  reconciled: boolean;
  unresolved: boolean;
  reason?: string;
}

export class AnchorReconcileService {
  constructor(private readonly repository: ReaderSyncRepository) {}

  reconcileHighlightsForChapter(
    userId: string,
    chapterId: string,
    availableBlockIds: string[],
  ): AnchorReconcileResult[] {
    const highlights = this.repository.listHighlights(userId, chapterId);

    return highlights.map((highlight) => {
      if (availableBlockIds.includes(highlight.anchor.blockId)) {
        return {
          highlightId: highlight.id,
          reconciled: false,
          unresolved: false,
        };
      }

      if (availableBlockIds.length === 0) {
        const unresolved = this.markUnresolved(highlight, "No available blocks after update");
        return {
          highlightId: unresolved.id,
          reconciled: false,
          unresolved: true,
          reason: "No available blocks after update",
        };
      }

      const fallbackBlockId = availableBlockIds[0];
      const reconciled = this.repository.saveHighlight({
        ...highlight,
        anchor: {
          ...highlight.anchor,
          blockId: fallbackBlockId,
          startOffset: 0,
          endOffset: Math.max(highlight.selectedText.length, 1),
        },
        unresolved: false,
        updatedAt: nowReaderIso(),
      });

      return {
        highlightId: reconciled.id,
        reconciled: true,
        unresolved: false,
        reason: `Re-anchored from missing block to ${fallbackBlockId}`,
      };
    });
  }

  private markUnresolved(highlight: HighlightRecord, reason: string): HighlightRecord {
    return this.repository.saveHighlight({
      ...highlight,
      unresolved: true,
      updatedAt: nowReaderIso(),
      selectedText: `${highlight.selectedText} [UNRESOLVED: ${reason}]`,
    });
  }
}

