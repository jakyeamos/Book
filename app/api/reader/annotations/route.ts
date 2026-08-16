import { NextRequest } from "next/server";
import { z } from "zod";

import { saveReaderAnnotation } from "@/db/repositories/reader-state";
import { assetErrorResponse, assertRequestOrigin, parseJsonBody } from "@/server/assets";
import { requireReaderUser } from "@/server/auth/reader-session";

export const runtime = "nodejs";

const annotationSchema = z.object({ id: z.string().min(1).max(128), chapterId: z.string().min(1), revisionId: z.string().min(1), startBlockId: z.string().min(1), endBlockId: z.string().min(1), quote: z.string().min(1).max(20_000), note: z.string().max(20_000).optional(), color: z.string().min(1).max(32), expectedVersion: z.number().int().positive().optional() });

export async function POST(request: NextRequest): Promise<Response> {
  try {
    assertRequestOrigin(request);
    const userId = await requireReaderUser(request);
    const input = await parseJsonBody(request, annotationSchema);
    const version = await saveReaderAnnotation({ userId, ...input });
    return Response.json({ ok: true, version }, { status: 201 });
  } catch (error) {
    return assetErrorResponse(error);
  }
}
