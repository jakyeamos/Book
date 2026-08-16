import { NextRequest } from "next/server";
import { z } from "zod";

import { saveReaderProgress } from "@/db/repositories/reader-state";
import { assetErrorResponse, assertRequestOrigin, parseJsonBody } from "@/server/assets";
import { requireReaderUser } from "@/server/auth/reader-session";

export const runtime = "nodejs";

const progressSchema = z.object({ chapterId: z.string().min(1), revisionId: z.string().min(1), blockId: z.string().min(1), progressPercent: z.number().min(0).max(100) });

export async function POST(request: NextRequest): Promise<Response> {
  try {
    assertRequestOrigin(request);
    const userId = await requireReaderUser(request);
    const input = await parseJsonBody(request, progressSchema);
    await saveReaderProgress({ userId, ...input });
    return Response.json({ ok: true });
  } catch (error) {
    return assetErrorResponse(error);
  }
}
