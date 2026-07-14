import { NextRequest } from "next/server";

import { assetErrorResponse, getAssetDependencies, AssetHttpError } from "@/server/assets";
import { LocalAssetStore } from "@/storage/asset-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }): Promise<Response> {
  try {
    const { assetId } = await params;
    const dependencies = getAssetDependencies();
    const asset = await dependencies.repository.getPublished(assetId);
    if (!asset) {
      throw new AssetHttpError(404, "Asset is not published.");
    }
    if (!(dependencies.store instanceof LocalAssetStore)) {
      throw new AssetHttpError(409, "Local playback endpoint is not available for R2 assets.");
    }
    const bytes = await dependencies.store.readObject(asset.storageKey);
    const range = parseRange(request.headers.get("range"), bytes.byteLength);
    const body = bytes.subarray(range.start, range.end + 1);
    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Content-Type": "audio/mpeg",
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, max-age=60",
    });
    if (range.partial) {
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${bytes.byteLength}`);
    }
    return new Response(new Uint8Array(body), { status: range.partial ? 206 : 200, headers });
  } catch (error) {
    return assetErrorResponse(error);
  }
}
function parseRange(value: string | null, length: number): { start: number; end: number; partial: boolean } {
  if (!value) {
    return { start: 0, end: length - 1, partial: false };
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match) {
    throw new AssetHttpError(416, "Invalid byte range.");
  }
  const requestedStart = match[1] ? Number(match[1]) : Math.max(length - Number(match[2]) - 1, 0);
  const requestedEnd = match[2] ? Number(match[2]) : length - 1;
  if (!Number.isInteger(requestedStart) || !Number.isInteger(requestedEnd) || requestedStart < 0 || requestedStart > requestedEnd || requestedStart >= length) {
    throw new AssetHttpError(416, "Byte range is not satisfiable.");
  }
  return { start: requestedStart, end: Math.min(requestedEnd, length - 1), partial: true };
}
