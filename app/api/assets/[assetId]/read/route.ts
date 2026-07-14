import { NextRequest } from "next/server";

import { assetErrorResponse, getPublishedAssetReadUrl } from "@/server/assets";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }): Promise<Response> {
  try {
    const { assetId } = await params;
    const url = await getPublishedAssetReadUrl(assetId, request);
    return Response.json({ url });
  } catch (error) {
    return assetErrorResponse(error);
  }
}
