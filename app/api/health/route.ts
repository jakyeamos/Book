export function GET(): Response {
  return Response.json({ ok: true, service: "book-v2", storage: process.env.R2_BUCKET ? "r2" : "local" });
}
