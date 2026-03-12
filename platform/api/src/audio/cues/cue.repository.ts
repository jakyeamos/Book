import * as fs from "node:fs";
import * as path from "node:path";
import {
  AudioAssetRecord,
  AudioCueRecord,
  CueStatus,
  nowAudioIso,
} from "../../../../shared/src/audio/cue-schema";

interface AudioStoreShape {
  assets: AudioAssetRecord[];
  cues: AudioCueRecord[];
}

export class AudioCueRepository {
  private readonly storePath: string;
  private store: AudioStoreShape;

  constructor(storePath = path.join(".planning", "data", "audio-store.json")) {
    this.storePath = storePath;
    this.store = this.load();
  }

  addAsset(asset: AudioAssetRecord): AudioAssetRecord {
    this.store.assets.push(asset);
    this.save();
    return asset;
  }

  listAssets(type?: AudioAssetRecord["type"]): AudioAssetRecord[] {
    if (!type) {
      return [...this.store.assets];
    }

    return this.store.assets.filter((asset) => asset.type === type);
  }

  getAsset(assetId: string): AudioAssetRecord | undefined {
    return this.store.assets.find((asset) => asset.id === assetId);
  }

  saveCue(cue: AudioCueRecord): AudioCueRecord {
    this.store.cues = this.store.cues.filter((item) => item.id !== cue.id);
    this.store.cues.push(cue);
    this.save();
    return cue;
  }

  listCues(chapterId?: string): AudioCueRecord[] {
    if (!chapterId) {
      return [...this.store.cues];
    }
    return this.store.cues.filter((cue) => cue.chapterId === chapterId);
  }

  getCue(cueId: string): AudioCueRecord | undefined {
    return this.store.cues.find((cue) => cue.id === cueId);
  }

  updateCue(cueId: string, updater: (cue: AudioCueRecord) => AudioCueRecord): AudioCueRecord {
    let updated: AudioCueRecord | undefined;

    this.store.cues = this.store.cues.map((cue) => {
      if (cue.id !== cueId) {
        return cue;
      }

      updated = {
        ...updater(cue),
        updatedAt: nowAudioIso(),
      };
      return updated;
    });

    if (!updated) {
      throw new Error(`Cue not found: ${cueId}`);
    }

    this.save();
    return updated;
  }

  markCueStatus(cueId: string, status: CueStatus, issues: string[]): AudioCueRecord {
    return this.updateCue(cueId, (cue) => ({
      ...cue,
      status,
      validationIssues: issues,
    }));
  }

  private load(): AudioStoreShape {
    try {
      if (!fs.existsSync(this.storePath)) {
        return { assets: [], cues: [] };
      }

      const raw = fs.readFileSync(this.storePath, "utf8");
      const parsed = JSON.parse(raw) as AudioStoreShape;
      return {
        assets: parsed.assets ?? [],
        cues: parsed.cues ?? [],
      };
    } catch {
      return { assets: [], cues: [] };
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
    fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2), "utf8");
  }
}

