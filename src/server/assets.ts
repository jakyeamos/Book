import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { createAudioAssetRepository, type AudioAssetRepository } from "@/db/repositories/audio-assets";
import { audioLayerSchema, type AudioAsset } from "@/domain/composition/model";
import {
  assertSignedUrlLifetime,
  assertUploadInput,
  createAssetStorageKey,
  type AssetStore,
  type FinalizeUploadInput,
  type UploadIntentInput,
} from "@/storage/asset-store";
import { createAssetStore } from "@/storage/factory";
import type { BookEnvironment } from "@/server/env";

const uploadIntentSchema = z.object({
  assetId: z.string().min(1).max(128),
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(128),
  byteSize: z.number().int().positive(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
});

const finalizeUploadSchema = uploadIntentSchema.extend({
  title: z.string().trim().min(1).max(200),
  kind: audioLayerSchema,
  durationMs: z.number().int().positive(),
  waveformPeaks: z.array(z.number().min(0).max(1)).min(1).max(100_000),
});

const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;

export interface AssetServiceDependencies {
  store?: AssetStore;
  repository?: AudioAssetRepository;
  environment?: BookEnvironment;
}

export function getAssetDependencies(dependencies: AssetServiceDependencies = {}): Required<AssetServiceDependencies> {
  const environment = dependencies.environment ?? process.env;
  return {
    store: dependencies.store ?? createAssetStore(environment),
    repository: dependencies.repository ?? createAudioAssetRepository(environment),
    environment,
  };
}

export function assertStudioAssetMutationAuthorized(request: Pick<NextRequest, "headers">, environment: BookEnvironment = process.env): void {
  assertRequestOrigin(request, environment);
  const expectedToken = environment.BOOK_STUDIO_UPLOAD_TOKEN;
  if (!expectedToken) {
    if (environment.NODE_ENV === "production") {
      throw new AssetHttpError(503, "Studio upload authorization is not configured.");
    }
    return;
  }

  const authorization = request.headers.get("authorization");
  const suppliedToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;
  if (!suppliedToken || !secureTokenEquals(suppliedToken, expectedToken)) {
    throw new AssetHttpError(401, "Studio upload authorization is required.");
  }
}

function assertRequestOrigin(request: Pick<NextRequest, "headers">, environment: BookEnvironment): void {
  const expectedOrigin = environment.BOOK_PUBLIC_ORIGIN;
  const requestOrigin = request.headers.get("origin");
  if (!expectedOrigin || !requestOrigin) {
    return;
  }
  try {
    if (new URL(requestOrigin).origin !== new URL(expectedOrigin).origin) {
      throw new AssetHttpError(403, "Request origin is not allowed.");
    }
  } catch (error) {
    if (error instanceof AssetHttpError) {
      throw error;
    }
    throw new AssetHttpError(403, "Request origin is not allowed.");
  }
}

function secureTokenEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function parseJsonBody<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_JSON_BODY_BYTES) {
    throw new AssetHttpError(413, "Request body is too large.");
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AssetHttpError(400, "Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AssetHttpError(400, "Request body failed validation.", parsed.error.flatten());
  }
  return parsed.data;
}

export async function createUploadIntentForRequest(request: NextRequest, dependencies: AssetServiceDependencies = {}): Promise<Awaited<ReturnType<AssetStore["createUploadIntent"]>>> {
  const resolved = getAssetDependencies(dependencies);
  assertStudioAssetMutationAuthorized(request, resolved.environment);
  const input = await parseJsonBody(request, uploadIntentSchema);
  assertUploadInput(input);
  return resolved.store.createUploadIntent(input);
}

export async function finalizeUploadForRequest(request: NextRequest, dependencies: AssetServiceDependencies = {}): Promise<AudioAsset> {
  const resolved = getAssetDependencies(dependencies);
  assertStudioAssetMutationAuthorized(request, resolved.environment);
  const input = await parseJsonBody(request, finalizeUploadSchema);
  const asset = await resolved.store.finalizeUpload(input);
  await resolved.repository.save(asset);
  return asset;
}

export async function getPublishedAssetReadUrl(assetId: string, request: NextRequest, dependencies: AssetServiceDependencies = {}): Promise<string> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(assetId)) {
    throw new AssetHttpError(400, "Invalid asset id.");
  }
  const resolved = getAssetDependencies(dependencies);
  const asset = await resolved.repository.getPublished(assetId);
  if (!asset) {
    throw new AssetHttpError(404, "Asset is not published.");
  }
  void request;
  const lifetime = parseReadUrlLifetime(resolved.environment.BOOK_AUDIO_READ_URL_TTL);
  return resolved.store.createReadUrl(asset, lifetime);
}

export async function cleanupAbandonedUploads(
  dependencies: AssetServiceDependencies = {},
  now: Date = new Date(),
): Promise<number> {
  const resolved = getAssetDependencies(dependencies);
  const abandoned = await resolved.repository.listAbandoned(now);
  for (const asset of abandoned) {
    await resolved.store.deleteObject(asset);
    await resolved.repository.quarantine(asset.id);
  }
  return abandoned.length;
}

function parseReadUrlLifetime(value: string | undefined): number {
  const lifetime = value ? Number(value) : 900;
  if (!Number.isInteger(lifetime)) {
    throw new AssetHttpError(500, "BOOK_AUDIO_READ_URL_TTL must be an integer.");
  }
  try {
    assertSignedUrlLifetime(lifetime);
  } catch (error) {
    throw new AssetHttpError(500, error instanceof Error ? error.message : "Invalid signed URL lifetime.");
  }
  return lifetime;
}

export function localStorageKeyForUpload(input: UploadIntentInput): string {
  return createAssetStorageKey(input.assetId, input.fileName, input.checksum);
}

export class AssetHttpError extends Error {
  public constructor(public readonly status: number, message: string, public readonly details?: unknown) {
    super(message);
    this.name = "AssetHttpError";
  }
}

export function assetErrorResponse(error: unknown): Response {
  if (error instanceof AssetHttpError) {
    return Response.json({ error: error.message, details: error.details }, { status: error.status });
  }
  console.error("Book v2 asset request failed", error);
  return Response.json({ error: "Asset request failed." }, { status: 500 });
}

export type FinalizeAssetRequest = FinalizeUploadInput;
