import { NextRequest } from "next/server";
import { z } from "zod";

import { chapterRevisionSchema } from "@/domain/composition/model";
import { autosaveComposition } from "@/server/composition";
import { assetErrorResponse, assertStudioAssetMutationAuthorized, parseJsonBody } from "@/server/assets";

export const runtime = "nodejs";

const requestSchema = z.object({ revision: chapterRevisionSchema, actorId: z.string().min(1).max(128) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await params;
    assertStudioAssetMutationAuthorized(request);
    const body = await parseJsonBody(request, requestSchema);
    await autosaveComposition({ chapterId: id, revision: body.revision, actorId: body.actorId });
    return Response.json({ ok: true, revisionId: body.revision.id });
  } catch (error) {
    return assetErrorResponse(error);
  }
}
