"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { ChapterRevision } from "@/domain/composition/model";
import { AudioTransport } from "./AudioTransport";

interface ReaderChapterProps {
  revision: ChapterRevision;
}

export function ReaderChapter({ revision }: ReaderChapterProps): React.ReactElement {
  const [activeBlockId, setActiveBlockId] = useState(revision.document.blocks[0]?.id ?? "");
  const [selectionVisible, setSelectionVisible] = useState(false);
  const activeIndex = useMemo(() => revision.document.blocks.findIndex((block) => block.id === activeBlockId), [activeBlockId, revision.document.blocks]);

  return (
    <main id="main-content" className="reader-page" style={{ "--reader-page-accent": revision.experience.theme.accent } as React.CSSProperties}>
      <div className="reader-toolbar">
        <Link href="/">← Library</Link>
        <span className="reader-progress">Passage {Math.max(activeIndex + 1, 1)} of {revision.document.blocks.length}</span>
        <button type="button" onClick={() => setSelectionVisible((visible) => !visible)} aria-pressed={selectionVisible}>Annotate</button>
      </div>
      <AudioTransport revision={revision} activeBlockId={activeBlockId} />
      <article className="reader-article" onMouseUp={() => setSelectionVisible(true)}>
        <header>
          <p>Chapter 01 · The first scene</p>
          <h1>{revision.title}</h1>
        </header>
        {revision.document.blocks.slice(1).map((block) => (
          <p
            className={`reader-block${block.id === activeBlockId ? " is-active" : ""}${block.emphasis ? " is-emphasis" : ""}`}
            data-block-id={block.id}
            data-type={block.type}
            key={block.id}
            onClick={() => setActiveBlockId(block.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setActiveBlockId(block.id);
              }
            }}
          >
            {block.text}
          </p>
        ))}
      </article>
      {selectionVisible ? (
        <div className="selection-tools" role="toolbar" aria-label="Passage actions">
          <button type="button" onClick={() => setSelectionVisible(false)}>Highlight</button>
          <button type="button" onClick={() => setSelectionVisible(false)}>Add note</button>
          <button type="button" onClick={() => setSelectionVisible(false)}>Copy link</button>
        </div>
      ) : null}
    </main>
  );
}
