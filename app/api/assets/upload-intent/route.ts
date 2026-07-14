import { NextRequest } from "next/server";

import { assetErrorResponse, createUploadIntentForRequest } from "@/server/assets";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const intent = await createUploadIntentForRequest(request);
    return Response.json(intent, { status: 201 });
  } catch (error) {
    return assetErrorResponse(error);
  }
}
