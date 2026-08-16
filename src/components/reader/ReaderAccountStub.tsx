import Link from "next/link";

interface ReaderAccountStubProps {
  title: string;
  description: string;
}

/**
 * Private reader surfaces intentionally render no account data until a
 * session is present. This keeps the route useful in the v2 shell without
 * creating a client-side or unauthorised data path.
 */
export function ReaderAccountStub({ title, description }: ReaderAccountStubProps): React.ReactElement {
  return (
    <div className="reader-shell">
      <a className="skip-link" href="#main-content">Skip to account content</a>
      <header className="reader-header">
        <Link className="reader-wordmark" href="/">Book / composition</Link>
        <nav className="reader-nav" aria-label="Reader navigation">
          <Link href="/">Library</Link>
          <Link href="/read/the-ritual">Read</Link>
          <Link href="/studio">Studio</Link>
        </nav>
      </header>
      <main id="main-content" className="library-page account-page">
        <p className="library-kicker">Reader account</p>
        <h1>{title}</h1>
        <p className="library-intro">{description}</p>
        <section className="chapter-list" aria-labelledby="account-sign-in-heading">
          <h2 id="account-sign-in-heading" className="sr-only">Sign in required</h2>
          <p className="library-empty">Sign in to make this space yours. Your highlights, notes, and preferences will stay separate from the public reading experience.</p>
          <Link className="chapter-link" href="/">Return to the library <span>Continue reading without an account</span></Link>
        </section>
      </main>
    </div>
  );
}
