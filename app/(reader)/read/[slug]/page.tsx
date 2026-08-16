import { notFound } from "next/navigation";

import { ReaderChapter } from "@/components/reader/ReaderChapter";
import { loadReaderChapter } from "@/server/reader/chapter-service";

export const dynamic = "force-dynamic";

export default async function ReaderChapterPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const revision = await loadReaderChapter(slug);
  if (!revision) {
    notFound();
  }
  return <ReaderChapter revision={revision} />;
}
