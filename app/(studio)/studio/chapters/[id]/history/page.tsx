import Link from "next/link";
import { notFound } from "next/navigation";

import { sampleRevision } from "@/domain/composition/fixtures";

export const dynamic = "force-dynamic";

export default async function StudioHistoryPage({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const { id } = await params;
  if (id !== sampleRevision.chapterId) {
    notFound();
  }
  return (
    <div className="studio-body studio-shell">
      <header className="studio-header"><div><p className="studio-kicker">Author Studio / history</p><h1>{sampleRevision.title}</h1></div><Link href={`/studio/chapters/${id}/composition`}>Back to composition</Link></header>
      <main className="studio-main publish-page"><p className="studio-kicker">Immutable revisions</p><h2>History you can trust.</h2><p>Published pointers never rewrite a revision. Rollback creates a new draft from an earlier snapshot.</p><div className="history-list"><div className="history-item"><strong>Revision {sampleRevision.revisionNumber}</strong><span>Published · {new Date(sampleRevision.createdAt).toLocaleDateString()}</span><button type="button">Create rollback draft</button></div></div></main>
    </div>
  );
}
