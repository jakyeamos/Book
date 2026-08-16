import { notFound } from "next/navigation";

import { StudioCompositionEditor } from "@/components/studio/StudioCompositionEditor";
import { sampleRevision } from "@/domain/composition/fixtures";

export default async function StudioCompositionPage({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const { id } = await params;
  if (id !== sampleRevision.chapterId) {
    notFound();
  }
  return <StudioCompositionEditor revision={sampleRevision} />;
}
