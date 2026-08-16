import Link from "next/link";

import { loadReaderLibrary } from "@/server/reader/chapter-service";

export const dynamic = "force-dynamic";

export default async function ReaderLibraryPage(): Promise<React.ReactElement> {
  const chapters = await loadReaderLibrary();
  return (
    <div className="reader-shell">
      <a className="skip-link" href="#main-content">Skip to library</a>
      <header className="reader-header">
        <Link className="reader-wordmark" href="/">Book / composition</Link>
        <nav className="reader-nav" aria-label="Reader navigation">
          <Link href="/read/the-ritual">Read</Link>
          <Link href="/me/highlights">Highlights</Link>
          <Link href="/studio">Studio</Link>
        </nav>
      </header>
      <main id="main-content" className="library-page">
        <p className="library-kicker">A novel in scenes</p>
        <h1>Read with the room around the words.</h1>
        <p className="library-intro">Book pairs deliberate prose with a soundtrack and living ambience. Choose a chapter, settle into its atmosphere, and let the composition stay out of your way.</p>
        <section className="chapter-list" aria-labelledby="chapter-list-heading">
          <h2 id="chapter-list-heading" className="sr-only">Chapters</h2>
          {chapters.length > 0 ? chapters.map((chapter) => (
            <Link className="chapter-link" href={`/read/${chapter.slug}`} key={chapter.id}>
              <strong>{chapter.title}</strong>
              <span>Scene composition · {chapter.sceneCount} scenes · {chapter.blockCount} blocks</span>
            </Link>
          )) : (
            <p className="library-empty">No published chapters are available yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
