"use client";

import { useEffect, useMemo, useState } from "react";

import type { ChapterRevision } from "@/domain/composition/model";
import { activeCuesForBlock } from "@/domain/composition/playback";
import { sceneCueSummary } from "@/components/reader/AudioTransport";

interface StudioCompositionEditorProps {
  revision: ChapterRevision;
}

export function StudioCompositionEditor({ revision }: StudioCompositionEditorProps): React.ReactElement {
  const [draftRevision, setDraftRevision] = useState(revision);
  const [selectedSceneId, setSelectedSceneId] = useState(revision.experience.scenes[0]?.id ?? "");
  const [activeBlockId, setActiveBlockId] = useState(revision.document.blocks[1]?.id ?? revision.document.blocks[0]?.id ?? "");
  const [selectedCueId, setSelectedCueId] = useState(revision.experience.scenes[0]?.cues[0]?.id ?? "");
  const [playing, setPlaying] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Draft unchanged");
  const selectedScene = draftRevision.experience.scenes.find((scene) => scene.id === selectedSceneId) ?? draftRevision.experience.scenes[0];
  const selectedSceneCues = selectedScene?.cues ?? [];
  const selectedCue = selectedSceneCues.find((cue) => cue.id === selectedCueId) ?? selectedSceneCues[0];
  const activeCues = useMemo(() => activeCuesForBlock(draftRevision, activeBlockId), [activeBlockId, draftRevision]);

  const updateCue = (cueId: string, patch: Partial<typeof selectedSceneCues[number]>): void => {
    setDraftRevision((current) => ({
      ...current,
      experience: {
        ...current.experience,
        scenes: current.experience.scenes.map((scene) => ({
          ...scene,
          cues: scene.cues.map((cue) => cue.id === cueId ? { ...cue, ...patch } : cue),
        })),
      },
    }));
    setSaveStatus("Unsaved changes");
  };

  const saveDraft = async (): Promise<void> => {
    setSaveStatus("Saving draft…");
    try {
      const response = await fetch(`/api/studio/chapters/${draftRevision.chapterId}/composition`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: { ...draftRevision, status: "draft" }, actorId: "studio-preview" }) });
      if (!response.ok) {
        throw new Error("Draft save failed");
      }
      setSaveStatus("Draft saved");
    } catch {
      setSaveStatus("Draft could not save yet");
    }
  };

  useEffect(() => {
    if (!playing) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      setActiveBlockId((current) => {
        const currentIndex = draftRevision.document.blocks.findIndex((block) => block.id === current);
        const next = draftRevision.document.blocks[currentIndex + 1] ?? draftRevision.document.blocks[1] ?? draftRevision.document.blocks[0];
        return next.id;
      });
    }, 1700);
    return () => window.clearInterval(interval);
  }, [playing, draftRevision.document.blocks]);

  return (
    <div className="studio-body studio-shell">
      <header className="studio-header">
        <div>
          <p className="studio-kicker">Author Studio / composition</p>
          <h1>{revision.title}</h1>
        </div>
        <nav className="studio-header-nav" aria-label="Chapter studio navigation">
          <a href={`/read/${revision.slug}`}>Open reader ↗</a>
          <a href={`/studio/chapters/${revision.chapterId}/history`}>History</a>
          <a href={`/studio/chapters/${revision.chapterId}/publish`}>Publish</a>
        </nav>
      </header>
      <div className="studio-layout">
        <aside className="studio-rail" aria-label="Scenes">
          <h2>Scenes</h2>
          <nav>
            {draftRevision.experience.scenes.map((scene) => (
              <button className="scene-button" key={scene.id} type="button" aria-current={scene.id === selectedScene?.id} onClick={() => { setSelectedSceneId(scene.id); setSelectedCueId(scene.cues[0]?.id ?? ""); setActiveBlockId(scene.startBlockId); }}>
                <span>{scene.label}</span>
                <small>{sceneCueSummary(scene)}</small>
              </button>
            ))}
          </nav>
        </aside>
        <main className="studio-main">
          <p className="studio-kicker">Synchronized composition</p>
          <h2>Shape the room around the words.</h2>
          <p>Every cue is anchored to a block, previewed through the reader renderer, and published with the same immutable chapter revision.</p>
          <div className="composition-grid">
            <section className="studio-panel" aria-labelledby="preview-heading">
              <h3 id="preview-heading" className="sr-only">Synchronized preview</h3>
              <div className="preview-stage" aria-live="polite">
                <p className="library-kicker">{selectedScene?.label ?? "Scene"}</p>
                <h3>{draftRevision.document.blocks.find((block) => block.id === activeBlockId)?.text}</h3>
                <p>Active cues: {activeCues.length === 0 ? "none" : activeCues.map((cue) => cue.id).join(" · ")}</p>
                <div className="transport" aria-label="Preview transport">
                  <button type="button" data-primary="true" aria-pressed={playing} onClick={() => setPlaying((value) => !value)}>{playing ? "Pause preview" : "Play preview"}</button>
                  <button type="button" onClick={() => setActiveBlockId(selectedScene?.startBlockId ?? activeBlockId)}>Jump to scene start</button>
                  <span>{playing ? "Cursor following text" : "Preview paused"}</span>
                </div>
              </div>
              <div className="timeline" aria-label="Soundtrack timeline">
                <div className="timeline-row">
                  <span className="timeline-label">Text blocks</span>
                  <div className="timeline-track">
                    {draftRevision.document.blocks.map((block) => <button className="timeline-cue" key={block.id} type="button" aria-current={block.id === activeBlockId} onClick={() => setActiveBlockId(block.id)}>{block.id}</button>)}
                  </div>
                </div>
                <div className="timeline-row">
                  <span className="timeline-label">Music</span>
                  <div className="timeline-track">
                    {draftRevision.experience.scenes.map((scene) => scene.cues.filter((cue) => cue.layer === "music").map((cue) => <button className="timeline-cue" key={cue.id} type="button" onClick={() => { setSelectedSceneId(scene.id); setSelectedCueId(cue.id); setActiveBlockId(cue.startBlockId); }}>{cue.id}</button>))}
                  </div>
                </div>
                <div className="timeline-row">
                  <span className="timeline-label">Ambience</span>
                  <div className="timeline-track">
                    {draftRevision.experience.scenes.flatMap((scene) => scene.cues.filter((cue) => cue.layer === "ambience").map((cue) => <button className="timeline-cue" data-layer="ambience" key={cue.id} type="button" onClick={() => { setSelectedSceneId(scene.id); setSelectedCueId(cue.id); setActiveBlockId(cue.startBlockId); }}>{cue.id}</button>))}
                  </div>
                </div>
              </div>
            </section>
            <aside className="studio-panel" aria-labelledby="inspector-heading">
              <h3 id="inspector-heading">Cue inspector</h3>
              <p>{selectedScene?.label ?? "Select a scene"}</p>
              <div className="inspector-list">
                {selectedSceneCues.map((cue) => (
                  <div className="inspector-item" key={cue.id}>
                    <button className="inspector-select" type="button" aria-current={cue.id === selectedCue?.id} onClick={() => setSelectedCueId(cue.id)}><strong>{cue.layer === "music" ? "Music" : "Ambience"} · {cue.id}</strong></button>
                    <span>{cue.startBlockId} → {cue.endBlockId}</span>
                    <span>{cue.loop ? "Looping" : "One pass"} · {cue.gainDb} dB · fades {cue.fadeInMs}/{cue.fadeOutMs}ms</span>
                  </div>
                ))}
              </div>
              {selectedCue ? <div className="cue-fields" aria-label="Selected cue fields">
                <label>Gain <input type="number" min={-60} max={12} step={1} value={selectedCue.gainDb} onChange={(event) => updateCue(selectedCue.id, { gainDb: Number(event.target.value) })} /> dB</label>
                <label>Fade in <input type="number" min={0} step={100} value={selectedCue.fadeInMs} onChange={(event) => updateCue(selectedCue.id, { fadeInMs: Number(event.target.value) })} /> ms</label>
                <label>Fade out <input type="number" min={0} step={100} value={selectedCue.fadeOutMs} onChange={(event) => updateCue(selectedCue.id, { fadeOutMs: Number(event.target.value) })} /> ms</label>
                <label><input type="checkbox" checked={selectedCue.loop} onChange={(event) => updateCue(selectedCue.id, { loop: event.target.checked })} /> Loop cue</label>
              </div> : null}
              <div className="waveform" aria-label="Waveform peaks">{(selectedCue ? draftRevision.assets.find((asset) => asset.id === selectedCue.assetId)?.waveformPeaks : [])?.map((peak, index) => <span key={`${selectedCue?.id}-${index}`} style={{ height: `${Math.max(8, peak * 100)}%` }} />)}</div>
              <div className="status-note" role="status">{saveStatus}. Publish validation will re-check anchors and asset readiness.</div>
              <button type="button" className="save-draft" onClick={() => void saveDraft()}>Save draft</button>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
