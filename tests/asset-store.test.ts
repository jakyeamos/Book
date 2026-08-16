import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  LocalAssetStore,
  R2AssetStore,
  createAssetStorageKey,
  type FinalizeUploadInput,
} from "@/storage/asset-store";
import { createAssetStore } from "@/storage/factory";

const r2State = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("@aws-sdk/client-s3", () => ({
  DeleteObjectCommand: class DeleteObjectCommand {
    public constructor(public readonly input: unknown) {}
  },
  GetObjectCommand: class GetObjectCommand {
    public constructor(public readonly input: unknown) {}
  },
  HeadObjectCommand: class HeadObjectCommand {
    public constructor(public readonly input: unknown) {}
  },
  PutObjectCommand: class PutObjectCommand {
    public constructor(public readonly input: unknown) {}
  },
  S3Client: class S3Client {
    public constructor(options: unknown) {
      void options;
    }

    public send(...args: unknown[]): Promise<unknown> {
      return r2State.send(...args) as Promise<unknown>;
    }
  },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(async (_client: unknown, command: { input: { Key: string } }) => `https://r2.example/${command.input.Key}`),
}));

function checksum(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

function finalizeInput(assetId: string, fileName: string, content: Uint8Array): FinalizeUploadInput {
  return {
    assetId,
    title: "A room tone",
    kind: "ambience",
    fileName,
    contentType: "audio/mpeg",
    checksum: checksum(content),
    byteSize: content.byteLength,
    durationMs: 2_000,
    waveformPeaks: [0.1, 0.4, 0.8],
  };
}

describe("local asset storage contract", () => {
  it("writes, verifies, and serves an immutable local object", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "book-v2-local-assets-"));
    try {
      const content = new TextEncoder().encode("room tone");
      const input = finalizeInput("asset-room", "room.mp3", content);
      const store = new LocalAssetStore({ rootDirectory: root });
      const intent = await store.createUploadIntent({
        assetId: input.assetId,
        fileName: input.fileName,
        contentType: "audio/mpeg",
        byteSize: input.byteSize,
        checksum: input.checksum,
      });

      expect(intent.key).toBe(createAssetStorageKey(input.assetId, input.fileName, input.checksum));
      await store.putObject(intent.key, content, input.checksum);
      const asset = await store.finalizeUpload(input);
      await expect(store.createReadUrl(asset, 300)).resolves.toContain("/api/assets/play/asset-room");
      await expect(store.putObject(intent.key, content, input.checksum)).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a finalize request when the uploaded bytes do not match", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "book-v2-local-assets-"));
    try {
      const declared = new TextEncoder().encode("declared");
      const actual = new TextEncoder().encode("different");
      const input = finalizeInput("asset-bad", "bad.ogg", declared);
      const store = new LocalAssetStore({ rootDirectory: root });
      const intent = await store.createUploadIntent({
        assetId: input.assetId,
        fileName: input.fileName,
        contentType: "audio/ogg",
        byteSize: input.byteSize,
        checksum: input.checksum,
      });
      await expect(store.putObject(intent.key, actual, input.checksum)).rejects.toThrow(/checksum/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("R2 asset storage contract", () => {
  it("uses immutable checksum-addressed keys and presigned PUT metadata", async () => {
    const store = new R2AssetStore({
      endpoint: "https://account.r2.cloudflarestorage.com",
      bucket: "book-audio",
      accessKeyId: "access",
      secretAccessKey: "secret",
    });
    const checksumValue = "a".repeat(64);
    const intent = await store.createUploadIntent({
      assetId: "asset-theme",
      fileName: "theme.MP3",
      contentType: "audio/mpeg",
      byteSize: 128,
      checksum: checksumValue,
    });

    expect(intent.mode).toBe("r2");
    expect(intent.method).toBe("PUT");
    expect(intent.key).toBe(`audio/asset-theme/${checksumValue}.mp3`);
    expect(intent.headers).toMatchObject({ "Content-Type": "audio/mpeg", "x-amz-meta-sha256": checksumValue });
    expect(intent.url).toContain(intent.key);
  });

  it("does not finalize when R2 metadata or byte count differs", async () => {
    const store = new R2AssetStore({
      endpoint: "https://account.r2.cloudflarestorage.com",
      bucket: "book-audio",
      accessKeyId: "access",
      secretAccessKey: "secret",
    });
    const content = new TextEncoder().encode("r2 payload");
    const input = finalizeInput("asset-r2", "payload.ogg", content);
    r2State.send.mockResolvedValueOnce({ ContentLength: content.byteLength, ContentType: input.contentType, Metadata: { sha256: input.checksum } });
    await expect(store.finalizeUpload(input)).resolves.toMatchObject({ id: input.assetId, status: "ready" });

    r2State.send.mockResolvedValueOnce({ ContentLength: content.byteLength + 1, Metadata: { sha256: input.checksum } });
    await expect(store.finalizeUpload(input)).rejects.toThrow(/verification failed/i);
  });
});

describe("asset store selection", () => {
  it("selects R2 only when the complete credential set is present", () => {
    const environment = {
      NODE_ENV: "test",
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      R2_BUCKET: "book-audio",
      R2_ACCESS_KEY_ID: "access",
      R2_SECRET_ACCESS_KEY: "secret",
    } as NodeJS.ProcessEnv;
    expect(createAssetStore(environment)).toBeInstanceOf(R2AssetStore);
    expect(createAssetStore({ NODE_ENV: "test", BOOK_LOCAL_ASSET_DIR: "/tmp/book-assets" })).toBeInstanceOf(LocalAssetStore);
    expect(() => createAssetStore({ NODE_ENV: "test", R2_BUCKET: "book-audio" })).toThrow();
  });
});
