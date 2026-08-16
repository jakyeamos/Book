import { NextRequest } from "next/server";

import { assetErrorResponse, finalizeUploadForRequest } from "@/server/assets";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const asset = await finalizeUploadForRequest(request);
    return Response.json(asset, { status: 201 });
  } catch (error) {
    return assetErrorResponse(error);
  }
}
