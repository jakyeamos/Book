import { NextRequest } from "next/server";

import { assetErrorResponse, assertStudioAssetMutationAuthorized, getAssetDependencies } from "@/server/assets";
import { LocalAssetStore, assertChecksum, assertSafeAssetId, MAX_AUDIO_BYTES } from "@/storage/asset-store";

export const runtime = "nodejs";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }): Promise<Response> {
  try {
    const { assetId } = await params;
    assertSafeAssetId(assetId);
    const dependencies = getAssetDependencies();
    assertStudioAssetMutationAuthorized(request, dependencies.environment);
    if (!(dependencies.store instanceof LocalAssetStore)) {
      return Response.json({ error: "Direct upload endpoint is only available for local development storage." }, { status: 409 });
    }
    const storageKey = request.headers.get("x-book-storage-key");
    const checksum = request.headers.get("x-book-checksum");
    if (!storageKey || !checksum) {
      return Response.json({ error: "x-book-storage-key and x-book-checksum headers are required." }, { status: 400 });
    }
    assertChecksum(checksum);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > MAX_AUDIO_BYTES) {
      return Response.json({ error: "Content-Length is missing or outside the supported limit." }, { status: 413 });
    }
    const body = new Uint8Array(await request.arrayBuffer());
    if (body.byteLength !== contentLength) {
      return Response.json({ error: "Uploaded byte count does not match Content-Length." }, { status: 400 });
    }
    await dependencies.store.putObject(storageKey, body, checksum);
    return new Response(null, { status: 204 });
  } catch (error) {
    return assetErrorResponse(error);
  }
}
