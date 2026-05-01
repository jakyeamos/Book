import { AddressInfo } from "node:net";
import { createBookServer } from "../api/src/server";

async function requestJson<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<{ body: T; headers: Headers; status: number }> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const body = (await response.json()) as T;
  return { body, headers: response.headers, status: response.status };
}

async function run(): Promise<void> {
  const app = await createBookServer({ mode: "memory" });
  await new Promise<void>((resolve) => {
    app.listen(0, "127.0.0.1", resolve);
  });

  const address = app.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const manifest = await requestJson<Array<{ id: string; title: string }>>(baseUrl, "/api/reader/manifest");
    if (manifest.status !== 200 || manifest.body.length === 0) {
      throw new Error("Reader manifest endpoint did not return published chapters");
    }

    const chapter = await requestJson<{ html: string }>(baseUrl, "/api/reader/chapters/chapter1");
    if (chapter.status !== 200 || !chapter.body.html.includes("chapter")) {
      throw new Error("Reader chapter endpoint did not return chapter HTML");
    }

    const adminPage = await fetch(`${baseUrl}/admin`);
    const adminHtml = await adminPage.text();
    if (adminPage.status !== 200 || !adminHtml.includes("Admin Editors")) {
      throw new Error("/admin did not serve the admin editor shell");
    }

    const login = await requestJson<{ user: { role: string } }>(baseUrl, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@example.com", password: "change-me-admin" }),
    });
    const cookie = login.headers.get("set-cookie") ?? "";
    if (login.status !== 200 || login.body.user.role !== "admin" || !cookie.includes("auth_token=")) {
      throw new Error("Admin login did not issue an admin session");
    }

    const chapters = await requestJson<Array<{ id: string }>>(baseUrl, "/api/admin/chapters", {
      headers: { cookie },
    });
    if (chapters.status !== 200 || chapters.body.length === 0) {
      throw new Error("Authenticated admin chapter list failed");
    }

    const readiness = await requestJson<{ ok: boolean; checks: Record<string, boolean> }>(baseUrl, "/api/deploy/readiness");
    if (readiness.status !== 200 || !readiness.body.ok || !readiness.body.checks.readerApi) {
      throw new Error("Deployment readiness endpoint failed");
    }

    const readerLogin = await requestJson<{ user: { role: string } }>(baseUrl, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "reader-smoke@example.com", password: "reader-password", displayName: "Smoke Reader" }),
    });
    const readerCookie = readerLogin.headers.get("set-cookie") ?? "";
    if (readerLogin.status !== 201 || readerLogin.body.user.role !== "reader") {
      throw new Error("Reader registration did not create a reader session");
    }

    const savedState = await requestJson<{ progress: { chapterId: string }; highlights: unknown[] }>(baseUrl, "/api/reader/state", {
      method: "PUT",
      headers: { cookie: readerCookie },
      body: JSON.stringify({
        progress: { chapterId: "chapter1", scrollY: 220 },
        highlights: [{ chapterId: "chapter1", text: "A cold sweat" }],
        notes: [{ chapterId: "chapter1", text: "Opening hook" }],
        preferences: { fontScale: 1.1, lineHeight: 1.7, theme: "dark" },
      }),
    });
    if (savedState.status !== 200 || savedState.body.progress.chapterId !== "chapter1" || savedState.body.highlights.length !== 1) {
      throw new Error("Reader state did not persist");
    }

    const search = await requestJson<{ results: Array<{ chapterId: string }> }>(baseUrl, "/api/reader/search?q=ritual");
    if (search.status !== 200 || search.body.results.length === 0) {
      throw new Error("Reader search returned no results");
    }

    const asset = await requestJson<{ id: string }>(baseUrl, "/api/admin/audio/assets", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        fileName: "smoke.mp3",
        title: "Smoke Asset",
        type: "music",
        contentBase64: Buffer.from("fake mp3").toString("base64"),
        durationSeconds: 12,
      }),
    });
    const cue = await requestJson<{ id: string }>(baseUrl, "/api/admin/audio/cues", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        chapterId: "ch_chapter1",
        assetId: asset.body.id,
        layer: "music",
        startBlockId: "blk_ch_chapter1_1",
        endBlockId: "blk_ch_chapter1_2",
      }),
    });
    if (asset.status !== 201 || cue.status !== 201 || !cue.body.id) {
      throw new Error("Audio studio API did not create asset and cue");
    }

    const analytics = await requestJson<{ events: Array<{ eventType: string }> }>(baseUrl, "/api/admin/analytics/events", {
      headers: { cookie },
    });
    if (analytics.status !== 200 || analytics.body.events.length === 0) {
      throw new Error("Analytics/audit events endpoint returned no events");
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      app.close((error: Error | undefined) => (error ? reject(error) : resolve()));
    });
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
