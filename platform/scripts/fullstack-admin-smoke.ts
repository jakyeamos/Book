import { AddressInfo } from "node:net";
import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import { createBookServer } from "../api/src/server";

const JSZip: {
  new(): {
    file(name: string, data: string): void;
    generateAsync(options: { type: "nodebuffer" }): Promise<Buffer>;
  };
} = require("jszip");

interface SmokeTarget {
  baseUrl: string;
  adminEmail: string;
  adminPassword: string;
  server?: http.Server;
  previousAudioAssetDir?: string;
  smokeAssetDir?: string;
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

function assertNodeOwned(response: Response, route: string): void {
  if (response.headers.get("x-book-platform") !== "node") {
    throw new Error(`${route} was not served by the Node platform service`);
  }
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

function setEnvValue(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

async function createDocxBuffer(title: string, paragraph: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${title}</w:t></w:r></w:p>
    <w:p><w:r><w:t>${paragraph}</w:t></w:r></w:p>
  </w:body>
</w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

async function expectProductionBootstrapFailure(
  setup: () => void,
  expectedMessage: string,
): Promise<void> {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAdminEmail = process.env.ADMIN_EMAIL;
  const originalAdminPassword = process.env.ADMIN_PASSWORD;

  try {
    process.env.NODE_ENV = "production";
    setup();
    const server = await createBookServer({ mode: "memory" });
    server.close();
    throw new Error(`Production bootstrap unexpectedly succeeded: ${expectedMessage}`);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes(expectedMessage)) {
      throw error;
    }
  } finally {
    setEnvValue("NODE_ENV", originalNodeEnv);
    setEnvValue("ADMIN_EMAIL", originalAdminEmail);
    setEnvValue("ADMIN_PASSWORD", originalAdminPassword);
  }
}

async function assertProductionAdminBootstrap(): Promise<void> {
  await expectProductionBootstrapFailure(() => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
  }, "Production admin bootstrap requires ADMIN_EMAIL and ADMIN_PASSWORD");

  await expectProductionBootstrapFailure(() => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "change-me-admin";
  }, "ADMIN_PASSWORD must not use the old default admin password in production");
}

async function createLocalTarget(): Promise<SmokeTarget> {
  const timestamp = Date.now();
  const adminEmail = `admin-smoke-${timestamp}@example.com`;
  const adminPassword = `admin-smoke-password-${timestamp}`;
  const smokeAssetDir = path.join(".planning", "data", `fullstack-smoke-assets-${timestamp}`);
  const previousAudioAssetDir = process.env.AUDIO_ASSET_DIR;
  process.env.AUDIO_ASSET_DIR = smokeAssetDir;
  const server = await createBookServer({
    mode: "memory",
    bootstrapAdmin: {
      email: adminEmail,
      password: adminPassword,
    },
  });
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
    adminEmail,
    adminPassword,
    server,
    previousAudioAssetDir,
    smokeAssetDir,
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
  if (target.previousAudioAssetDir === undefined) {
    delete process.env.AUDIO_ASSET_DIR;
  } else {
    process.env.AUDIO_ASSET_DIR = target.previousAudioAssetDir;
  }
  if (target.smokeAssetDir) {
    fs.rmSync(target.smokeAssetDir, { recursive: true, force: true });
  }
}

async function run(): Promise<void> {
  await assertProductionAdminBootstrap();

  const target = await resolveTarget();
  const { adminEmail, adminPassword, baseUrl } = target;
  let adminCookie = "";
  let disposableChapterId: string | undefined;
  let disposableCueId: string | undefined;
  let importedChapterId: string | undefined;

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

    const readerShell = await fetch(`${baseUrl}/`);
    const readerHtml = await readerShell.text();
    assertNodeOwned(readerShell, "/");
    if (
      readerShell.status !== 200
      || !readerHtml.includes("Interactive Digital Book")
      || !readerHtml.includes("script.js")
    ) {
      throw new Error("/ did not serve the reader shell");
    }

    const anonymousAdminPage = await fetch(`${baseUrl}/admin`, { redirect: "manual" });
    assertNodeOwned(anonymousAdminPage, "/admin");
    if (anonymousAdminPage.status !== 302 || anonymousAdminPage.headers.get("location") !== "/login?next=%2Fadmin") {
      throw new Error("Anonymous /admin did not redirect to /login");
    }

    const anonymousAdminSubroute = await fetch(`${baseUrl}/admin/chapters`, { redirect: "manual" });
    assertNodeOwned(anonymousAdminSubroute, "/admin/chapters");
    if (
      anonymousAdminSubroute.status !== 302
      || anonymousAdminSubroute.headers.get("location") !== "/login?next=%2Fadmin%2Fchapters"
    ) {
      throw new Error("Anonymous /admin subroute did not redirect to /login");
    }

    const loginPage = await fetch(`${baseUrl}/login`);
    const loginHtml = await loginPage.text();
    assertNodeOwned(loginPage, "/login");
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

    for (const credentials of [
      { email: "admin@example.com", password: "change-me-admin" },
      { email: "reader@example.com", password: "change-me-reader" },
    ]) {
      const defaultLogin = await requestJson<{ user?: { role: string }; error?: string }>(baseUrl, "/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      if (defaultLogin.status === 200) {
        throw new Error(`Default credentials unexpectedly worked for ${credentials.email}`);
      }
    }

    const login = await requestJson<{ user: { role: string } }>(baseUrl, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const cookie = login.headers.get("set-cookie") ?? "";
    adminCookie = cookie;
    if (login.status !== 200 || login.body.user.role !== "admin" || !cookie.includes("auth_token=")) {
      throw new Error("Admin login did not issue an admin session");
    }

    const adminPage = await fetch(`${baseUrl}/admin`, {
      headers: { cookie },
    });
    const adminHtml = await adminPage.text();
    assertNodeOwned(adminPage, "/admin");
    if (
      adminPage.status !== 200
      || !adminHtml.includes("Author Studio")
      || !adminHtml.includes("/admin/admin.js")
    ) {
      throw new Error("/admin did not serve the admin editor shell");
    }

    const adminSubroute = await fetch(`${baseUrl}/admin/chapters`, {
      headers: { cookie },
    });
    const adminSubrouteHtml = await adminSubroute.text();
    assertNodeOwned(adminSubroute, "/admin/chapters");
    if (
      adminSubroute.status !== 200
      || !adminSubrouteHtml.includes("Author Studio")
      || !adminSubrouteHtml.includes("/admin/admin.js")
    ) {
      throw new Error("Authenticated /admin subroute did not serve the admin editor shell");
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

    const importSlug = `smoke-import-${Date.now()}`;
    const docxBuffer = await createDocxBuffer("Smoke Imported Chapter", "Imported through the Author Studio HTTP API.");
    const importedDraft = await requestJson<{ id: string; status: string; metadata: { slug: string; title: string } }>(
      baseUrl,
      "/api/admin/import/docx",
      {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({
          fileName: `${importSlug}.docx`,
          contentBase64: docxBuffer.toString("base64"),
          metadata: {
            slug: importSlug,
            title: "Smoke Imported Chapter",
            orderIndex: 98,
          },
        }),
      },
    );
    if (importedDraft.status !== 201 || importedDraft.body.status !== "staged" || importedDraft.body.metadata.slug !== importSlug) {
      throw new Error("DOCX import endpoint did not create a staged draft");
    }

    const draftList = await requestJson<{ drafts: Array<{ id: string }> }>(baseUrl, "/api/admin/import/drafts", {
      headers: { cookie },
    });
    if (draftList.status !== 200 || !draftList.body.drafts.some((draft) => draft.id === importedDraft.body.id)) {
      throw new Error("Import draft list did not include uploaded draft");
    }

    const metadataUpdate = await requestJson<{
      metadata: {
        title: string;
        chapterType: string;
        orderIndex: number;
        visibility: { mode: string; includeInToc: boolean };
      };
    }>(
      baseUrl,
      `/api/admin/import/drafts/${encodeURIComponent(importedDraft.body.id)}/metadata`,
      {
        method: "PUT",
        headers: { cookie },
        body: JSON.stringify({
          title: "Smoke Imported Chapter Revised",
          chapterType: "interlude",
          orderIndex: 97,
          visibility: {
            mode: "direct-link",
            includeInToc: false,
          },
        }),
      },
    );
    if (
      metadataUpdate.status !== 200
      || metadataUpdate.body.metadata.title !== "Smoke Imported Chapter Revised"
      || metadataUpdate.body.metadata.chapterType !== "interlude"
      || metadataUpdate.body.metadata.orderIndex !== 97
      || metadataUpdate.body.metadata.visibility.mode !== "direct-link"
      || metadataUpdate.body.metadata.visibility.includeInToc
    ) {
      throw new Error("Import draft metadata update did not persist");
    }

    const importApproval = await requestJson<{
      chapter: {
        id: string;
        status: string;
        title: string;
        number: number;
        type: string;
        visibility: { mode: string; includeInToc: boolean };
        normalizedDocument: { blocks: unknown[] };
      };
    }>(
      baseUrl,
      `/api/admin/import/drafts/${encodeURIComponent(importedDraft.body.id)}/approve`,
      {
        method: "POST",
        headers: { cookie },
      },
    );
    importedChapterId = importApproval.body.chapter.id;
    if (
      importApproval.status !== 200
      || importApproval.body.chapter.status !== "draft"
      || importApproval.body.chapter.title !== "Smoke Imported Chapter Revised"
      || importApproval.body.chapter.number !== 97
      || importApproval.body.chapter.type !== "interlude"
      || importApproval.body.chapter.visibility.mode !== "direct-link"
      || importApproval.body.chapter.visibility.includeInToc
      || importApproval.body.chapter.normalizedDocument.blocks.length < 2
    ) {
      throw new Error("Import draft approval did not create a metadata-backed block chapter");
    }

    const chapterSettings = await requestJson<{
      id: string;
      number: number;
      type: string;
      visibility: { mode: string; conditionKey?: string; includeInToc: boolean };
    }>(
      baseUrl,
      `/api/admin/chapters/${encodeURIComponent(importedChapterId)}`,
      {
        method: "PUT",
        headers: { cookie },
        body: JSON.stringify({
          orderIndex: 96,
          type: "conditional",
          visibility: {
            mode: "conditional",
            conditionKey: "smoke-authoring-gate",
            includeInToc: false,
          },
        }),
      },
    );
    if (
      chapterSettings.status !== 200
      || chapterSettings.body.number !== 96
      || chapterSettings.body.type !== "conditional"
      || chapterSettings.body.visibility.mode !== "conditional"
      || chapterSettings.body.visibility.conditionKey !== "smoke-authoring-gate"
      || chapterSettings.body.visibility.includeInToc
    ) {
      throw new Error("Imported chapter order/type/visibility update did not persist");
    }

    const reloadedChapter = await requestJson<{
      number: number;
      type: string;
      visibility: { mode: string; conditionKey?: string; includeInToc: boolean };
    }>(
      baseUrl,
      `/api/admin/chapters/${encodeURIComponent(importedChapterId)}`,
      { headers: { cookie } },
    );
    if (
      reloadedChapter.status !== 200
      || reloadedChapter.body.number !== 96
      || reloadedChapter.body.type !== "conditional"
      || reloadedChapter.body.visibility.mode !== "conditional"
      || reloadedChapter.body.visibility.conditionKey !== "smoke-authoring-gate"
      || reloadedChapter.body.visibility.includeInToc
    ) {
      throw new Error("Imported chapter order/type/visibility did not survive reload");
    }

    const reorderedChapters = await requestJson<Array<{
      id: string;
      number: number;
      type: string;
      visibility: { mode: string; conditionKey?: string; includeInToc: boolean };
    }>>(baseUrl, "/api/admin/chapters", {
      headers: { cookie },
    });
    const reorderedImport = reorderedChapters.body.find((chapterItem) => chapterItem.id === importedChapterId);
    if (
      reorderedChapters.status !== 200
      || !reorderedImport
      || reorderedImport.number !== 96
      || reorderedImport.type !== "conditional"
      || reorderedImport.visibility.mode !== "conditional"
      || reorderedImport.visibility.conditionKey !== "smoke-authoring-gate"
      || reorderedImport.visibility.includeInToc
    ) {
      throw new Error("Imported chapter order/type/visibility did not survive chapter list reload");
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

    const updatedCue = await requestJson<{ volume: number; startAnchor: { blockId: string } }>(
      baseUrl,
      `/api/admin/audio/cues/${encodeURIComponent(cue.body.id)}`,
      {
        method: "PUT",
        headers: { cookie },
        body: JSON.stringify({
          volume: 0.33,
          startBlockId: "blk_ch_chapter1_2",
          endBlockId: "blk_ch_chapter1_2",
        }),
      },
    );
    if (updatedCue.status !== 200 || updatedCue.body.volume !== 0.33 || updatedCue.body.startAnchor.blockId !== "blk_ch_chapter1_2") {
      throw new Error("Audio studio API did not update cue placement");
    }

    const deleteCue = await fetch(`${baseUrl}/api/admin/audio/cues/${encodeURIComponent(cue.body.id)}`, {
      method: "DELETE",
      headers: { cookie },
    });
    if (deleteCue.status !== 200) {
      throw new Error("Audio studio API did not delete smoke cue");
    }

    const stagingSlug = `smoke-staging-${Date.now()}`;
    const stagingTitle = `Smoke Staging ${Date.now()}`;
    const originalHtml = [
      `<h2 class="chapter-title">${stagingTitle}</h2>`,
      "<p>Disposable staging chapter publish baseline.</p>",
      "<p>Disposable cue anchor target.</p>",
    ].join("\n");

    const staging = await requestJson<{ id: string; status: string; html: string }>(baseUrl, "/api/admin/chapters", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        slug: stagingSlug,
        title: stagingTitle,
        html: originalHtml,
      }),
    });
    disposableChapterId = staging.body.id;
    if (staging.status !== 201 || staging.body.status !== "draft" || !disposableChapterId) {
      throw new Error("Disposable staging chapter was not created as a draft");
    }

    const stagingPreview = await requestJson<{ status: string }>(
      baseUrl,
      `/api/admin/chapters/${encodeURIComponent(disposableChapterId)}/preview`,
      {
        method: "POST",
        headers: { cookie },
      },
    );
    if (stagingPreview.status !== 200 || stagingPreview.body.status !== "preview") {
      throw new Error("Disposable staging chapter preview failed");
    }

    const firstPublish = await requestJson<{ status: string }>(
      baseUrl,
      `/api/admin/chapters/${encodeURIComponent(disposableChapterId)}/publish`,
      {
        method: "POST",
        headers: { cookie },
      },
    );
    if (firstPublish.status !== 200 || firstPublish.body.status !== "published") {
      throw new Error("Disposable staging chapter initial publish failed");
    }

    const versions = await requestJson<{ versions: Array<{ id: string; status: string; rollbackEligible: boolean }> }>(
      baseUrl,
      `/api/admin/chapters/${encodeURIComponent(disposableChapterId)}/versions`,
      { headers: { cookie } },
    );
    const firstPublishedVersion = versions.body.versions.find(
      (version) => version.status === "published" && version.rollbackEligible,
    );
    if (versions.status !== 200 || !firstPublishedVersion) {
      throw new Error("Disposable staging chapter did not expose rollback-eligible publish version");
    }

    const stagingCue = await requestJson<{ id: string }>(baseUrl, "/api/admin/audio/cues", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        chapterId: disposableChapterId,
        assetId: asset.body.id,
        layer: "music",
        startBlockId: `blk_${disposableChapterId}_3`,
        endBlockId: `blk_${disposableChapterId}_3`,
      }),
    });
    disposableCueId = stagingCue.body.id;
    if (stagingCue.status !== 201 || !disposableCueId) {
      throw new Error("Disposable staging chapter cue was not created");
    }

    const brokenUpdate = await requestJson<{ status: string }>(
      baseUrl,
      `/api/admin/chapters/${encodeURIComponent(disposableChapterId)}`,
      {
        method: "PUT",
        headers: { cookie },
        body: JSON.stringify({
          html: [
            `<h2 class="chapter-title">${stagingTitle}</h2>`,
            "<p>Revised staging chapter intentionally removes the cue anchor.</p>",
          ].join("\n"),
        }),
      },
    );
    if (brokenUpdate.status !== 200 || brokenUpdate.body.status !== "draft") {
      throw new Error("Disposable staging chapter broken-cue edit did not persist as draft");
    }

    const blockedPublish = await requestJson<{ error?: string; brokenCues?: string[] }>(
      baseUrl,
      `/api/admin/chapters/${encodeURIComponent(disposableChapterId)}/publish`,
      {
        method: "POST",
        headers: { cookie },
      },
    );
    if (
      blockedPublish.status !== 409
      || !blockedPublish.body.error?.includes("broken cues")
      || !Array.isArray(blockedPublish.body.brokenCues)
      || blockedPublish.body.brokenCues.length === 0
    ) {
      throw new Error("Disposable staging chapter publish was not blocked by a broken cue");
    }

    const repairedStagingCue = await requestJson<{ status: string }>(
      baseUrl,
      `/api/admin/audio/cues/${encodeURIComponent(disposableCueId)}/repair`,
      {
        method: "POST",
        headers: { cookie },
      },
    );
    if (repairedStagingCue.status !== 200 || repairedStagingCue.body.status !== "valid") {
      throw new Error("Disposable staging chapter cue repair endpoint failed");
    }

    const repairedStudio = await requestJson<{ canPublish: boolean; blockingIssues: string[] }>(
      baseUrl,
      `/api/admin/audio/studio?chapterId=${encodeURIComponent(disposableChapterId)}`,
      {
        headers: { cookie },
      },
    );
    if (repairedStudio.status !== 200 || !repairedStudio.body.canPublish || repairedStudio.body.blockingIssues.length !== 0) {
      throw new Error("Audio studio readiness did not clear after cue repair");
    }

    const secondPublish = await requestJson<{ status: string }>(
      baseUrl,
      `/api/admin/chapters/${encodeURIComponent(disposableChapterId)}/publish`,
      {
        method: "POST",
        headers: { cookie },
      },
    );
    if (secondPublish.status !== 200 || secondPublish.body.status !== "published") {
      throw new Error("Disposable staging chapter publish did not recover after cue repair");
    }

    const rollback = await requestJson<{ status: string; html: string }>(
      baseUrl,
      `/api/admin/chapters/${encodeURIComponent(disposableChapterId)}/rollback`,
      {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ versionId: firstPublishedVersion.id }),
      },
    );
    if (
      rollback.status !== 200
      || rollback.body.status !== "published"
      || !rollback.body.html.includes("Disposable cue anchor target")
    ) {
      throw new Error("Disposable staging chapter rollback did not restore the original published snapshot");
    }

    const analytics = await requestJson<{ events: Array<{ eventType: string }> }>(baseUrl, "/api/admin/analytics/events", {
      headers: { cookie },
    });
    if (analytics.status !== 200 || analytics.body.events.length === 0) {
      throw new Error("Analytics/audit events endpoint returned no events");
    }
    const eventTypes = new Set(analytics.body.events.map((event) => event.eventType));
    for (const expectedEvent of ["chapter_published", "chapter_publish_blocked", "chapter_rolled_back"]) {
      if (!eventTypes.has(expectedEvent)) {
        throw new Error(`Analytics/audit events did not include ${expectedEvent}`);
      }
    }
  } finally {
    if (adminCookie && disposableCueId) {
      await fetch(`${baseUrl}/api/admin/audio/cues/${encodeURIComponent(disposableCueId)}`, {
        method: "DELETE",
        headers: { cookie: adminCookie },
      }).catch(() => undefined);
    }
    if (adminCookie && disposableChapterId) {
      await fetch(`${baseUrl}/api/admin/chapters/${encodeURIComponent(disposableChapterId)}`, {
        method: "DELETE",
        headers: { cookie: adminCookie },
      }).catch(() => undefined);
    }
    if (adminCookie && importedChapterId) {
      await fetch(`${baseUrl}/api/admin/chapters/${encodeURIComponent(importedChapterId)}`, {
        method: "DELETE",
        headers: { cookie: adminCookie },
      }).catch(() => undefined);
    }
    await closeTarget(target);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
