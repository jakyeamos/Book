import { createHash, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { AudioAsset, AudioLayer } from "@/domain/composition/model";

export interface UploadIntentInput {
  assetId: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  checksum: string;
}

export const MAX_AUDIO_BYTES = 512 * 1024 * 1024;
export const MAX_AUDIO_DURATION_MS = 3 * 60 * 60 * 1000;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const AUDIO_MIME_TYPES = new Set([
  "audio/aac",
  "audio/flac",
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/opus",
  "audio/wav",
  "audio/webm",
]);

export interface UploadIntent {
  mode: "r2" | "local";
  method: "PUT";
  url: string;
  key: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
}

export interface FinalizeUploadInput {
  assetId: string;
  title: string;
  kind: AudioLayer;
  fileName: string;
  contentType: string;
  checksum: string;
  byteSize: number;
  durationMs: number;
  waveformPeaks: number[];
}

export interface AssetStore {
  createUploadIntent(input: UploadIntentInput): Promise<UploadIntent>;
  finalizeUpload(input: FinalizeUploadInput): Promise<AudioAsset>;
  createReadUrl(asset: AudioAsset, expiresInSeconds: number): Promise<string>;
  deleteObject(asset: AudioAsset): Promise<void>;
}

export interface LocalAssetStoreOptions {
  rootDirectory: string;
  publicOrigin?: string;
}

export interface R2Config {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function createAssetStorageKey(assetId: string, fileName: string, checksum: string): string {
  assertSafeAssetId(assetId);
  assertChecksum(checksum);
  const extension = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, "") || ".bin";
  const safeChecksum = checksum.toLowerCase();
  return `audio/${assetId}/${safeChecksum}${extension}`;
}

export function normalizeChecksum(value: string): string {
  const normalized = value.trim().toLowerCase();
  assertChecksum(normalized);
  return normalized;
}

export function assertSafeAssetId(assetId: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(assetId)) {
    throw new Error("assetId must contain only letters, numbers, hyphens, or underscores.");
  }
}

export function assertChecksum(checksum: string): void {
  if (!SHA256_PATTERN.test(checksum)) {
    throw new Error("checksum must be a lowercase SHA-256 hex digest.");
  }
}

export function assertUploadInput(input: UploadIntentInput): void {
  assertSafeAssetId(input.assetId);
  assertChecksum(input.checksum);
  if (!AUDIO_MIME_TYPES.has(input.contentType.toLowerCase())) {
    throw new Error(`Unsupported audio MIME type: ${input.contentType}.`);
  }
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize <= 0 || input.byteSize > MAX_AUDIO_BYTES) {
    throw new Error(`Audio files must be between 1 byte and ${MAX_AUDIO_BYTES} bytes.`);
  }
  if (input.fileName.trim().length === 0 || input.fileName.length > 255 || input.fileName.includes("/")) {
    throw new Error("fileName must be a single non-empty file name.");
  }
}

export function assertFinalizeInput(input: FinalizeUploadInput): void {
  assertUploadInput({
    assetId: input.assetId,
    fileName: input.fileName,
    contentType: input.contentType,
    byteSize: input.byteSize,
    checksum: input.checksum,
  });
  if (!Number.isSafeInteger(input.durationMs) || input.durationMs <= 0 || input.durationMs > MAX_AUDIO_DURATION_MS) {
    throw new Error("Audio duration is outside the supported range.");
  }
  if (input.waveformPeaks.length < 1 || input.waveformPeaks.length > 100_000 || input.waveformPeaks.some((peak) => !Number.isFinite(peak) || peak < 0 || peak > 1)) {
    throw new Error("waveformPeaks must contain values between 0 and 1.");
  }
}

function checksumEquals(left: string | undefined, right: string): boolean {
  if (!left) {
    return false;
  }
  const leftBuffer = Buffer.from(left.toLowerCase());
  const rightBuffer = Buffer.from(right.toLowerCase());
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export class R2AssetStore implements AssetStore {
  private readonly client: S3Client;

  public constructor(private readonly config: R2Config) {
    this.client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  public async createUploadIntent(input: UploadIntentInput): Promise<UploadIntent> {
    assertUploadInput(input);
    const key = createAssetStorageKey(input.assetId, input.fileName, input.checksum);
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: input.contentType,
      ContentLength: input.byteSize,
      Metadata: { sha256: input.checksum },
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: 900 });
    return { mode: "r2", method: "PUT", url, key, headers: { "Content-Type": input.contentType, "x-amz-meta-sha256": input.checksum }, expiresInSeconds: 900 };
  }

  public async finalizeUpload(input: FinalizeUploadInput): Promise<AudioAsset> {
    assertFinalizeInput(input);
    const key = createAssetStorageKey(input.assetId, input.fileName, input.checksum);
    const object = await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }));
    const remoteChecksum = object.Metadata?.sha256 ?? object.Metadata?.checksum;
    if (object.ContentLength !== input.byteSize || object.ContentType !== input.contentType || !checksumEquals(remoteChecksum, input.checksum)) {
      throw new Error(`R2 upload verification failed for ${input.assetId}.`);
    }
    return { id: input.assetId, title: input.title, kind: input.kind, contentType: input.contentType, storageKey: key, checksum: input.checksum, byteSize: input.byteSize, durationMs: input.durationMs, waveformPeaks: input.waveformPeaks, status: "ready" };
  }

  public async createReadUrl(asset: AudioAsset, expiresInSeconds: number): Promise<string> {
    if (asset.status !== "ready") {
      throw new Error(`Asset ${asset.id} is not ready for playback.`);
    }
    assertSignedUrlLifetime(expiresInSeconds);
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.config.bucket, Key: asset.storageKey }), { expiresIn: expiresInSeconds });
  }

  public async deleteObject(asset: AudioAsset): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: asset.storageKey }));
  }
}

export class LocalAssetStore implements AssetStore {
  private readonly rootDirectory: string;
  private readonly publicOrigin: string;

  public constructor(options: LocalAssetStoreOptions = { rootDirectory: ".local-assets" }) {
    this.rootDirectory = path.resolve(options.rootDirectory);
    this.publicOrigin = options.publicOrigin ?? "";
  }

  public createUploadIntent(input: UploadIntentInput): Promise<UploadIntent> {
    assertUploadInput(input);
    const key = createAssetStorageKey(input.assetId, input.fileName, input.checksum);
    return Promise.resolve({ mode: "local", method: "PUT", url: `${this.publicOrigin}/api/assets/upload/${encodeURIComponent(input.assetId)}`, key, headers: { "Content-Type": input.contentType }, expiresInSeconds: 900 });
  }

  public async finalizeUpload(input: FinalizeUploadInput): Promise<AudioAsset> {
    assertFinalizeInput(input);
    const storageKey = createAssetStorageKey(input.assetId, input.fileName, input.checksum);
    const content = await this.readObject(storageKey);
    const checksum = createHash("sha256").update(content).digest("hex");
    if (content.byteLength !== input.byteSize || !checksumEquals(checksum, input.checksum)) {
      throw new Error(`Local upload verification failed for ${input.assetId}.`);
    }
    return { id: input.assetId, title: input.title, kind: input.kind, contentType: input.contentType, storageKey, checksum: input.checksum, byteSize: input.byteSize, durationMs: input.durationMs, waveformPeaks: input.waveformPeaks, status: "ready" };
  }

  public createReadUrl(asset: AudioAsset, expiresInSeconds: number): Promise<string> {
    assertSignedUrlLifetime(expiresInSeconds);
    if (asset.status !== "ready") {
      return Promise.reject(new Error(`Asset ${asset.id} is not ready for playback.`));
    }
    return Promise.resolve(`${this.publicOrigin}/api/assets/play/${encodeURIComponent(asset.id)}`);
  }

  public deleteObject(asset: AudioAsset): Promise<void> {
    return rm(this.objectPath(asset.storageKey), { force: true });
  }

  public async putObject(storageKey: string, content: Uint8Array, expectedChecksum: string): Promise<void> {
    assertChecksum(expectedChecksum);
    const actualChecksum = createHash("sha256").update(content).digest("hex");
    if (!checksumEquals(actualChecksum, expectedChecksum)) {
      throw new Error("Local upload checksum does not match the declared checksum.");
    }
    const target = this.objectPath(storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, { flag: "wx" });
  }

  public async readObject(storageKey: string): Promise<Buffer> {
    return readFile(this.objectPath(storageKey));
  }

  public async objectExists(storageKey: string): Promise<boolean> {
    try {
      await stat(this.objectPath(storageKey));
      return true;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return false;
      }
      throw error;
    }
  }

  private objectPath(storageKey: string): string {
    const root = path.resolve(this.rootDirectory);
    const target = path.resolve(root, storageKey);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
      throw new Error("Invalid local storage key.");
    }
    return target;
  }
}

export function assertSignedUrlLifetime(expiresInSeconds: number): void {
  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 60 || expiresInSeconds > 3600) {
    throw new Error("Signed URL lifetime must be between 60 and 3600 seconds.");
  }
}
