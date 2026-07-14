"use client";

import { useEffect, useRef, useState } from "react";

import type { AudioScene, ChapterRevision } from "@/domain/composition/model";
import { activeCuesForBlock, sceneForBlock } from "@/domain/composition/playback";
import { AudioGraph } from "@/audio/audio-graph";

interface AudioTransportProps {
  revision: ChapterRevision;
  activeBlockId: string;
}

export function AudioTransport({ revision, activeBlockId }: AudioTransportProps): React.ReactElement {
  const graph = useRef<AudioGraph | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const sceneId = sceneForBlock(revision, activeBlockId);
  const scene = revision.experience.scenes.find((candidate) => candidate.id === sceneId);
  const activeCues = activeCuesForBlock(revision, activeBlockId);

  useEffect(() => {
    graph.current = new AudioGraph();
    return () => graph.current?.dispose();
  }, []);

  const togglePlayback = async (): Promise<void> => {
    setError(undefined);
    if (playing) {
      graph.current?.pause();
      setPlaying(false);
      return;
    }
    try {
      await graph.current?.play(activeCues.map((cue) => ({ id: cue.id, layer: cue.layer, gainDb: cue.gainDb, loop: cue.loop, fadeInMs: cue.fadeInMs, fadeOutMs: cue.fadeOutMs, duckMusicDb: cue.duckMusicDb, duckAttackMs: cue.duckAttackMs, duckReleaseMs: cue.duckReleaseMs })));
      setEnabled(true);
      setPlaying(true);
    } catch {
      setError("Audio could not start. Check the browser permission and try again.");
    }
  };

  useEffect(() => {
    if (!playing) {
      return;
    }
    void graph.current?.play(activeCues.map((cue) => ({ id: cue.id, layer: cue.layer, gainDb: cue.gainDb, loop: cue.loop, fadeInMs: cue.fadeInMs, fadeOutMs: cue.fadeOutMs, duckMusicDb: cue.duckMusicDb, duckAttackMs: cue.duckAttackMs, duckReleaseMs: cue.duckReleaseMs })));
  }, [activeCues, playing]);

  return (
    <section className="audio-console" aria-label="Soundtrack transport">
      <button type="button" onClick={() => void togglePlayback()} aria-pressed={playing}>
        {playing ? "Pause" : "Enable sound"}
      </button>
      <div>
        <strong>{enabled ? scene?.label ?? "Soundtrack" : "Soundtrack and ambience"}</strong>
        <span>{activeCues.length > 0 ? `${activeCues.filter((cue) => cue.layer === "music").length} music · ${activeCues.filter((cue) => cue.layer === "ambience").length} ambience` : "No cues at this passage"}</span>
        {error ? <span role="alert">{error}</span> : null}
      </div>
    </section>
  );
}

export function sceneCueSummary(scene: AudioScene): string {
  const music = scene.cues.filter((cue) => cue.layer === "music").length;
  const ambience = scene.cues.filter((cue) => cue.layer === "ambience").length;
  return `${music} music · ${ambience} ambience`;
}
