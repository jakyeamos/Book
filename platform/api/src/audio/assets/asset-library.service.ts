import * as fs from "node:fs";
import * as path from "node:path";
import {
  AudioAssetRecord,
  AudioAssetType,
  makeAudioAssetId,
  nowAudioIso,
} from "../../../../shared/src/audio/cue-schema";
import { AudioCueRepository } from "../cues/cue.repository";

export interface AudioStorageAdapter {
  saveAsset(fileName: string, content: Buffer): string;
}

export class LocalAudioStorageAdapter implements AudioStorageAdapter {
  constructor(private readonly baseDir = path.join("assets", "library")) {}

  saveAsset(fileName: string, content: Buffer): string {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const targetPath = path.join(this.baseDir, safeName);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content);
    return targetPath;
  }
}

export class AudioAssetLibraryService {
  constructor(
    private readonly repository: AudioCueRepository,
    private readonly storage: AudioStorageAdapter,
  ) {}

  uploadAsset(input: {
    fileName: string;
    title: string;
    type: AudioAssetType;
    content: Buffer;
    durationSeconds: number;
    defaultVolume?: number;
  }): AudioAssetRecord {
    const storagePath = this.storage.saveAsset(input.fileName, input.content);

    const record: AudioAssetRecord = {
      id: makeAudioAssetId(input.title),
      title: input.title,
      type: input.type,
      storagePath,
      durationSeconds: input.durationSeconds,
      defaultVolume: input.defaultVolume ?? 0.5,
      createdAt: nowAudioIso(),
    };

    return this.repository.addAsset(record);
  }

  listAssets(type?: AudioAssetType): AudioAssetRecord[] {
    return this.repository.listAssets(type);
  }
}

