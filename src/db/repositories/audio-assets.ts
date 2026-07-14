import type { Pool, PoolClient } from "pg";

import { getDbPool } from "@/db/client";
import type { AudioAsset } from "@/domain/composition/model";
import type { BookEnvironment } from "@/server/env";

export interface AudioAssetRepository {
  save(asset: AudioAsset, client?: PoolClient): Promise<void>;
  get(assetId: string): Promise<AudioAsset | undefined>;
  getPublished(assetId: string): Promise<AudioAsset | undefined>;
  listAbandoned(before: Date): Promise<AudioAsset[]>;
  quarantine(assetId: string): Promise<void>;
}

interface AudioAssetRow {
  id: string;
  title: string;
  kind: AudioAsset["kind"];
  content_type: string;
  storage_key: string;
  checksum: string;
  byte_size: string | number;
  duration_ms: number;
  waveform_peaks: number[];
  status: AudioAsset["status"];
}

function toAudioAsset(row: AudioAssetRow): AudioAsset {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    contentType: row.content_type,
    storageKey: row.storage_key,
    checksum: row.checksum,
    byteSize: Number(row.byte_size),
    durationMs: row.duration_ms,
    waveformPeaks: row.waveform_peaks,
    status: row.status,
  };
}

export class PostgresAudioAssetRepository implements AudioAssetRepository {
  public constructor(private readonly pool: Pool = getDbPool()) {}

  public async save(asset: AudioAsset, client?: PoolClient): Promise<void> {
    const executor = client ?? this.pool;
    await executor.query(
      `INSERT INTO v2_audio_assets
        (id, title, kind, content_type, storage_key, checksum, byte_size, duration_ms, waveform_peaks, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         kind = EXCLUDED.kind,
         content_type = EXCLUDED.content_type,
         storage_key = EXCLUDED.storage_key,
         checksum = EXCLUDED.checksum,
         byte_size = EXCLUDED.byte_size,
         duration_ms = EXCLUDED.duration_ms,
         waveform_peaks = EXCLUDED.waveform_peaks,
         status = EXCLUDED.status`,
      [
        asset.id,
        asset.title,
        asset.kind,
        asset.contentType,
        asset.storageKey,
        asset.checksum,
        asset.byteSize,
        asset.durationMs,
        JSON.stringify(asset.waveformPeaks),
        asset.status,
      ],
    );
  }

  public async get(assetId: string): Promise<AudioAsset | undefined> {
    const result = await this.pool.query<AudioAssetRow>("SELECT * FROM v2_audio_assets WHERE id = $1", [assetId]);
    return result.rows[0] ? toAudioAsset(result.rows[0]) : undefined;
  }

  public async getPublished(assetId: string): Promise<AudioAsset | undefined> {
    const result = await this.pool.query<AudioAssetRow>(
      `SELECT DISTINCT a.*
       FROM v2_audio_assets a
       JOIN v2_audio_cues c ON c.asset_id = a.id
       JOIN v2_audio_scenes s ON s.id = c.scene_id
       JOIN v2_chapter_publications p ON p.revision_id = s.revision_id
       WHERE a.id = $1 AND a.status = 'ready'`,
      [assetId],
    );
    return result.rows[0] ? toAudioAsset(result.rows[0]) : undefined;
  }

  public async listAbandoned(before: Date): Promise<AudioAsset[]> {
    const result = await this.pool.query<AudioAssetRow>(
      "SELECT * FROM v2_audio_assets WHERE status = 'pending' AND cleanup_after IS NOT NULL AND cleanup_after < $1",
      [before],
    );
    return result.rows.map(toAudioAsset);
  }

  public async quarantine(assetId: string): Promise<void> {
    await this.pool.query("UPDATE v2_audio_assets SET status = 'quarantined' WHERE id = $1 AND status = 'pending'", [assetId]);
  }
}

class MemoryAudioAssetRepository implements AudioAssetRepository {
  private readonly assets = new Map<string, AudioAsset>();

  public async save(asset: AudioAsset): Promise<void> {
    this.assets.set(asset.id, asset);
  }

  public async get(assetId: string): Promise<AudioAsset | undefined> {
    return this.assets.get(assetId);
  }

  private readonly published = new Set<string>();

  public async getPublished(assetId: string): Promise<AudioAsset | undefined> {
    return this.published.has(assetId) ? this.assets.get(assetId) : undefined;
  }

  public async listAbandoned(before: Date): Promise<AudioAsset[]> {
    void before;
    return [];
  }

  public async quarantine(assetId: string): Promise<void> {
    const asset = this.assets.get(assetId);
    if (asset?.status === "pending") {
      this.assets.set(assetId, { ...asset, status: "quarantined" });
    }
  }
}

declare global {
  var __bookV2AudioAssetRepository: AudioAssetRepository | undefined;
}

export function createAudioAssetRepository(environment: BookEnvironment = process.env): AudioAssetRepository {
  if (environment.DATABASE_URL) {
    return new PostgresAudioAssetRepository();
  }
  globalThis.__bookV2AudioAssetRepository ??= new MemoryAudioAssetRepository();
  return globalThis.__bookV2AudioAssetRepository;
}
