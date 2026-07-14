import Link from "next/link";
import { notFound } from "next/navigation";

import { sampleRevision } from "@/domain/composition/fixtures";
import { checkPublishReadiness } from "@/domain/publishing/readiness";

export const dynamic = "force-dynamic";

export default async function StudioPublishPage({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const { id } = await params;
  if (id !== sampleRevision.chapterId) {
    notFound();
  }
  const readiness = checkPublishReadiness(sampleRevision);
  return (
    <div className="studio-body studio-shell">
      <header className="studio-header">
        <div><p className="studio-kicker">Author Studio / publish</p><h1>{sampleRevision.title}</h1></div>
        <Link href={`/studio/chapters/${id}/composition`}>Back to composition</Link>
      </header>
      <main className="studio-main publish-page">
        <p className="studio-kicker">Readiness</p>
        <h2>{readiness.ready ? "Ready to publish" : "Publication is blocked"}</h2>
        <p>{readiness.ready ? "The text, soundtrack, ambience, and visibility pointer can move together as one revision." : "Resolve every issue before the immutable publication pointer can move."}</p>
        <ul className="readiness-list">
          {readiness.issues.length === 0 ? <li className="status-note">Anchors, assets, fades, and layer limits are valid.</li> : readiness.issues.map((issue) => <li key={`${issue.code}-${issue.cueId ?? issue.sceneId}`}>{issue.message}</li>)}
        </ul>
      </main>
    </div>
  );
}
