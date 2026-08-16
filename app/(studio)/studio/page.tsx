import Link from "next/link";

import { sampleRevision } from "@/domain/composition/fixtures";

export default function StudioPage(): React.ReactElement {
  return (
    <div className="studio-body studio-shell">
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Book / Author Studio</p>
          <h1>Compose the atmosphere.</h1>
        </div>
        <Link href="/">Reader ↗</Link>
      </header>
      <main className="studio-main">
        <p className="studio-kicker">Editorial dashboard</p>
        <h2>One chapter, one living composition.</h2>
        <p>Content, soundtrack, ambience, preview, and publish readiness will meet here. Start with the representative chapter slice.</p>
        <div className="chapter-list">
          <Link className="chapter-link" href={`/studio/chapters/${sampleRevision.chapterId}/composition`}>
            <strong>{sampleRevision.title}</strong>
            <span>{sampleRevision.experience.scenes.length} scenes · {sampleRevision.experience.scenes.flatMap((scene) => scene.cues).length} cues</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
