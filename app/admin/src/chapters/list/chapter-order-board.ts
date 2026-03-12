import { ChapterRecord } from "../../../../../platform/shared/src/document/schema";

export function applyChapterReorder(
  chapters: ChapterRecord[],
  fromIndex: number,
  toIndex: number,
): ChapterRecord[] {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= chapters.length || toIndex >= chapters.length) {
    return [...chapters];
  }

  const reordered = [...chapters];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);

  return reordered.map((chapter, index) => ({
    ...chapter,
    orderIndex: index + 1,
  }));
}

export function chapterIdsInOrder(chapters: ChapterRecord[]): string[] {
  return [...chapters]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((chapter) => chapter.id);
}
