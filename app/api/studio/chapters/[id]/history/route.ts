import { NextRequest } from "next/server";

import { listRevisionHistory } from "@/db/repositories/history";
import { AssetHttpError, assetErrorResponse, assertStudioAssetMutationAuthorized } from "@/server/assets";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await params;
    assertStudioAssetMutationAuthorized(request);
    if (!id) {
      throw new AssetHttpError(400, "Chapter id is required.");
    }
    return Response.json({ revisions: await listRevisionHistory(id) });
  } catch (error) {
    return assetErrorResponse(error);
  }
}
