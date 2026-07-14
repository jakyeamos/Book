import { NextRequest } from "next/server";
import { z } from "zod";

import { chapterRevisionSchema } from "@/domain/composition/model";
import { createRollbackDraft } from "@/domain/publishing/rollback";
import { autosaveComposition } from "@/server/composition";
import { assetErrorResponse, assertStudioAssetMutationAuthorized, parseJsonBody } from "@/server/assets";

export const runtime = "nodejs";

const requestSchema = z.object({ revision: chapterRevisionSchema, actorId: z.string().min(1).max(128) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await params;
    assertStudioAssetMutationAuthorized(request);
    const body = await parseJsonBody(request, requestSchema);
    const draft = createRollbackDraft(body.revision, body.actorId);
    await autosaveComposition({ chapterId: id, revision: draft, actorId: body.actorId });
    return Response.json({ ok: true, revisionId: draft.id, revisionNumber: draft.revisionNumber }, { status: 201 });
  } catch (error) {
    return assetErrorResponse(error);
  }
}
