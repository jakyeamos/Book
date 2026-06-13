import { AddressInfo } from "node:net";
import * as http from "node:http";
import { createBookServer } from "../api/src/server";

interface SmokeTarget {
  baseUrl: string;
  adminEmail: string;
  adminPassword: string;
  server?: http.Server;
}

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

function cleanBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function envValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

async function createLocalTarget(): Promise<SmokeTarget> {
  const server = await createBookServer({ mode: "memory" });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    adminEmail: "admin@example.com",
    adminPassword: "change-me-admin",
    server,
  };
}

async function resolveTarget(): Promise<SmokeTarget> {
  const deployedBaseUrl = envValue("BOOK_SMOKE_BASE_URL", "SMOKE_BASE_URL", "RENDER_EXTERNAL_URL");
  if (!deployedBaseUrl) {
    return createLocalTarget();
  }

  const adminEmail = envValue("BOOK_SMOKE_ADMIN_EMAIL", "ADMIN_EMAIL");
  const adminPassword = envValue("BOOK_SMOKE_ADMIN_PASSWORD", "ADMIN_PASSWORD");
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Deployed smoke requires BOOK_SMOKE_ADMIN_EMAIL/BOOK_SMOKE_ADMIN_PASSWORD or ADMIN_EMAIL/ADMIN_PASSWORD.",
    );
  }

  return {
    baseUrl: cleanBaseUrl(deployedBaseUrl),
    adminEmail,
    adminPassword,
  };
}

async function closeTarget(target: SmokeTarget): Promise<void> {
  if (!target.server) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    target.server?.close((error: Error | undefined) => (error ? reject(error) : resolve()));
  });
}

async function run(): Promise<void> {
  const target = await resolveTarget();
  const { adminEmail, adminPassword, baseUrl } = target;

  try {
    const health = await requestJson<{ ok: boolean }>(baseUrl, "/api/health");
    if (health.status !== 200 || !health.body.ok) {
      throw new Error("Health endpoint did not report ok");
    }

    const manifest = await requestJson<Array<{ id: string; title: string }>>(baseUrl, "/api/reader/manifest");
    if (manifest.status !== 200 || manifest.body.length === 0) {
      throw new Error("Reader manifest endpoint did not return published chapters");
    }

    const chapter = await requestJson<{ html: string }>(baseUrl, "/api/reader/chapters/chapter1");
    if (chapter.status !== 200 || !chapter.body.html.includes("chapter")) {
      throw new Error("Reader chapter endpoint did not return chapter HTML");
    }

    const anonymousAdminPage = await fetch(`${baseUrl}/admin`, { redirect: "manual" });
    if (anonymousAdminPage.status !== 302 || anonymousAdminPage.headers.get("location") !== "/login?next=/admin") {
      throw new Error("Anonymous /admin did not redirect to /login");
    }

    const loginPage = await fetch(`${baseUrl}/login`);
    const loginHtml = await loginPage.text();
    if (
      loginPage.status !== 200
      || !loginHtml.includes("Book Account")
      || !loginHtml.includes("/login/login.js")
    ) {
      throw new Error("/login did not serve the login shell");
    }

    const anonymousHighlightsPage = await fetch(`${baseUrl}/me/highlights`, { redirect: "manual" });
    if (anonymousHighlightsPage.status !== 302 || anonymousHighlightsPage.headers.get("location") !== "/login?next=%2Fme%2Fhighlights") {
      throw new Error("Anonymous reader-only route did not redirect to /login");
    }

    const login = await requestJson<{ user: { role: string } }>(baseUrl, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const cookie = login.headers.get("set-cookie") ?? "";
    if (login.status !== 200 || login.body.user.role !== "admin" || !cookie.includes("auth_token=")) {
      throw new Error("Admin login did not issue an admin session");
    }

    const adminPage = await fetch(`${baseUrl}/admin`, {
      headers: { cookie },
    });
    const adminHtml = await adminPage.text();
    if (
      adminPage.status !== 200
      || !adminHtml.includes("Admin Editors")
      || !adminHtml.includes("/admin/admin.js")
    ) {
      throw new Error("/admin did not serve the admin editor shell");
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
      body: JSON.stringify({
        email: envValue("BOOK_SMOKE_READER_EMAIL") ?? `reader-smoke-${Date.now()}@example.com`,
        password: envValue("BOOK_SMOKE_READER_PASSWORD") ?? "reader-password",
        displayName: "Smoke Reader",
      }),
    });
    const readerCookie = readerLogin.headers.get("set-cookie") ?? "";
    if (readerLogin.status !== 201 || readerLogin.body.user.role !== "reader") {
      throw new Error("Reader registration did not create a reader session");
    }

    const readerHighlightsPage = await fetch(`${baseUrl}/me/highlights`, {
      headers: { cookie: readerCookie },
    });
    const readerHighlightsHtml = await readerHighlightsPage.text();
    if (readerHighlightsPage.status !== 200 || !readerHighlightsHtml.includes("Reader Account")) {
      throw new Error("Authenticated reader-only route did not serve the reader shell");
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
        fileName: `smoke-${Date.now()}.mp3`,
        title: `Smoke Asset ${Date.now()}`,
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

    const deleteCue = await fetch(`${baseUrl}/api/admin/audio/cues/${encodeURIComponent(cue.body.id)}`, {
      method: "DELETE",
      headers: { cookie },
    });
    if (deleteCue.status !== 200) {
      throw new Error("Audio studio API did not delete smoke cue");
    }

    const analytics = await requestJson<{ events: Array<{ eventType: string }> }>(baseUrl, "/api/admin/analytics/events", {
      headers: { cookie },
    });
    if (analytics.status !== 200 || analytics.body.events.length === 0) {
      throw new Error("Analytics/audit events endpoint returned no events");
    }
  } finally {
    await closeTarget(target);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
