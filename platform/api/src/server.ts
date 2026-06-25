import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import { URL } from "node:url";
import { Pool } from "pg";
import {
  AudioAssetRecord,
  AudioAssetType,
  AudioCueRecord,
  CueLayer,
  CueOverlapMode,
  makeAudioAssetId,
  makeCueId,
  nowAudioIso,
} from "../../shared/src/audio/cue-schema";
import {
  ChapterRecord,
  ChapterStatus,
  ChapterVersionRecord,
  CompiledChapterOutput,
  DocumentBlock,
  DocumentBlockType,
  NormalizedDocument,
  SourceImportMeta,
  defaultVisibility,
  makeChapterId,
  makeVersionId,
  nowIso,
} from "../../shared/src/document/schema";
import { AuthSessionRecord, UserRecord, makeSessionId, makeUserId, normalizeEmail } from "../../shared/src/users/schema";
import {
  ImportJobRecord,
  StagedChapterDraft,
  StagedChapterMetadata,
  makeDefaultStagedMetadata,
  makeImportJobId,
  makeStagedDraftId,
} from "../../shared/src/import/schema";
import { compileChapter } from "./compile/chapter.compiler";
import { applyMigrations, createPostgresPool } from "./db/postgres";
import { hashPassword, needsPasswordRehash, verifyPassword } from "./users/user.repository";

const mammoth: {
  convertToHtml(input: { buffer: Buffer }): Promise<{ value: string; messages: Array<{ message: string }> }>;
} = require("mammoth");

export interface CreateBookServerOptions {
  mode?: "memory" | "postgres";
  rootDir?: string;
  databaseUrl?: string;
  bootstrapAdmin?: AdminBootstrapConfig;
}

interface AdminBootstrapConfig {
  email: string;
  password: string;
  displayName?: string;
}

interface PublicChapter {
  id: string;
  slug: string;
  title: string;
  number: number;
  status: ChapterStatus;
}

interface ContentStore {
  bootstrapFromStatic(): Promise<void>;
  listPublishedChapters(): Promise<PublicChapter[]>;
  getPublishedChapter(slug: string): Promise<ChapterRecord | undefined>;
  searchPublishedChapters(query: string): Promise<Array<{ chapterId: string; title: string; excerpt: string }>>;
  listAdminChapters(): Promise<ChapterRecord[]>;
  getChapter(chapterId: string): Promise<ChapterRecord | undefined>;
  createChapter(input: CreateAdminChapterInput): Promise<ChapterRecord>;
  updateChapter(chapterId: string, updates: UpdateAdminChapterInput): Promise<ChapterRecord>;
  setChapterStatus(chapterId: string, status: ChapterStatus): Promise<ChapterRecord>;
  listVersions(chapterId: string): Promise<ChapterVersionRecord[]>;
  rollbackChapter(chapterId: string, versionId: string): Promise<ChapterRecord>;
  deleteChapter(chapterId: string): Promise<void>;
}

interface CreateAdminChapterInput {
  slug: string;
  title: string;
  html?: string;
  normalizedDocument?: NormalizedDocument;
  orderIndex?: number;
  type?: ChapterRecord["type"];
  visibility?: ChapterRecord["visibility"];
  theme?: ChapterRecord["theme"];
  sourceImport?: SourceImportMeta;
}

interface UpdateAdminChapterInput {
  slug?: string;
  title?: string;
  html?: string;
  normalizedDocument?: NormalizedDocument;
  orderIndex?: number;
  type?: ChapterRecord["type"];
  visibility?: ChapterRecord["visibility"];
  theme?: ChapterRecord["theme"];
}

interface AuthStore {
  bootstrapAdmin(config: AdminBootstrapConfig | undefined): Promise<void>;
  registerReader(email: string, password: string, displayName?: string): Promise<{ user: UserRecord; session: AuthSessionRecord }>;
  login(email: string, password: string): Promise<{ user: UserRecord; session: AuthSessionRecord }>;
  session(token: string | undefined): Promise<{ user: UserRecord; session: AuthSessionRecord } | undefined>;
  logout(token: string | undefined): Promise<void>;
}

interface ImportDraftStore {
  importDocx(input: {
    fileName: string;
    contentBase64: string;
    metadata?: Partial<StagedChapterMetadata>;
  }): Promise<StagedChapterDraft>;
  listDrafts(): Promise<StagedChapterDraft[]>;
  updateDraftMetadata(draftId: string, patch: Partial<StagedChapterMetadata>): Promise<StagedChapterDraft>;
  approveDraft(draftId: string): Promise<{ draft: StagedChapterDraft; chapter: ChapterRecord }>;
  rejectDraft(draftId: string, reason: string): Promise<StagedChapterDraft>;
}

interface ReaderStateRecord {
  progress: Record<string, unknown>;
  highlights: unknown[];
  notes: unknown[];
  preferences: Record<string, unknown>;
  updatedAt: string;
}

interface ReaderStateStore {
  get(userId: string): Promise<ReaderStateRecord>;
  save(userId: string, input: Partial<Omit<ReaderStateRecord, "updatedAt">>): Promise<ReaderStateRecord>;
}

interface AppEventRecord {
  id: string;
  eventType: string;
  actorUserId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface AppEventStore {
  record(eventType: string, actorUserId: string | undefined, payload: Record<string, unknown>): Promise<AppEventRecord>;
  list(limit?: number): Promise<AppEventRecord[]>;
}

interface AudioStore {
  listAssets(): Promise<AudioAssetRecord[]>;
  createAsset(input: {
    fileName: string;
    title: string;
    type: AudioAssetType;
    contentBase64: string;
    durationSeconds: number;
    defaultVolume?: number;
  }): Promise<AudioAssetRecord>;
  listCues(chapterId?: string): Promise<AudioCueRecord[]>;
  createCue(input: {
    chapterId: string;
    assetId: string;
    layer: CueLayer;
    startBlockId: string;
    endBlockId: string;
    volume?: number;
    fadeInMs?: number;
    fadeOutMs?: number;
    loop?: boolean;
    overlapMode?: CueOverlapMode;
  }): Promise<AudioCueRecord>;
  updateCue(cueId: string, updates: {
    assetId?: string;
    layer?: CueLayer;
    startBlockId?: string;
    endBlockId?: string;
    volume?: number;
    fadeInMs?: number;
    fadeOutMs?: number;
    loop?: boolean;
    overlapMode?: CueOverlapMode;
  }): Promise<AudioCueRecord>;
  repairCue(cueId: string, content: ContentStore): Promise<AudioCueRecord>;
  deleteCue(cueId: string): Promise<void>;
}

function rootFromOptions(options: CreateBookServerOptions): string {
  return options.rootDir ?? process.cwd();
}

function envValue(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function validateAdminBootstrapConfig(config: AdminBootstrapConfig | undefined): AdminBootstrapConfig | undefined {
  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Production admin bootstrap requires ADMIN_EMAIL and ADMIN_PASSWORD.");
    }
    return undefined;
  }

  const email = config.email.trim();
  const password = config.password.trim();
  if (!email || !password) {
    throw new Error("Admin bootstrap requires both ADMIN_EMAIL and ADMIN_PASSWORD.");
  }

  if (process.env.NODE_ENV === "production" && password === "change-me-admin") {
    throw new Error("ADMIN_PASSWORD must not use the old default admin password in production.");
  }

  return { email, password, displayName: config.displayName };
}

function readAdminBootstrapConfig(options: CreateBookServerOptions): AdminBootstrapConfig | undefined {
  if (options.bootstrapAdmin) {
    return validateAdminBootstrapConfig(options.bootstrapAdmin);
  }

  const email = envValue("ADMIN_EMAIL");
  const password = envValue("ADMIN_PASSWORD");
  return validateAdminBootstrapConfig(email || password ? { email: email ?? "", password: password ?? "" } : undefined);
}

function stripTags(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveTitle(html: string, fallback: string): string {
  const match = /<h[12][^>]*class=["'][^"']*chapter-title[^"']*["'][^>]*>([\s\S]*?)<\/h[12]>/i.exec(html);
  if (!match) {
    return fallback;
  }

  return stripTags(match[1]).replace(/\.$/, "") || fallback;
}

function normalizeHtmlChapter(chapterId: string, html: string): NormalizedDocument {
  const blocks: DocumentBlock[] = [];
  const regex = /<(h[1-6]|p|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(html))) {
    const tag = match[1].toLowerCase();
    const text = stripTags(match[2]);
    if (!text) {
      continue;
    }

    const type: DocumentBlockType = tag === "blockquote" ? "blockquote" : tag.startsWith("h") ? "heading" : "paragraph";
    blocks.push({
      id: `blk_${chapterId}_${index + 1}`,
      type,
      level: tag.startsWith("h") ? Number(tag.slice(1)) : undefined,
      spans: [{ id: `spn_${chapterId}_${index + 1}_1`, text }],
      sourceHint: "html-fragment",
    });
    index += 1;
  }

  return { schemaVersion: 1, blocks };
}

function compileRawHtml(chapterId: string, html: string, normalizedDocument: NormalizedDocument): CompiledChapterOutput {
  const wordCount = normalizedDocument.blocks
    .flatMap((block) => block.spans.map((span) => span.text))
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;

  return {
    html,
    runtime: {
      chapterId,
      blockOrder: normalizedDocument.blocks.map((block) => block.id),
      wordCount,
      generatedAt: nowIso(),
    },
  };
}

function compileNormalizedChapter(chapterId: string, normalizedDocument: NormalizedDocument): CompiledChapterOutput {
  return compileChapter(chapterId, normalizedDocument);
}

function sourceImport(sourceType: SourceImportMeta["sourceType"], sourceFile: string): SourceImportMeta {
  return {
    sourceType,
    sourceFile,
    importedAt: nowIso(),
    warnings: [],
  };
}

function makeChapterRecord(input: {
  slug: string;
  title: string;
  number: number;
  html?: string;
  normalizedDocument?: NormalizedDocument;
  compiledOutput?: CompiledChapterOutput;
  sourceFile: string;
  sourceType?: SourceImportMeta["sourceType"];
  status?: ChapterStatus;
  type?: ChapterRecord["type"];
  visibility?: ChapterRecord["visibility"];
  theme?: ChapterRecord["theme"];
  sourceImport?: SourceImportMeta;
}): ChapterRecord {
  const id = makeChapterId(input.slug);
  const now = nowIso();
  const html = input.html ?? "";
  const normalizedDocument = input.normalizedDocument ?? normalizeHtmlChapter(id, html);
  const compiledOutput = input.compiledOutput
    ?? (input.normalizedDocument
      ? compileNormalizedChapter(id, normalizedDocument)
      : compileRawHtml(id, html, normalizedDocument));

  return {
    id,
    slug: input.slug,
    title: input.title,
    orderIndex: input.number,
    status: input.status ?? "published",
    type: input.type ?? "standard",
    visibility: input.visibility ?? defaultVisibility(),
    theme: input.theme ?? {},
    sourceImport: input.sourceImport ?? sourceImport(input.sourceType ?? "html-fragment", input.sourceFile),
    normalizedDocument,
    compiledOutput,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function publicChapter(chapter: ChapterRecord): PublicChapter {
  return {
    id: chapter.slug,
    slug: chapter.slug,
    title: chapter.title,
    number: chapter.orderIndex,
    status: chapter.status,
  };
}

async function readStaticChapters(rootDir: string): Promise<ChapterRecord[]> {
  const manifestPath = path.join(rootDir, "chapters", "index.json");
  const manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8")) as Array<{
    id: string;
    file: string;
    title: string;
    number: number;
  }>;

  const chapters: ChapterRecord[] = [];
  for (const entry of manifest) {
    const chapterPath = path.join(rootDir, "chapters", entry.file);
    const html = await fs.promises.readFile(chapterPath, "utf8");
    chapters.push(makeChapterRecord({
      slug: entry.id,
      title: deriveTitle(html, entry.title),
      number: entry.number,
      html,
      sourceFile: entry.file,
    }));
  }

  return chapters;
}

function slugFromFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/\.docx$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";
}

function titleFromDocument(document: NormalizedDocument, fallbackSlug: string): string {
  const heading = document.blocks.find((block) => block.type === "heading");
  const title = heading?.spans.map((span) => span.text).join(" ").trim();
  if (title) {
    return title;
  }

  return fallbackSlug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function validateStagedMetadata(metadata: StagedChapterMetadata): string[] {
  const errors: string[] = [];
  if (!metadata.title || metadata.title.trim().length < 2) {
    errors.push("Title must be at least 2 characters");
  }
  if (!/^[a-z0-9-]+$/.test(metadata.slug)) {
    errors.push("Slug must contain lowercase letters, numbers, and hyphens only");
  }
  if (!Number.isInteger(metadata.orderIndex) || metadata.orderIndex < 0) {
    errors.push("Order index must be a non-negative integer");
  }
  if (metadata.visibility.mode === "conditional" && !metadata.visibility.conditionKey) {
    errors.push("Conditional visibility requires a conditionKey");
  }
  return errors;
}

function buildStagedDraft(input: {
  fileName: string;
  warnings: string[];
  normalizedDocument: NormalizedDocument;
  metadata?: Partial<StagedChapterMetadata>;
}): { job: ImportJobRecord; draft: StagedChapterDraft } {
  const slug = slugFromFileName(input.fileName);
  const metadata: StagedChapterMetadata = {
    ...makeDefaultStagedMetadata(titleFromDocument(input.normalizedDocument, slug), slug),
    ...input.metadata,
  };
  const now = nowIso();
  const job: ImportJobRecord = {
    id: makeImportJobId(input.fileName),
    fileName: input.fileName,
    status: "succeeded",
    warnings: input.warnings,
    createdAt: now,
    updatedAt: now,
  };
  const draft: StagedChapterDraft = {
    id: makeStagedDraftId(metadata.slug),
    jobId: job.id,
    metadata,
    normalizedDocument: input.normalizedDocument,
    compiledPreview: compileNormalizedChapter(`preview_${metadata.slug}`, input.normalizedDocument),
    status: "staged",
    validationErrors: validateStagedMetadata(metadata),
    createdAt: now,
    updatedAt: now,
  };

  return { job, draft };
}

async function importDocxToDraft(input: {
  fileName: string;
  contentBase64: string;
  metadata?: Partial<StagedChapterMetadata>;
}): Promise<{ job: ImportJobRecord; draft: StagedChapterDraft }> {
  const converted = await mammoth.convertToHtml({ buffer: Buffer.from(input.contentBase64, "base64") });
  const slug = slugFromFileName(input.fileName);
  return buildStagedDraft({
    fileName: input.fileName,
    warnings: converted.messages.map((message) => message.message),
    normalizedDocument: normalizeHtmlChapter(`preview_${slug}`, converted.value),
    metadata: input.metadata,
  });
}

function touchDraftStatus(draft: StagedChapterDraft, status: StagedChapterDraft["status"], rejectionReason?: string): StagedChapterDraft {
  return {
    ...draft,
    status,
    rejectionReason,
    updatedAt: nowIso(),
  };
}

class MemoryContentStore implements ContentStore {
  private chapters: ChapterRecord[] = [];
  private versions: ChapterVersionRecord[] = [];

  constructor(private readonly rootDir: string) {}

  async bootstrapFromStatic(): Promise<void> {
    if (this.chapters.length > 0) {
      return;
    }

    this.chapters = await readStaticChapters(this.rootDir);
    this.versions = this.chapters.map((chapter) => ({
      id: makeVersionId(chapter.id, 1),
      chapterId: chapter.id,
      status: chapter.status,
      normalizedSnapshot: chapter.normalizedDocument,
      compiledSnapshot: chapter.compiledOutput,
      rollbackEligible: chapter.status === "published",
      publishedAt: chapter.status === "published" ? nowIso() : undefined,
      createdAt: nowIso(),
    }));
  }

  async listPublishedChapters(): Promise<PublicChapter[]> {
    return this.chapters.filter((chapter) => chapter.status === "published").sort((a, b) => a.orderIndex - b.orderIndex).map(publicChapter);
  }

  async getPublishedChapter(slug: string): Promise<ChapterRecord | undefined> {
    return this.chapters.find((chapter) => chapter.slug === slug && chapter.status === "published");
  }

  async searchPublishedChapters(query: string): Promise<Array<{ chapterId: string; title: string; excerpt: string }>> {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return [];
    }

    return this.chapters
      .filter((chapter) => chapter.status === "published")
      .flatMap((chapter) => {
        const text = stripTags(chapter.compiledOutput.html);
        const index = text.toLowerCase().indexOf(needle);
        if (index === -1) {
          return [];
        }
        const start = Math.max(0, index - 80);
        return [{
          chapterId: chapter.slug,
          title: chapter.title,
          excerpt: text.slice(start, index + needle.length + 120).trim(),
        }];
      });
  }

  async listAdminChapters(): Promise<ChapterRecord[]> {
    return [...this.chapters].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getChapter(chapterId: string): Promise<ChapterRecord | undefined> {
    return this.chapters.find((chapter) => chapter.id === chapterId || chapter.slug === chapterId);
  }

  async updateChapter(chapterId: string, updates: UpdateAdminChapterInput): Promise<ChapterRecord> {
    const chapter = await this.getChapter(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const html = updates.html ?? chapter.compiledOutput.html;
    const normalizedDocument = updates.normalizedDocument ?? normalizeHtmlChapter(chapter.id, html);
    const title = updates.title ?? deriveTitle(html, chapter.title);
    const next = {
      ...chapter,
      slug: updates.slug ?? chapter.slug,
      title,
      orderIndex: updates.orderIndex ?? chapter.orderIndex,
      type: updates.type ?? chapter.type,
      visibility: updates.visibility ?? chapter.visibility,
      theme: updates.theme ?? chapter.theme,
      status: "draft" as ChapterStatus,
      normalizedDocument,
      compiledOutput: updates.normalizedDocument
        ? compileNormalizedChapter(chapter.id, normalizedDocument)
        : compileRawHtml(chapter.id, html, normalizedDocument),
      updatedAt: nowIso(),
    };
    this.chapters = this.chapters.map((item) => (item.id === chapter.id ? next : item));
    return next;
  }

  async createChapter(input: CreateAdminChapterInput): Promise<ChapterRecord> {
    const chapter = makeChapterRecord({
      slug: input.slug,
      title: input.title,
      number: input.orderIndex ?? this.chapters.length + 1,
      html: input.html,
      normalizedDocument: input.normalizedDocument,
      sourceFile: "admin-staging",
      sourceImport: input.sourceImport,
      type: input.type,
      visibility: input.visibility,
      theme: input.theme,
      status: "draft",
    });
    this.chapters = this.chapters.filter((item) => item.id !== chapter.id && item.slug !== chapter.slug);
    this.chapters.push(chapter);
    this.versions.push({
      id: makeVersionId(chapter.id, chapter.version),
      chapterId: chapter.id,
      status: "draft",
      normalizedSnapshot: chapter.normalizedDocument,
      compiledSnapshot: chapter.compiledOutput,
      rollbackEligible: false,
      createdAt: nowIso(),
    });
    return chapter;
  }

  async setChapterStatus(chapterId: string, status: ChapterStatus): Promise<ChapterRecord> {
    const chapter = await this.getChapter(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const next = { ...chapter, status, version: chapter.version + 1, updatedAt: nowIso() };
    this.chapters = this.chapters.map((item) => (item.id === chapter.id ? next : item));
    this.versions.push({
      id: makeVersionId(chapter.id, next.version),
      chapterId: chapter.id,
      status,
      normalizedSnapshot: next.normalizedDocument,
      compiledSnapshot: next.compiledOutput,
      rollbackEligible: status === "published",
      publishedAt: status === "published" ? nowIso() : undefined,
      createdAt: nowIso(),
    });
    return next;
  }

  async listVersions(chapterId: string): Promise<ChapterVersionRecord[]> {
    const chapter = await this.getChapter(chapterId);
    const id = chapter?.id ?? chapterId;
    return this.versions.filter((version) => version.chapterId === id);
  }

  async rollbackChapter(chapterId: string, versionId: string): Promise<ChapterRecord> {
    const chapter = await this.getChapter(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const version = this.versions.find((item) => item.chapterId === chapter.id && item.id === versionId);
    if (!version || !version.rollbackEligible) {
      throw new Error(`Rollback version not found: ${versionId}`);
    }

    const nextVersion = this.versions.filter((item) => item.chapterId === chapter.id).length + 1;
    const next: ChapterRecord = {
      ...chapter,
      status: "published",
      normalizedDocument: version.normalizedSnapshot,
      compiledOutput: version.compiledSnapshot,
      version: nextVersion,
      updatedAt: nowIso(),
    };
    this.chapters = this.chapters.map((item) => (item.id === chapter.id ? next : item));
    this.versions.push({
      id: makeVersionId(chapter.id, nextVersion),
      chapterId: chapter.id,
      status: "published",
      normalizedSnapshot: next.normalizedDocument,
      compiledSnapshot: next.compiledOutput,
      rollbackEligible: true,
      publishedAt: nowIso(),
      createdAt: nowIso(),
    });
    return next;
  }

  async deleteChapter(chapterId: string): Promise<void> {
    const chapter = await this.getChapter(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }
    this.chapters = this.chapters.filter((item) => item.id !== chapter.id);
    this.versions = this.versions.filter((version) => version.chapterId !== chapter.id);
  }
}

class PostgresContentStore implements ContentStore {
  constructor(private readonly pool: Pool, private readonly rootDir: string) {}

  async bootstrapFromStatic(): Promise<void> {
    const existing = await this.pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM chapters");
    if (Number(existing.rows[0]?.count ?? 0) > 0) {
      return;
    }

    const chapters = await readStaticChapters(this.rootDir);
    for (const chapter of chapters) {
      await this.upsertChapter(chapter);
      await this.insertVersion(chapter, "published");
    }
  }

  async listPublishedChapters(): Promise<PublicChapter[]> {
    const chapters = await this.listAdminChapters();
    return chapters.filter((chapter) => chapter.status === "published").map(publicChapter);
  }

  async getPublishedChapter(slug: string): Promise<ChapterRecord | undefined> {
    const result = await this.pool.query("SELECT * FROM chapters WHERE slug = $1 AND status = 'published'", [slug]);
    return result.rows[0] ? this.rowToChapter(result.rows[0] as Record<string, unknown>) : undefined;
  }

  async searchPublishedChapters(query: string): Promise<Array<{ chapterId: string; title: string; excerpt: string }>> {
    const needle = query.trim();
    if (!needle) {
      return [];
    }

    const chapters = await this.listAdminChapters();
    return chapters
      .filter((chapter) => chapter.status === "published")
      .flatMap((chapter) => {
        const text = stripTags(chapter.compiledOutput.html);
        const index = text.toLowerCase().indexOf(needle.toLowerCase());
        if (index === -1) {
          return [];
        }
        const start = Math.max(0, index - 80);
        return [{
          chapterId: chapter.slug,
          title: chapter.title,
          excerpt: text.slice(start, index + needle.length + 120).trim(),
        }];
      });
  }

  async listAdminChapters(): Promise<ChapterRecord[]> {
    const result = await this.pool.query("SELECT * FROM chapters ORDER BY order_index ASC");
    return result.rows.map((row) => this.rowToChapter(row as Record<string, unknown>));
  }

  async getChapter(chapterId: string): Promise<ChapterRecord | undefined> {
    const result = await this.pool.query("SELECT * FROM chapters WHERE id = $1 OR slug = $1", [chapterId]);
    return result.rows[0] ? this.rowToChapter(result.rows[0] as Record<string, unknown>) : undefined;
  }

  async updateChapter(chapterId: string, updates: UpdateAdminChapterInput): Promise<ChapterRecord> {
    const current = await this.getChapter(chapterId);
    if (!current) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const html = updates.html ?? current.compiledOutput.html;
    const normalizedDocument = updates.normalizedDocument ?? normalizeHtmlChapter(current.id, html);
    const next: ChapterRecord = {
      ...current,
      slug: updates.slug ?? current.slug,
      title: updates.title ?? deriveTitle(html, current.title),
      orderIndex: updates.orderIndex ?? current.orderIndex,
      type: updates.type ?? current.type,
      visibility: updates.visibility ?? current.visibility,
      theme: updates.theme ?? current.theme,
      status: "draft",
      normalizedDocument,
      compiledOutput: updates.normalizedDocument
        ? compileNormalizedChapter(current.id, normalizedDocument)
        : compileRawHtml(current.id, html, normalizedDocument),
      updatedAt: nowIso(),
    };
    await this.upsertChapter(next);
    return next;
  }

  async createChapter(input: CreateAdminChapterInput): Promise<ChapterRecord> {
    const existing = await this.listAdminChapters();
    const chapter = makeChapterRecord({
      slug: input.slug,
      title: input.title,
      number: input.orderIndex ?? existing.length + 1,
      html: input.html,
      normalizedDocument: input.normalizedDocument,
      sourceFile: "admin-staging",
      sourceImport: input.sourceImport,
      type: input.type,
      visibility: input.visibility,
      theme: input.theme,
      status: "draft",
    });
    await this.upsertChapter(chapter);
    await this.insertVersion(chapter, "draft");
    return chapter;
  }

  async setChapterStatus(chapterId: string, status: ChapterStatus): Promise<ChapterRecord> {
    const current = await this.getChapter(chapterId);
    if (!current) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const next = { ...current, status, version: current.version + 1, updatedAt: nowIso() };
    await this.upsertChapter(next);
    await this.insertVersion(next, status);
    return next;
  }

  async listVersions(chapterId: string): Promise<ChapterVersionRecord[]> {
    const chapter = await this.getChapter(chapterId);
    const id = chapter?.id ?? chapterId;
    const result = await this.pool.query("SELECT * FROM chapter_versions WHERE chapter_id = $1 ORDER BY created_at ASC", [id]);
    return result.rows.map((row) => this.rowToVersion(row as Record<string, unknown>));
  }

  async rollbackChapter(chapterId: string, versionId: string): Promise<ChapterRecord> {
    const current = await this.getChapter(chapterId);
    if (!current) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const result = await this.pool.query(
      "SELECT * FROM chapter_versions WHERE chapter_id = $1 AND id = $2 AND rollback_eligible = 1",
      [current.id, versionId],
    );
    const version = result.rows[0] ? this.rowToVersion(result.rows[0] as Record<string, unknown>) : undefined;
    if (!version) {
      throw new Error(`Rollback version not found: ${versionId}`);
    }

    const next: ChapterRecord = {
      ...current,
      status: "published",
      normalizedDocument: version.normalizedSnapshot,
      compiledOutput: version.compiledSnapshot,
      version: current.version + 1,
      updatedAt: nowIso(),
    };
    await this.upsertChapter(next);
    await this.insertVersion(next, "published");
    return next;
  }

  async deleteChapter(chapterId: string): Promise<void> {
    const chapter = await this.getChapter(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }
    await this.pool.query("DELETE FROM chapter_versions WHERE chapter_id = $1", [chapter.id]);
    await this.pool.query("DELETE FROM chapters WHERE id = $1", [chapter.id]);
  }

  private async upsertChapter(chapter: ChapterRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO chapters (
        id, slug, title, order_index, status, chapter_type, visibility_json, theme_json,
        source_import_json, normalized_document_json, compiled_output_json, version, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug,
        title = EXCLUDED.title,
        order_index = EXCLUDED.order_index,
        status = EXCLUDED.status,
        chapter_type = EXCLUDED.chapter_type,
        visibility_json = EXCLUDED.visibility_json,
        theme_json = EXCLUDED.theme_json,
        source_import_json = EXCLUDED.source_import_json,
        normalized_document_json = EXCLUDED.normalized_document_json,
        compiled_output_json = EXCLUDED.compiled_output_json,
        version = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at`,
      [
        chapter.id,
        chapter.slug,
        chapter.title,
        chapter.orderIndex,
        chapter.status,
        chapter.type,
        JSON.stringify(chapter.visibility),
        JSON.stringify(chapter.theme),
        JSON.stringify(chapter.sourceImport),
        JSON.stringify(chapter.normalizedDocument),
        JSON.stringify(chapter.compiledOutput),
        chapter.version,
        chapter.createdAt,
        chapter.updatedAt,
      ],
    );
  }

  private async insertVersion(chapter: ChapterRecord, status: ChapterStatus): Promise<void> {
    await this.pool.query(
      `INSERT INTO chapter_versions (
        id, chapter_id, status, normalized_snapshot_json, compiled_snapshot_json,
        published_at, rollback_eligible, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (id) DO NOTHING`,
      [
        makeVersionId(chapter.id, chapter.version),
        chapter.id,
        status,
        JSON.stringify(chapter.normalizedDocument),
        JSON.stringify(chapter.compiledOutput),
        status === "published" ? nowIso() : null,
        status === "published" ? 1 : 0,
        nowIso(),
      ],
    );
  }

  private rowToChapter(row: Record<string, unknown>): ChapterRecord {
    return {
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      orderIndex: Number(row.order_index),
      status: row.status as ChapterStatus,
      type: row.chapter_type as ChapterRecord["type"],
      visibility: JSON.parse(String(row.visibility_json)) as ChapterRecord["visibility"],
      theme: JSON.parse(String(row.theme_json)) as ChapterRecord["theme"],
      sourceImport: JSON.parse(String(row.source_import_json)) as ChapterRecord["sourceImport"],
      normalizedDocument: JSON.parse(String(row.normalized_document_json)) as NormalizedDocument,
      compiledOutput: JSON.parse(String(row.compiled_output_json)) as CompiledChapterOutput,
      version: Number(row.version),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private rowToVersion(row: Record<string, unknown>): ChapterVersionRecord {
    return {
      id: String(row.id),
      chapterId: String(row.chapter_id),
      status: row.status as ChapterStatus,
      normalizedSnapshot: JSON.parse(String(row.normalized_snapshot_json)) as NormalizedDocument,
      compiledSnapshot: JSON.parse(String(row.compiled_snapshot_json)) as CompiledChapterOutput,
      publishedAt: row.published_at ? String(row.published_at) : undefined,
      rollbackEligible: Number(row.rollback_eligible) === 1,
      createdAt: String(row.created_at),
    };
  }
}

class MemoryImportDraftStore implements ImportDraftStore {
  private jobs: ImportJobRecord[] = [];
  private drafts: StagedChapterDraft[] = [];

  constructor(private readonly content: ContentStore) {}

  async importDocx(input: {
    fileName: string;
    contentBase64: string;
    metadata?: Partial<StagedChapterMetadata>;
  }): Promise<StagedChapterDraft> {
    const { job, draft } = await importDocxToDraft(input);
    this.jobs.push(job);
    this.drafts.push(draft);
    return draft;
  }

  async listDrafts(): Promise<StagedChapterDraft[]> {
    return [...this.drafts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateDraftMetadata(draftId: string, patch: Partial<StagedChapterMetadata>): Promise<StagedChapterDraft> {
    const draft = this.requireDraft(draftId);
    const metadata = { ...draft.metadata, ...patch };
    const updated = {
      ...draft,
      metadata,
      validationErrors: validateStagedMetadata(metadata),
      updatedAt: nowIso(),
    };
    this.drafts = this.drafts.map((item) => (item.id === draftId ? updated : item));
    return updated;
  }

  async approveDraft(draftId: string): Promise<{ draft: StagedChapterDraft; chapter: ChapterRecord }> {
    const draft = this.requireDraft(draftId);
    if (draft.status !== "staged") {
      throw Object.assign(new Error(`Draft ${draft.id} is not staged`), { status: 409 });
    }
    if (draft.validationErrors.length > 0) {
      throw Object.assign(new Error(`Draft ${draft.id} has validation errors`), { status: 400 });
    }
    const job = this.jobs.find((item) => item.id === draft.jobId);
    const chapter = await this.content.createChapter({
      slug: draft.metadata.slug,
      title: draft.metadata.title,
      orderIndex: draft.metadata.orderIndex,
      type: draft.metadata.chapterType,
      visibility: draft.metadata.visibility,
      theme: draft.metadata.theme,
      normalizedDocument: draft.normalizedDocument,
      sourceImport: {
        sourceType: "docx",
        sourceFile: job?.fileName ?? "import.docx",
        importedAt: nowIso(),
        warnings: job?.warnings ?? [],
      },
    });
    const approved = touchDraftStatus(draft, "approved");
    this.drafts = this.drafts.map((item) => (item.id === draftId ? approved : item));
    return { draft: approved, chapter };
  }

  async rejectDraft(draftId: string, reason: string): Promise<StagedChapterDraft> {
    if (!reason.trim()) {
      throw Object.assign(new Error("Rejection reason is required"), { status: 400 });
    }
    const draft = this.requireDraft(draftId);
    const rejected = touchDraftStatus(draft, "rejected", reason.trim());
    this.drafts = this.drafts.map((item) => (item.id === draftId ? rejected : item));
    return rejected;
  }

  private requireDraft(draftId: string): StagedChapterDraft {
    const draft = this.drafts.find((item) => item.id === draftId);
    if (!draft) {
      throw Object.assign(new Error(`Draft not found: ${draftId}`), { status: 404 });
    }
    return draft;
  }
}

class PostgresImportDraftStore implements ImportDraftStore {
  constructor(private readonly pool: Pool, private readonly content: ContentStore) {}

  async importDocx(input: {
    fileName: string;
    contentBase64: string;
    metadata?: Partial<StagedChapterMetadata>;
  }): Promise<StagedChapterDraft> {
    const { job, draft } = await importDocxToDraft(input);
    await this.pool.query(
      `INSERT INTO import_jobs (id, file_name, status, warnings_json, error, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [job.id, job.fileName, job.status, JSON.stringify(job.warnings), job.error ?? null, job.createdAt, job.updatedAt],
    );
    await this.upsertDraft(draft);
    return draft;
  }

  async listDrafts(): Promise<StagedChapterDraft[]> {
    const result = await this.pool.query("SELECT * FROM staged_chapter_drafts ORDER BY created_at DESC");
    return result.rows.map((row) => this.rowToDraft(row as Record<string, unknown>));
  }

  async updateDraftMetadata(draftId: string, patch: Partial<StagedChapterMetadata>): Promise<StagedChapterDraft> {
    const draft = await this.requireDraft(draftId);
    const metadata = { ...draft.metadata, ...patch };
    const updated = {
      ...draft,
      metadata,
      validationErrors: validateStagedMetadata(metadata),
      updatedAt: nowIso(),
    };
    await this.upsertDraft(updated);
    return updated;
  }

  async approveDraft(draftId: string): Promise<{ draft: StagedChapterDraft; chapter: ChapterRecord }> {
    const draft = await this.requireDraft(draftId);
    if (draft.status !== "staged") {
      throw Object.assign(new Error(`Draft ${draft.id} is not staged`), { status: 409 });
    }
    if (draft.validationErrors.length > 0) {
      throw Object.assign(new Error(`Draft ${draft.id} has validation errors`), { status: 400 });
    }

    const job = await this.getJob(draft.jobId);
    const chapter = await this.content.createChapter({
      slug: draft.metadata.slug,
      title: draft.metadata.title,
      orderIndex: draft.metadata.orderIndex,
      type: draft.metadata.chapterType,
      visibility: draft.metadata.visibility,
      theme: draft.metadata.theme,
      normalizedDocument: draft.normalizedDocument,
      sourceImport: {
        sourceType: "docx",
        sourceFile: job?.fileName ?? "import.docx",
        importedAt: nowIso(),
        warnings: job?.warnings ?? [],
      },
    });
    const approved = touchDraftStatus(draft, "approved");
    await this.upsertDraft(approved);
    return { draft: approved, chapter };
  }

  async rejectDraft(draftId: string, reason: string): Promise<StagedChapterDraft> {
    if (!reason.trim()) {
      throw Object.assign(new Error("Rejection reason is required"), { status: 400 });
    }
    const draft = await this.requireDraft(draftId);
    const rejected = touchDraftStatus(draft, "rejected", reason.trim());
    await this.upsertDraft(rejected);
    return rejected;
  }

  private async getJob(jobId: string): Promise<ImportJobRecord | undefined> {
    const result = await this.pool.query("SELECT * FROM import_jobs WHERE id = $1", [jobId]);
    return result.rows[0] ? this.rowToJob(result.rows[0] as Record<string, unknown>) : undefined;
  }

  private async requireDraft(draftId: string): Promise<StagedChapterDraft> {
    const result = await this.pool.query("SELECT * FROM staged_chapter_drafts WHERE id = $1", [draftId]);
    if (!result.rows[0]) {
      throw Object.assign(new Error(`Draft not found: ${draftId}`), { status: 404 });
    }
    return this.rowToDraft(result.rows[0] as Record<string, unknown>);
  }

  private async upsertDraft(draft: StagedChapterDraft): Promise<void> {
    await this.pool.query(
      `INSERT INTO staged_chapter_drafts (
        id, job_id, metadata_json, normalized_document_json, compiled_preview_json,
        status, validation_errors_json, rejection_reason, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id) DO UPDATE SET
        metadata_json = EXCLUDED.metadata_json,
        normalized_document_json = EXCLUDED.normalized_document_json,
        compiled_preview_json = EXCLUDED.compiled_preview_json,
        status = EXCLUDED.status,
        validation_errors_json = EXCLUDED.validation_errors_json,
        rejection_reason = EXCLUDED.rejection_reason,
        updated_at = EXCLUDED.updated_at`,
      [
        draft.id,
        draft.jobId,
        JSON.stringify(draft.metadata),
        JSON.stringify(draft.normalizedDocument),
        JSON.stringify(draft.compiledPreview),
        draft.status,
        JSON.stringify(draft.validationErrors),
        draft.rejectionReason ?? null,
        draft.createdAt,
        draft.updatedAt,
      ],
    );
  }

  private rowToJob(row: Record<string, unknown>): ImportJobRecord {
    return {
      id: String(row.id),
      fileName: String(row.file_name),
      status: String(row.status) as ImportJobRecord["status"],
      warnings: JSON.parse(String(row.warnings_json)) as string[],
      error: row.error ? String(row.error) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private rowToDraft(row: Record<string, unknown>): StagedChapterDraft {
    return {
      id: String(row.id),
      jobId: String(row.job_id),
      metadata: JSON.parse(String(row.metadata_json)) as StagedChapterMetadata,
      normalizedDocument: JSON.parse(String(row.normalized_document_json)) as NormalizedDocument,
      compiledPreview: JSON.parse(String(row.compiled_preview_json)) as CompiledChapterOutput,
      status: String(row.status) as StagedChapterDraft["status"],
      validationErrors: JSON.parse(String(row.validation_errors_json)) as string[],
      rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}

class MemoryAuthStore implements AuthStore {
  private users: UserRecord[] = [];
  private sessions: AuthSessionRecord[] = [];

  async bootstrapAdmin(config: AdminBootstrapConfig | undefined): Promise<void> {
    if (!config) {
      return;
    }

    this.ensureUser(config.email, config.displayName ?? "Admin", "admin", config.password);
  }

  async registerReader(email: string, password: string, displayName?: string): Promise<{ user: UserRecord; session: AuthSessionRecord }> {
    const normalized = normalizeEmail(email);
    if (this.users.some((user) => user.email === normalized)) {
      throw Object.assign(new Error("User already exists"), { status: 409 });
    }

    this.ensureUser(normalized, displayName || "Reader", "reader", password);
    return this.login(normalized, password);
  }

  async login(email: string, password: string): Promise<{ user: UserRecord; session: AuthSessionRecord }> {
    const user = this.users.find((item) => item.email === normalizeEmail(email));
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new Error("Invalid credentials");
    }

    if (needsPasswordRehash(user.passwordHash)) {
      const passwordHash = hashPassword(password);
      this.users = this.users.map((item) => item.id === user.id ? { ...item, passwordHash, updatedAt: nowIso() } : item);
      user.passwordHash = passwordHash;
    }

    const session = this.createSession(user.id, user.role);
    return { user, session };
  }

  async session(token: string | undefined): Promise<{ user: UserRecord; session: AuthSessionRecord } | undefined> {
    if (!token) {
      return undefined;
    }

    const session = this.sessions.find((item) => item.token === token && !item.revokedAt && new Date(item.expiresAt).getTime() > Date.now());
    const user = session ? this.users.find((item) => item.id === session.userId) : undefined;
    return session && user ? { user, session } : undefined;
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) {
      return;
    }

    this.sessions = this.sessions.map((session) => session.token === token ? { ...session, revokedAt: nowIso() } : session);
  }

  private ensureUser(email: string, displayName: string, role: "admin" | "reader", password: string): void {
    if (this.users.some((user) => user.email === normalizeEmail(email))) {
      return;
    }

    this.users.push({
      id: makeUserId(email),
      email: normalizeEmail(email),
      displayName,
      role,
      passwordHash: hashPassword(password),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  private createSession(userId: string, role: "admin" | "reader"): AuthSessionRecord {
    const session = {
      id: makeSessionId(userId),
      userId,
      role,
      token: crypto.randomBytes(32).toString("base64url"),
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    this.sessions.push(session);
    return session;
  }
}

class PostgresAuthStore implements AuthStore {
  constructor(private readonly pool: Pool) {}

  async bootstrapAdmin(config: AdminBootstrapConfig | undefined): Promise<void> {
    if (!config) {
      return;
    }

    const email = normalizeEmail(config.email);
    const existing = await this.pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return;
    }

    const now = nowIso();
    await this.pool.query(
      `INSERT INTO users (id, email, display_name, role, password_hash, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [makeUserId(email), email, config.displayName ?? "Admin", "admin", hashPassword(config.password), now, now],
    );
  }

  async registerReader(email: string, password: string, displayName?: string): Promise<{ user: UserRecord; session: AuthSessionRecord }> {
    const normalized = normalizeEmail(email);
    const existing = await this.pool.query("SELECT id FROM users WHERE email = $1", [normalized]);
    if (existing.rows.length > 0) {
      throw Object.assign(new Error("User already exists"), { status: 409 });
    }

    const now = nowIso();
    await this.pool.query(
      `INSERT INTO users (id, email, display_name, role, password_hash, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [makeUserId(normalized), normalized, displayName || "Reader", "reader", hashPassword(password), now, now],
    );
    return this.login(normalized, password);
  }

  async login(email: string, password: string): Promise<{ user: UserRecord; session: AuthSessionRecord }> {
    const result = await this.pool.query("SELECT * FROM users WHERE email = $1", [normalizeEmail(email)]);
    const user = result.rows[0] ? this.rowToUser(result.rows[0] as Record<string, unknown>) : undefined;
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new Error("Invalid credentials");
    }

    if (needsPasswordRehash(user.passwordHash)) {
      user.passwordHash = hashPassword(password);
      await this.pool.query("UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3", [
        user.passwordHash,
        nowIso(),
        user.id,
      ]);
    }

    const session = await this.createSession(user.id, user.role);
    await this.pool.query("UPDATE users SET last_login_at = $1, updated_at = $1 WHERE id = $2", [nowIso(), user.id]);
    return { user, session };
  }

  async session(token: string | undefined): Promise<{ user: UserRecord; session: AuthSessionRecord } | undefined> {
    if (!token) {
      return undefined;
    }

    const result = await this.pool.query(
      `SELECT s.*, u.email, u.display_name, u.password_hash, u.created_at AS user_created_at,
        u.updated_at AS user_updated_at, u.last_login_at
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.revoked_at IS NULL AND s.expires_at > $2`,
      [token, nowIso()],
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return undefined;
    }

    return {
      session: this.rowToSession(row),
      user: {
        id: String(row.user_id),
        email: String(row.email),
        displayName: row.display_name ? String(row.display_name) : undefined,
        role: row.role as UserRecord["role"],
        passwordHash: String(row.password_hash),
        createdAt: String(row.user_created_at),
        updatedAt: String(row.user_updated_at),
        lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
      },
    };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) {
      return;
    }

    await this.pool.query("UPDATE auth_sessions SET revoked_at = $1 WHERE token = $2", [nowIso(), token]);
  }

  private async createSession(userId: string, role: "admin" | "reader"): Promise<AuthSessionRecord> {
    const session: AuthSessionRecord = {
      id: makeSessionId(userId),
      userId,
      role,
      token: crypto.randomBytes(32).toString("base64url"),
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    await this.pool.query(
      `INSERT INTO auth_sessions (id, user_id, role, token, created_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [session.id, session.userId, session.role, session.token, session.createdAt, session.expiresAt],
    );
    return session;
  }

  private rowToUser(row: Record<string, unknown>): UserRecord {
    return {
      id: String(row.id),
      email: String(row.email),
      displayName: row.display_name ? String(row.display_name) : undefined,
      role: row.role as UserRecord["role"],
      passwordHash: String(row.password_hash),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
    };
  }

  private rowToSession(row: Record<string, unknown>): AuthSessionRecord {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      role: row.role as AuthSessionRecord["role"],
      token: String(row.token),
      createdAt: String(row.created_at),
      expiresAt: String(row.expires_at),
      revokedAt: row.revoked_at ? String(row.revoked_at) : undefined,
    };
  }
}

function safeAssetName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

async function saveAudioAsset(rootDir: string, fileName: string, contentBase64: string): Promise<string> {
  const assetDir = process.env.AUDIO_ASSET_DIR || path.join(rootDir, "assets", "library");
  const safeName = safeAssetName(fileName);
  await fs.promises.mkdir(assetDir, { recursive: true });
  const targetPath = path.join(assetDir, safeName);
  await fs.promises.writeFile(targetPath, Buffer.from(contentBase64, "base64"));
  return path.relative(rootDir, targetPath).replace(/\\/g, "/");
}

class MemoryAudioStore implements AudioStore {
  private assets: AudioAssetRecord[] = [];
  private cues: AudioCueRecord[] = [];

  constructor(private readonly rootDir: string) {}

  async listAssets(): Promise<AudioAssetRecord[]> {
    return [...this.assets];
  }

  async createAsset(input: {
    fileName: string;
    title: string;
    type: AudioAssetType;
    contentBase64: string;
    durationSeconds: number;
    defaultVolume?: number;
  }): Promise<AudioAssetRecord> {
    const storagePath = await saveAudioAsset(this.rootDir, input.fileName, input.contentBase64);
    const asset: AudioAssetRecord = {
      id: makeAudioAssetId(input.title),
      title: input.title,
      type: input.type,
      storagePath,
      durationSeconds: input.durationSeconds,
      defaultVolume: input.defaultVolume ?? 0.5,
      createdAt: nowAudioIso(),
    };
    this.assets.push(asset);
    return asset;
  }

  async listCues(chapterId?: string): Promise<AudioCueRecord[]> {
    return chapterId ? this.cues.filter((cue) => cue.chapterId === chapterId) : [...this.cues];
  }

  async createCue(input: {
    chapterId: string;
    assetId: string;
    layer: CueLayer;
    startBlockId: string;
    endBlockId: string;
    volume?: number;
    fadeInMs?: number;
    fadeOutMs?: number;
    loop?: boolean;
    overlapMode?: CueOverlapMode;
  }): Promise<AudioCueRecord> {
    const now = nowAudioIso();
    const cue: AudioCueRecord = {
      id: makeCueId(input.chapterId, input.layer),
      chapterId: input.chapterId,
      assetId: input.assetId,
      layer: input.layer,
      startAnchor: { blockId: input.startBlockId },
      endAnchor: { blockId: input.endBlockId },
      volume: input.volume ?? 0.5,
      fadeInMs: input.fadeInMs ?? 1000,
      fadeOutMs: input.fadeOutMs ?? 1000,
      loop: input.loop ?? false,
      overlapMode: input.overlapMode ?? "crossfade",
      status: "valid",
      validationIssues: [],
      createdAt: now,
      updatedAt: now,
    };
    this.cues.push(cue);
    return cue;
  }

  async updateCue(cueId: string, updates: {
    assetId?: string;
    layer?: CueLayer;
    startBlockId?: string;
    endBlockId?: string;
    volume?: number;
    fadeInMs?: number;
    fadeOutMs?: number;
    loop?: boolean;
    overlapMode?: CueOverlapMode;
  }): Promise<AudioCueRecord> {
    const current = this.cues.find((cue) => cue.id === cueId);
    if (!current) {
      throw Object.assign(new Error(`Cue not found: ${cueId}`), { status: 404 });
    }

    const updated: AudioCueRecord = {
      ...current,
      assetId: updates.assetId ?? current.assetId,
      layer: updates.layer ?? current.layer,
      startAnchor: { blockId: updates.startBlockId ?? current.startAnchor.blockId },
      endAnchor: { blockId: updates.endBlockId ?? current.endAnchor.blockId },
      volume: updates.volume ?? current.volume,
      fadeInMs: updates.fadeInMs ?? current.fadeInMs,
      fadeOutMs: updates.fadeOutMs ?? current.fadeOutMs,
      loop: updates.loop ?? current.loop,
      overlapMode: updates.overlapMode ?? current.overlapMode,
      status: "valid",
      validationIssues: [],
      updatedAt: nowAudioIso(),
    };
    this.cues = this.cues.map((cue) => (cue.id === cueId ? updated : cue));
    return updated;
  }

  async repairCue(cueId: string, content: ContentStore): Promise<AudioCueRecord> {
    const current = this.cues.find((cue) => cue.id === cueId);
    if (!current) {
      throw Object.assign(new Error(`Cue not found: ${cueId}`), { status: 404 });
    }
    const chapter = await content.getChapter(current.chapterId);
    const blocks = chapter?.normalizedDocument.blocks ?? [];
    if (blocks.length === 0) {
      throw Object.assign(new Error("Cue cannot be repaired because the chapter has no blocks"), { status: 409 });
    }

    return this.updateCue(cueId, {
      startBlockId: blocks[0].id,
      endBlockId: blocks[Math.max(blocks.length - 1, 0)].id,
    });
  }

  async deleteCue(cueId: string): Promise<void> {
    this.cues = this.cues.filter((cue) => cue.id !== cueId);
  }
}

class PostgresAudioStore implements AudioStore {
  constructor(private readonly pool: Pool, private readonly rootDir: string) {}

  async listAssets(): Promise<AudioAssetRecord[]> {
    const result = await this.pool.query("SELECT * FROM audio_assets ORDER BY created_at DESC");
    return result.rows.map((row) => this.rowToAsset(row as Record<string, unknown>));
  }

  async createAsset(input: {
    fileName: string;
    title: string;
    type: AudioAssetType;
    contentBase64: string;
    durationSeconds: number;
    defaultVolume?: number;
  }): Promise<AudioAssetRecord> {
    const asset: AudioAssetRecord = {
      id: makeAudioAssetId(input.title),
      title: input.title,
      type: input.type,
      storagePath: await saveAudioAsset(this.rootDir, input.fileName, input.contentBase64),
      durationSeconds: input.durationSeconds,
      defaultVolume: input.defaultVolume ?? 0.5,
      createdAt: nowAudioIso(),
    };
    await this.pool.query(
      `INSERT INTO audio_assets (id, asset_type, title, storage_path, duration_seconds, default_volume, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [asset.id, asset.type, asset.title, asset.storagePath, asset.durationSeconds, asset.defaultVolume, asset.createdAt],
    );
    return asset;
  }

  async listCues(chapterId?: string): Promise<AudioCueRecord[]> {
    const result = chapterId
      ? await this.pool.query("SELECT * FROM audio_cues WHERE chapter_id = $1 ORDER BY created_at ASC", [chapterId])
      : await this.pool.query("SELECT * FROM audio_cues ORDER BY created_at ASC");
    return result.rows.map((row) => this.rowToCue(row as Record<string, unknown>));
  }

  async createCue(input: {
    chapterId: string;
    assetId: string;
    layer: CueLayer;
    startBlockId: string;
    endBlockId: string;
    volume?: number;
    fadeInMs?: number;
    fadeOutMs?: number;
    loop?: boolean;
    overlapMode?: CueOverlapMode;
  }): Promise<AudioCueRecord> {
    const now = nowAudioIso();
    const cue: AudioCueRecord = {
      id: makeCueId(input.chapterId, input.layer),
      chapterId: input.chapterId,
      assetId: input.assetId,
      layer: input.layer,
      startAnchor: { blockId: input.startBlockId },
      endAnchor: { blockId: input.endBlockId },
      volume: input.volume ?? 0.5,
      fadeInMs: input.fadeInMs ?? 1000,
      fadeOutMs: input.fadeOutMs ?? 1000,
      loop: input.loop ?? false,
      overlapMode: input.overlapMode ?? "crossfade",
      status: "valid",
      validationIssues: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.pool.query(
      `INSERT INTO audio_cues (
        id, chapter_id, asset_id, cue_layer, start_anchor_json, end_anchor_json,
        volume, fade_in_ms, fade_out_ms, loop, overlap_mode, status,
        validation_issues_json, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        cue.id,
        cue.chapterId,
        cue.assetId,
        cue.layer,
        JSON.stringify(cue.startAnchor),
        JSON.stringify(cue.endAnchor),
        cue.volume,
        cue.fadeInMs,
        cue.fadeOutMs,
        cue.loop ? 1 : 0,
        cue.overlapMode,
        cue.status,
        JSON.stringify(cue.validationIssues),
        cue.createdAt,
        cue.updatedAt,
      ],
    );
    return cue;
  }

  async updateCue(cueId: string, updates: {
    assetId?: string;
    layer?: CueLayer;
    startBlockId?: string;
    endBlockId?: string;
    volume?: number;
    fadeInMs?: number;
    fadeOutMs?: number;
    loop?: boolean;
    overlapMode?: CueOverlapMode;
  }): Promise<AudioCueRecord> {
    const current = await this.getCue(cueId);
    if (!current) {
      throw Object.assign(new Error(`Cue not found: ${cueId}`), { status: 404 });
    }

    const updated: AudioCueRecord = {
      ...current,
      assetId: updates.assetId ?? current.assetId,
      layer: updates.layer ?? current.layer,
      startAnchor: { blockId: updates.startBlockId ?? current.startAnchor.blockId },
      endAnchor: { blockId: updates.endBlockId ?? current.endAnchor.blockId },
      volume: updates.volume ?? current.volume,
      fadeInMs: updates.fadeInMs ?? current.fadeInMs,
      fadeOutMs: updates.fadeOutMs ?? current.fadeOutMs,
      loop: updates.loop ?? current.loop,
      overlapMode: updates.overlapMode ?? current.overlapMode,
      status: "valid",
      validationIssues: [],
      updatedAt: nowAudioIso(),
    };

    await this.pool.query(
      `UPDATE audio_cues SET
        asset_id = $1,
        cue_layer = $2,
        start_anchor_json = $3,
        end_anchor_json = $4,
        volume = $5,
        fade_in_ms = $6,
        fade_out_ms = $7,
        loop = $8,
        overlap_mode = $9,
        status = $10,
        validation_issues_json = $11,
        updated_at = $12
       WHERE id = $13`,
      [
        updated.assetId,
        updated.layer,
        JSON.stringify(updated.startAnchor),
        JSON.stringify(updated.endAnchor),
        updated.volume,
        updated.fadeInMs,
        updated.fadeOutMs,
        updated.loop ? 1 : 0,
        updated.overlapMode,
        updated.status,
        JSON.stringify(updated.validationIssues),
        updated.updatedAt,
        cueId,
      ],
    );
    return updated;
  }

  async repairCue(cueId: string, content: ContentStore): Promise<AudioCueRecord> {
    const current = await this.getCue(cueId);
    if (!current) {
      throw Object.assign(new Error(`Cue not found: ${cueId}`), { status: 404 });
    }
    const chapter = await content.getChapter(current.chapterId);
    const blocks = chapter?.normalizedDocument.blocks ?? [];
    if (blocks.length === 0) {
      throw Object.assign(new Error("Cue cannot be repaired because the chapter has no blocks"), { status: 409 });
    }

    return this.updateCue(cueId, {
      startBlockId: blocks[0].id,
      endBlockId: blocks[Math.max(blocks.length - 1, 0)].id,
    });
  }

  async deleteCue(cueId: string): Promise<void> {
    await this.pool.query("DELETE FROM audio_cues WHERE id = $1", [cueId]);
  }

  private async getCue(cueId: string): Promise<AudioCueRecord | undefined> {
    const result = await this.pool.query("SELECT * FROM audio_cues WHERE id = $1", [cueId]);
    return result.rows[0] ? this.rowToCue(result.rows[0] as Record<string, unknown>) : undefined;
  }

  private rowToAsset(row: Record<string, unknown>): AudioAssetRecord {
    return {
      id: String(row.id),
      type: row.asset_type as AudioAssetType,
      title: String(row.title),
      storagePath: String(row.storage_path),
      durationSeconds: Number(row.duration_seconds),
      defaultVolume: Number(row.default_volume),
      createdAt: String(row.created_at),
    };
  }

  private rowToCue(row: Record<string, unknown>): AudioCueRecord {
    return {
      id: String(row.id),
      chapterId: String(row.chapter_id),
      assetId: String(row.asset_id),
      layer: row.cue_layer as CueLayer,
      startAnchor: JSON.parse(String(row.start_anchor_json)) as AudioCueRecord["startAnchor"],
      endAnchor: JSON.parse(String(row.end_anchor_json)) as AudioCueRecord["endAnchor"],
      volume: Number(row.volume),
      fadeInMs: Number(row.fade_in_ms),
      fadeOutMs: Number(row.fade_out_ms),
      loop: Number(row.loop) === 1,
      overlapMode: row.overlap_mode as CueOverlapMode,
      status: row.status as AudioCueRecord["status"],
      validationIssues: JSON.parse(String(row.validation_issues_json)) as string[],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}

function defaultReaderState(): ReaderStateRecord {
  return {
    progress: {},
    highlights: [],
    notes: [],
    preferences: {},
    updatedAt: nowIso(),
  };
}

class MemoryReaderStateStore implements ReaderStateStore {
  private readonly states = new Map<string, ReaderStateRecord>();

  async get(userId: string): Promise<ReaderStateRecord> {
    return this.states.get(userId) ?? defaultReaderState();
  }

  async save(userId: string, input: Partial<Omit<ReaderStateRecord, "updatedAt">>): Promise<ReaderStateRecord> {
    const current = await this.get(userId);
    const next: ReaderStateRecord = {
      progress: input.progress ?? current.progress,
      highlights: input.highlights ?? current.highlights,
      notes: input.notes ?? current.notes,
      preferences: input.preferences ?? current.preferences,
      updatedAt: nowIso(),
    };
    this.states.set(userId, next);
    return next;
  }
}

class PostgresReaderStateStore implements ReaderStateStore {
  constructor(private readonly pool: Pool) {}

  async get(userId: string): Promise<ReaderStateRecord> {
    const result = await this.pool.query("SELECT * FROM reader_state WHERE user_id = $1", [userId]);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return defaultReaderState();
    }

    return {
      progress: JSON.parse(String(row.progress_json)) as Record<string, unknown>,
      highlights: JSON.parse(String(row.highlights_json)) as unknown[],
      notes: JSON.parse(String(row.notes_json)) as unknown[],
      preferences: JSON.parse(String(row.preferences_json)) as Record<string, unknown>,
      updatedAt: String(row.updated_at),
    };
  }

  async save(userId: string, input: Partial<Omit<ReaderStateRecord, "updatedAt">>): Promise<ReaderStateRecord> {
    const current = await this.get(userId);
    const next: ReaderStateRecord = {
      progress: input.progress ?? current.progress,
      highlights: input.highlights ?? current.highlights,
      notes: input.notes ?? current.notes,
      preferences: input.preferences ?? current.preferences,
      updatedAt: nowIso(),
    };
    await this.pool.query(
      `INSERT INTO reader_state (user_id, progress_json, highlights_json, notes_json, preferences_json, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id) DO UPDATE SET
         progress_json = EXCLUDED.progress_json,
         highlights_json = EXCLUDED.highlights_json,
         notes_json = EXCLUDED.notes_json,
         preferences_json = EXCLUDED.preferences_json,
         updated_at = EXCLUDED.updated_at`,
      [
        userId,
        JSON.stringify(next.progress),
        JSON.stringify(next.highlights),
        JSON.stringify(next.notes),
        JSON.stringify(next.preferences),
        next.updatedAt,
      ],
    );
    return next;
  }
}

class MemoryAppEventStore implements AppEventStore {
  private events: AppEventRecord[] = [];

  async record(eventType: string, actorUserId: string | undefined, payload: Record<string, unknown>): Promise<AppEventRecord> {
    const event = {
      id: `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      eventType,
      actorUserId,
      payload,
      createdAt: nowIso(),
    };
    this.events.unshift(event);
    return event;
  }

  async list(limit = 100): Promise<AppEventRecord[]> {
    return this.events.slice(0, limit);
  }
}

class PostgresAppEventStore implements AppEventStore {
  constructor(private readonly pool: Pool) {}

  async record(eventType: string, actorUserId: string | undefined, payload: Record<string, unknown>): Promise<AppEventRecord> {
    const event = {
      id: `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      eventType,
      actorUserId,
      payload,
      createdAt: nowIso(),
    };
    await this.pool.query(
      `INSERT INTO app_events (id, event_type, actor_user_id, payload_json, created_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [event.id, event.eventType, event.actorUserId ?? null, JSON.stringify(event.payload), event.createdAt],
    );
    return event;
  }

  async list(limit = 100): Promise<AppEventRecord[]> {
    const result = await this.pool.query("SELECT * FROM app_events ORDER BY created_at DESC LIMIT $1", [limit]);
    return result.rows.map((row) => ({
      id: String(row.id),
      eventType: String(row.event_type),
      actorUserId: row.actor_user_id ? String(row.actor_user_id) : undefined,
      payload: JSON.parse(String(row.payload_json)) as Record<string, unknown>,
      createdAt: String(row.created_at),
    }));
  }
}

function sendJson(response: http.ServerResponse, status: number, body: unknown, headers: http.OutgoingHttpHeaders = {}): void {
  response.writeHead(status, { "content-type": "application/json", ...headers });
  response.end(JSON.stringify(body));
}

function sendRedirect(response: http.ServerResponse, location: string): void {
  response.writeHead(302, { location });
  response.end();
}

function sessionCookie(token: string, maxAge?: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAgePart = typeof maxAge === "number" ? `; Max-Age=${maxAge}` : "";
  return `auth_token=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax${secure}${maxAgePart}`;
}

async function readJson(request: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function authToken(request: http.IncomingMessage): string | undefined {
  const cookieHeader = request.headers.cookie ?? "";
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const tokenCookie = cookies.find((cookie) => cookie.startsWith("auth_token="));
  return tokenCookie ? decodeURIComponent(tokenCookie.slice("auth_token=".length)) : undefined;
}

async function requireAdmin(request: http.IncomingMessage, auth: AuthStore): Promise<UserRecord> {
  const context = await auth.session(authToken(request));
  if (!context) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  if (context.user.role !== "admin") {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return context.user;
}

async function requireUser(request: http.IncomingMessage, auth: AuthStore): Promise<UserRecord> {
  const context = await auth.session(authToken(request));
  if (!context) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  return context.user;
}

function safeStaticPath(rootDir: string, urlPath: string): string | undefined {
  const normalized = urlPath === "/" ? "/index.html" : urlPath;
  const resolved = path.resolve(rootDir, `.${decodeURIComponent(normalized)}`);
  if (!resolved.startsWith(path.resolve(rootDir))) {
    return undefined;
  }
  return resolved;
}

async function serveStatic(rootDir: string, requestPath: string, response: http.ServerResponse): Promise<boolean> {
  const staticPath = safeStaticPath(rootDir, requestPath === "/admin" ? "/admin/index.html" : requestPath);
  if (!staticPath) {
    return false;
  }
  const candidate = fs.existsSync(staticPath) && fs.statSync(staticPath).isDirectory()
    ? path.join(staticPath, "index.html")
    : staticPath;
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    return false;
  }

  const ext = path.extname(candidate);
  const type = ext === ".html" ? "text/html" : ext === ".js" ? "text/javascript" : ext === ".css" ? "text/css" : "application/octet-stream";
  response.writeHead(200, { "content-type": type });
  fs.createReadStream(candidate).pipe(response);
  return true;
}

function isAdminShellRoute(pathname: string): boolean {
  return pathname === "/admin" || (pathname.startsWith("/admin/") && path.extname(pathname) === "");
}

interface PublishReadinessPayload {
  canPublish: boolean;
  blockingIssues: string[];
  warnings: string[];
}

function chapterPayload(chapter: ChapterRecord, publishReadiness?: PublishReadinessPayload): Record<string, unknown> {
  return {
    id: chapter.id,
    slug: chapter.slug,
    title: chapter.title,
    number: chapter.orderIndex,
    status: chapter.status,
    type: chapter.type,
    visibility: chapter.visibility,
    theme: chapter.theme,
    sourceImport: chapter.sourceImport,
    normalizedDocument: chapter.normalizedDocument,
    runtime: chapter.compiledOutput.runtime,
    html: chapter.compiledOutput.html,
    version: chapter.version,
    updatedAt: chapter.updatedAt,
    publishReadiness,
  };
}

function versionPayload(version: ChapterVersionRecord): Record<string, unknown> {
  return {
    id: version.id,
    chapterId: version.chapterId,
    status: version.status,
    rollbackEligible: version.rollbackEligible,
    publishedAt: version.publishedAt,
    createdAt: version.createdAt,
  };
}

async function brokenCueMessages(content: ContentStore, audio: AudioStore, chapterId: string): Promise<string[]> {
  const chapter = await content.getChapter(chapterId);
  if (!chapter) {
    throw new Error(`Chapter not found: ${chapterId}`);
  }

  const blockIds = new Set(chapter.normalizedDocument.blocks.map((block) => block.id));
  const cues = await audio.listCues(chapter.id);
  return cues.flatMap((cue) => {
    const issues: string[] = [];
    if (!blockIds.has(cue.startAnchor.blockId)) {
      issues.push(`${cue.id}: start anchor block not found: ${cue.startAnchor.blockId}`);
    }
    if (!blockIds.has(cue.endAnchor.blockId)) {
      issues.push(`${cue.id}: end anchor block not found: ${cue.endAnchor.blockId}`);
    }
    return issues;
  });
}

async function buildPublishReadiness(
  content: ContentStore,
  audio: AudioStore,
  chapter: ChapterRecord,
): Promise<PublishReadinessPayload> {
  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  if (!chapter.title.trim()) {
    blockingIssues.push("Chapter title is required");
  }
  if (!/^[a-z0-9-]+$/.test(chapter.slug)) {
    blockingIssues.push("Chapter slug must contain lowercase letters, numbers, and hyphens only");
  }
  if (chapter.visibility.mode === "conditional" && !chapter.visibility.conditionKey) {
    blockingIssues.push("Conditional visibility requires a condition key");
  }
  if (chapter.normalizedDocument.blocks.length === 0) {
    blockingIssues.push("Chapter must contain at least one block");
  }

  const brokenCues = await brokenCueMessages(content, audio, chapter.id);
  blockingIssues.push(...brokenCues);

  if (chapter.status !== "preview") {
    warnings.push("Preview before publishing to review the latest draft");
  }

  return {
    canPublish: blockingIssues.length === 0,
    blockingIssues,
    warnings,
  };
}

function blockLabel(block: DocumentBlock, index: number): string {
  if (block.type === "scene_break") {
    return `Scene break ${index + 1}`;
  }
  const text = block.spans.map((span) => span.text).join("").trim();
  return text.length > 80 ? `${text.slice(0, 77)}...` : text || `Section ${index + 1}`;
}

function cueIssues(
  cue: AudioCueRecord,
  blockIds: Set<string>,
  assetIds: Set<string>,
): string[] {
  const issues: string[] = [];
  if (!blockIds.has(cue.startAnchor.blockId)) {
    issues.push(`Start anchor block not found: ${cue.startAnchor.blockId}`);
  }
  if (!blockIds.has(cue.endAnchor.blockId)) {
    issues.push(`End anchor block not found: ${cue.endAnchor.blockId}`);
  }
  if (!assetIds.has(cue.assetId)) {
    issues.push(`Asset not found: ${cue.assetId}`);
  }
  if (cue.volume < 0 || cue.volume > 1) {
    issues.push("Cue volume must be between 0 and 1");
  }
  return issues;
}

async function audioStudioPayload(
  content: ContentStore,
  audio: AudioStore,
  chapterId: string,
): Promise<Record<string, unknown>> {
  const chapter = await content.getChapter(chapterId);
  if (!chapter) {
    throw Object.assign(new Error(`Chapter not found: ${chapterId}`), { status: 404 });
  }

  const assets = await audio.listAssets();
  const cues = await audio.listCues(chapter.id);
  const blockIds = new Set(chapter.normalizedDocument.blocks.map((block) => block.id));
  const assetIds = new Set(assets.map((asset) => asset.id));
  const blockOptions = chapter.normalizedDocument.blocks.map((block, index) => ({
    id: block.id,
    label: blockLabel(block, index),
    type: block.type,
    orderIndex: index,
  }));
  const blockIndex = new Map(blockOptions.map((block) => [block.id, block.orderIndex]));
  const assetTitle = new Map(assets.map((asset) => [asset.id, asset.title]));
  const cueViewModels = cues.map((cue) => {
    const issues = cueIssues(cue, blockIds, assetIds);
    return {
      id: cue.id,
      chapterId: cue.chapterId,
      assetId: cue.assetId,
      assetTitle: assetTitle.get(cue.assetId) ?? "Unknown asset",
      layer: cue.layer,
      startBlockId: cue.startAnchor.blockId,
      endBlockId: cue.endAnchor.blockId,
      startIndex: blockIndex.get(cue.startAnchor.blockId) ?? -1,
      endIndex: blockIndex.get(cue.endAnchor.blockId) ?? -1,
      volume: cue.volume,
      fadeInMs: cue.fadeInMs,
      fadeOutMs: cue.fadeOutMs,
      loop: cue.loop,
      overlapMode: cue.overlapMode,
      status: issues.length === 0 ? "valid" : "broken",
      validationIssues: issues,
    };
  });
  const readiness = await buildPublishReadiness(content, audio, chapter);

  return {
    chapterId: chapter.id,
    blocks: blockOptions,
    assets,
    cues: cueViewModels,
    timeline: ["music", "ambient"].map((layer) => ({
      id: `lane_${layer}`,
      layer,
      cues: cueViewModels.filter((cue) => cue.layer === layer),
    })),
    validationResults: cueViewModels.map((cue) => ({
      cueId: cue.id,
      status: cue.status,
      issues: cue.validationIssues,
    })),
    canPublish: readiness.canPublish,
    blockingIssues: readiness.blockingIssues,
  };
}

function normalizedDocumentFromBody(body: Record<string, unknown>): NormalizedDocument | undefined {
  const value = body.normalizedDocument;
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const candidate = value as Partial<NormalizedDocument>;
  if (!Array.isArray(candidate.blocks)) {
    throw Object.assign(new Error("normalizedDocument.blocks must be an array"), { status: 400 });
  }
  return {
    schemaVersion: typeof candidate.schemaVersion === "number" ? candidate.schemaVersion : 1,
    blocks: candidate.blocks as DocumentBlock[],
  };
}

function chapterTypeFromUnknown(value: unknown): ChapterRecord["type"] | undefined {
  return value === "standard" || value === "interlude" || value === "hidden" || value === "conditional"
    ? value
    : undefined;
}

function visibilityFromUnknown(value: unknown): ChapterRecord["visibility"] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const mode = record.mode;
  if (mode !== "public" && mode !== "direct-link" && mode !== "conditional") {
    return undefined;
  }
  return {
    mode,
    conditionKey: typeof record.conditionKey === "string" ? record.conditionKey : undefined,
    includeInToc: typeof record.includeInToc === "boolean" ? record.includeInToc : true,
  };
}

function themeFromUnknown(value: unknown): ChapterRecord["theme"] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return {
    accentColor: typeof record.accentColor === "string" ? record.accentColor : undefined,
    backgroundTint: typeof record.backgroundTint === "string" ? record.backgroundTint : undefined,
    classes: Array.isArray(record.classes) ? record.classes.filter((item): item is string => typeof item === "string") : undefined,
  };
}

function metadataPatchFromUnknown(value: unknown): Partial<StagedChapterMetadata> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const patch: Partial<StagedChapterMetadata> = {};
  if (typeof record.title === "string") {
    patch.title = record.title;
  }
  if (typeof record.slug === "string") {
    patch.slug = record.slug;
  }
  const chapterType = chapterTypeFromUnknown(record.chapterType);
  if (chapterType) {
    patch.chapterType = chapterType;
  }
  if (typeof record.orderIndex === "number") {
    patch.orderIndex = record.orderIndex;
  }
  const visibility = visibilityFromUnknown(record.visibility);
  if (visibility) {
    patch.visibility = visibility;
  }
  const theme = themeFromUnknown(record.theme);
  if (theme) {
    patch.theme = theme;
  }
  return patch;
}

async function audioStorageWritable(rootDir: string): Promise<boolean> {
  const assetDir = process.env.AUDIO_ASSET_DIR || path.join(rootDir, "assets", "library");
  const probePath = path.join(assetDir, `.readiness-${process.pid}-${Date.now()}`);
  try {
    await fs.promises.mkdir(assetDir, { recursive: true });
    await fs.promises.writeFile(probePath, "ok", "utf8");
    await fs.promises.unlink(probePath);
    return true;
  } catch {
    return false;
  }
}

export async function createBookServer(options: CreateBookServerOptions = {}): Promise<http.Server> {
  const rootDir = rootFromOptions(options);
  const mode = options.mode ?? (process.env.DATABASE_URL ? "postgres" : "memory");
  const pool = mode === "postgres" ? createPostgresPool(options.databaseUrl) : undefined;
  if (pool) {
    await applyMigrations(pool);
  }
  const content: ContentStore = pool ? new PostgresContentStore(pool, rootDir) : new MemoryContentStore(rootDir);
  const auth: AuthStore = pool ? new PostgresAuthStore(pool) : new MemoryAuthStore();
  const audio: AudioStore = pool ? new PostgresAudioStore(pool, rootDir) : new MemoryAudioStore(rootDir);
  const imports: ImportDraftStore = pool ? new PostgresImportDraftStore(pool, content) : new MemoryImportDraftStore(content);
  const readerState: ReaderStateStore = pool ? new PostgresReaderStateStore(pool) : new MemoryReaderStateStore();
  const events: AppEventStore = pool ? new PostgresAppEventStore(pool) : new MemoryAppEventStore();
  const adminBootstrap = readAdminBootstrapConfig(options);

  await content.bootstrapFromStatic();
  await auth.bootstrapAdmin(adminBootstrap);
  const loginAttempts = new Map<string, { count: number; resetAt: number }>();

  function assertLoginAllowed(request: http.IncomingMessage): void {
    const key = String(request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown").split(",")[0].trim();
    const now = Date.now();
    const current = loginAttempts.get(key);
    if (!current || current.resetAt < now) {
      loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
      return;
    }

    if (current.count >= 10) {
      throw Object.assign(new Error("Too many login attempts"), { status: 429 });
    }

    current.count += 1;
  }

  return http.createServer(async (request, response) => {
    try {
      const method = request.method ?? "GET";
      const url = new URL(request.url ?? "/", "http://localhost");
      const pathname = url.pathname.replace(/\/+$/, "") || "/";

      if (pathname === "/api/health") {
        sendJson(response, 200, { ok: true, mode });
        return;
      }

      if (pathname === "/api/deploy/readiness") {
        const manifest = await content.listPublishedChapters();
        const storage = await audioStorageWritable(rootDir);
        const database = mode === "postgres" || process.env.NODE_ENV !== "production";
        sendJson(response, 200, {
          ok: manifest.length > 0 && storage && database,
          mode,
          checks: {
            readerApi: manifest.length > 0,
            adminApi: true,
            auth: true,
            database,
            storage,
          },
        });
        return;
      }

      if (method === "POST" && pathname === "/api/auth/register") {
        assertLoginAllowed(request);
        const body = await readJson(request);
        const session = await auth.registerReader(
          String(body.email ?? ""),
          String(body.password ?? ""),
          typeof body.displayName === "string" ? body.displayName : undefined,
        );
        await events.record("reader_registered", session.user.id, { email: session.user.email });
        sendJson(response, 201, {
          user: { email: session.user.email, displayName: session.user.displayName, role: session.user.role },
        }, {
          "set-cookie": sessionCookie(session.session.token),
        });
        return;
      }

      if (method === "POST" && pathname === "/api/auth/login") {
        assertLoginAllowed(request);
        const body = await readJson(request);
        const session = await auth.login(String(body.email ?? ""), String(body.password ?? ""));
        sendJson(response, 200, {
          user: { email: session.user.email, displayName: session.user.displayName, role: session.user.role },
        }, {
          "set-cookie": sessionCookie(session.session.token),
        });
        return;
      }

      if (method === "GET" && pathname === "/api/auth/session") {
        const context = await auth.session(authToken(request));
        sendJson(response, context ? 200 : 401, context ? {
          user: { email: context.user.email, displayName: context.user.displayName, role: context.user.role },
        } : { error: "Unauthorized" });
        return;
      }

      if (method === "POST" && pathname === "/api/auth/logout") {
        await auth.logout(authToken(request));
        sendJson(response, 200, { ok: true }, { "set-cookie": sessionCookie("", 0) });
        return;
      }

      if (method === "GET" && pathname === "/api/reader/manifest") {
        sendJson(response, 200, await content.listPublishedChapters());
        return;
      }

      if (method === "GET" && pathname === "/api/reader/search") {
        sendJson(response, 200, { results: await content.searchPublishedChapters(url.searchParams.get("q") ?? "") });
        return;
      }

      if (method === "GET" && pathname === "/api/reader/state") {
        const user = await requireUser(request, auth);
        sendJson(response, 200, await readerState.get(user.id));
        return;
      }

      if (method === "PUT" && pathname === "/api/reader/state") {
        const user = await requireUser(request, auth);
        const body = await readJson(request);
        const saved = await readerState.save(user.id, {
          progress: typeof body.progress === "object" && body.progress !== null ? body.progress as Record<string, unknown> : undefined,
          highlights: Array.isArray(body.highlights) ? body.highlights : undefined,
          notes: Array.isArray(body.notes) ? body.notes : undefined,
          preferences: typeof body.preferences === "object" && body.preferences !== null ? body.preferences as Record<string, unknown> : undefined,
        });
        await events.record("reader_state_saved", user.id, { progress: saved.progress });
        sendJson(response, 200, saved);
        return;
      }

      const readerChapterMatch = /^\/api\/reader\/chapters\/([^/]+)$/.exec(pathname);
      if (method === "GET" && readerChapterMatch) {
        const chapter = await content.getPublishedChapter(readerChapterMatch[1]);
        if (!chapter) {
          sendJson(response, 404, { error: "Chapter not found" });
          return;
        }
        sendJson(response, 200, chapterPayload(chapter));
        return;
      }

      if (pathname.startsWith("/api/admin")) {
        await requireAdmin(request, auth);
      }

      if (method === "GET" && pathname === "/api/admin/chapters") {
        const chapters = await content.listAdminChapters();
        sendJson(response, 200, await Promise.all(chapters.map(async (chapter) => (
          chapterPayload(chapter, await buildPublishReadiness(content, audio, chapter))
        ))));
        return;
      }

      if (method === "POST" && pathname === "/api/admin/chapters") {
        const body = await readJson(request);
        const normalizedDocument = normalizedDocumentFromBody(body);
        const chapter = await content.createChapter({
          slug: String(body.slug ?? ""),
          title: String(body.title ?? ""),
          html: typeof body.html === "string" ? body.html : undefined,
          normalizedDocument,
          orderIndex: typeof body.orderIndex === "number" ? body.orderIndex : undefined,
          type: chapterTypeFromUnknown(body.type),
          visibility: visibilityFromUnknown(body.visibility),
          theme: themeFromUnknown(body.theme),
        });
        await events.record("chapter_created", (await auth.session(authToken(request)))?.user.id, { chapterId: chapter.id });
        sendJson(response, 201, chapterPayload(chapter, await buildPublishReadiness(content, audio, chapter)));
        return;
      }

      if (method === "GET" && pathname === "/api/admin/analytics/events") {
        sendJson(response, 200, { events: await events.list(100) });
        return;
      }

      if (method === "POST" && pathname === "/api/admin/import/docx") {
        const body = await readJson(request);
        const draft = await imports.importDocx({
          fileName: String(body.fileName ?? "import.docx"),
          contentBase64: String(body.contentBase64 ?? ""),
          metadata: metadataPatchFromUnknown(body.metadata),
        });
        await events.record("chapter_imported", (await auth.session(authToken(request)))?.user.id, { draftId: draft.id });
        sendJson(response, 201, draft);
        return;
      }

      if (method === "GET" && pathname === "/api/admin/import/drafts") {
        sendJson(response, 200, { drafts: await imports.listDrafts() });
        return;
      }

      const importMetadataMatch = /^\/api\/admin\/import\/drafts\/([^/]+)\/metadata$/.exec(pathname);
      if (importMetadataMatch && method === "PUT") {
        const body = await readJson(request);
        const patch = metadataPatchFromUnknown(body.metadata) ?? metadataPatchFromUnknown(body) ?? {};
        const draft = await imports.updateDraftMetadata(importMetadataMatch[1], patch);
        await events.record("chapter_import_metadata_updated", (await auth.session(authToken(request)))?.user.id, { draftId: draft.id });
        sendJson(response, 200, draft);
        return;
      }

      const importApproveMatch = /^\/api\/admin\/import\/drafts\/([^/]+)\/approve$/.exec(pathname);
      if (importApproveMatch && method === "POST") {
        const result = await imports.approveDraft(importApproveMatch[1]);
        await events.record("chapter_import_approved", (await auth.session(authToken(request)))?.user.id, {
          draftId: result.draft.id,
          chapterId: result.chapter.id,
        });
        sendJson(response, 200, {
          draft: result.draft,
          chapter: chapterPayload(result.chapter, await buildPublishReadiness(content, audio, result.chapter)),
        });
        return;
      }

      const importRejectMatch = /^\/api\/admin\/import\/drafts\/([^/]+)\/reject$/.exec(pathname);
      if (importRejectMatch && method === "POST") {
        const body = await readJson(request);
        const draft = await imports.rejectDraft(importRejectMatch[1], String(body.reason ?? ""));
        await events.record("chapter_import_rejected", (await auth.session(authToken(request)))?.user.id, { draftId: draft.id });
        sendJson(response, 200, draft);
        return;
      }

      const adminChapterMatch = /^\/api\/admin\/chapters\/([^/]+)$/.exec(pathname);
      if (adminChapterMatch && method === "GET") {
        const chapter = await content.getChapter(adminChapterMatch[1]);
        sendJson(
          response,
          chapter ? 200 : 404,
          chapter ? chapterPayload(chapter, await buildPublishReadiness(content, audio, chapter)) : { error: "Chapter not found" },
        );
        return;
      }

      if (adminChapterMatch && method === "PUT") {
        const body = await readJson(request);
        const normalizedDocument = normalizedDocumentFromBody(body);
        const chapter = await content.updateChapter(adminChapterMatch[1], {
          slug: typeof body.slug === "string" ? body.slug : undefined,
          title: typeof body.title === "string" ? body.title : undefined,
          html: typeof body.html === "string" ? body.html : undefined,
          normalizedDocument,
          orderIndex: typeof body.orderIndex === "number" ? body.orderIndex : undefined,
          type: chapterTypeFromUnknown(body.type),
          visibility: visibilityFromUnknown(body.visibility),
          theme: themeFromUnknown(body.theme),
        });
        await events.record("chapter_updated", (await auth.session(authToken(request)))?.user.id, { chapterId: chapter.id });
        sendJson(response, 200, chapterPayload(chapter, await buildPublishReadiness(content, audio, chapter)));
        return;
      }

      if (adminChapterMatch && method === "DELETE") {
        await content.deleteChapter(adminChapterMatch[1]);
        await events.record("chapter_deleted", (await auth.session(authToken(request)))?.user.id, { chapterId: adminChapterMatch[1] });
        sendJson(response, 200, { ok: true });
        return;
      }

      const versionsMatch = /^\/api\/admin\/chapters\/([^/]+)\/versions$/.exec(pathname);
      if (versionsMatch && method === "GET") {
        sendJson(response, 200, { versions: (await content.listVersions(versionsMatch[1])).map(versionPayload) });
        return;
      }

      const publishMatch = /^\/api\/admin\/chapters\/([^/]+)\/publish$/.exec(pathname);
      if (publishMatch && method === "POST") {
        const current = await content.getChapter(publishMatch[1]);
        if (!current) {
          sendJson(response, 404, { error: "Chapter not found" });
          return;
        }
        const readiness = await buildPublishReadiness(content, audio, current);
        if (!readiness.canPublish) {
          await events.record("chapter_publish_blocked", (await auth.session(authToken(request)))?.user.id, {
            chapterId: publishMatch[1],
            blockingIssueCount: readiness.blockingIssues.length,
          });
          sendJson(response, 409, {
            error: "Chapter has broken cues or other blocking issues that must be repaired before publish",
            brokenCues: readiness.blockingIssues,
            publishReadiness: readiness,
          });
          return;
        }
        const chapter = await content.setChapterStatus(publishMatch[1], "published");
        await events.record("chapter_published", (await auth.session(authToken(request)))?.user.id, { chapterId: chapter.id });
        sendJson(response, 200, chapterPayload(chapter, await buildPublishReadiness(content, audio, chapter)));
        return;
      }

      const rollbackMatch = /^\/api\/admin\/chapters\/([^/]+)\/rollback$/.exec(pathname);
      if (rollbackMatch && method === "POST") {
        const body = await readJson(request);
        const versionId = String(body.versionId ?? "");
        const chapter = await content.rollbackChapter(rollbackMatch[1], versionId);
        await events.record("chapter_rolled_back", (await auth.session(authToken(request)))?.user.id, {
          chapterId: chapter.id,
          versionId,
        });
        sendJson(response, 200, chapterPayload(chapter, await buildPublishReadiness(content, audio, chapter)));
        return;
      }

      const previewMatch = /^\/api\/admin\/chapters\/([^/]+)\/preview$/.exec(pathname);
      if (previewMatch && method === "POST") {
        const chapter = await content.setChapterStatus(previewMatch[1], "preview");
        sendJson(response, 200, chapterPayload(chapter, await buildPublishReadiness(content, audio, chapter)));
        return;
      }

      if (method === "GET" && pathname === "/api/admin/audio/studio") {
        const chapterId = url.searchParams.get("chapterId");
        if (!chapterId) {
          sendJson(response, 400, { error: "chapterId is required" });
          return;
        }
        sendJson(response, 200, await audioStudioPayload(content, audio, chapterId));
        return;
      }

      if (method === "GET" && pathname === "/api/admin/audio/assets") {
        sendJson(response, 200, await audio.listAssets());
        return;
      }

      if (method === "POST" && pathname === "/api/admin/audio/assets") {
        const body = await readJson(request);
        const asset = await audio.createAsset({
          fileName: String(body.fileName ?? ""),
          title: String(body.title ?? ""),
          type: body.type === "ambient" ? "ambient" : "music",
          contentBase64: String(body.contentBase64 ?? ""),
          durationSeconds: Number(body.durationSeconds ?? 0),
          defaultVolume: typeof body.defaultVolume === "number" ? body.defaultVolume : undefined,
        });
        await events.record("audio_asset_uploaded", (await auth.session(authToken(request)))?.user.id, { assetId: asset.id });
        sendJson(response, 201, asset);
        return;
      }

      if (method === "GET" && pathname === "/api/admin/audio/cues") {
        sendJson(response, 200, await audio.listCues(url.searchParams.get("chapterId") ?? undefined));
        return;
      }

      if (method === "POST" && pathname === "/api/admin/audio/cues") {
        const body = await readJson(request);
        const cue = await audio.createCue({
          chapterId: String(body.chapterId ?? ""),
          assetId: String(body.assetId ?? ""),
          layer: body.layer === "ambient" ? "ambient" : "music",
          startBlockId: String(body.startBlockId ?? ""),
          endBlockId: String(body.endBlockId ?? ""),
          volume: typeof body.volume === "number" ? body.volume : undefined,
          fadeInMs: typeof body.fadeInMs === "number" ? body.fadeInMs : undefined,
          fadeOutMs: typeof body.fadeOutMs === "number" ? body.fadeOutMs : undefined,
          loop: typeof body.loop === "boolean" ? body.loop : undefined,
          overlapMode: body.overlapMode === "allow" || body.overlapMode === "exclusive" ? body.overlapMode : "crossfade",
        });
        await events.record("audio_cue_created", (await auth.session(authToken(request)))?.user.id, { cueId: cue.id });
        sendJson(response, 201, cue);
        return;
      }

      const cueRepairMatch = /^\/api\/admin\/audio\/cues\/([^/]+)\/repair$/.exec(pathname);
      if (method === "POST" && cueRepairMatch) {
        const cue = await audio.repairCue(cueRepairMatch[1], content);
        await events.record("audio_cue_repaired", (await auth.session(authToken(request)))?.user.id, { cueId: cue.id });
        sendJson(response, 200, cue);
        return;
      }

      const cueDeleteMatch = /^\/api\/admin\/audio\/cues\/([^/]+)$/.exec(pathname);
      if (method === "PUT" && cueDeleteMatch) {
        const body = await readJson(request);
        const overlapMode = body.overlapMode === "allow" || body.overlapMode === "exclusive" || body.overlapMode === "crossfade"
          ? body.overlapMode
          : undefined;
        const cue = await audio.updateCue(cueDeleteMatch[1], {
          assetId: typeof body.assetId === "string" ? body.assetId : undefined,
          layer: body.layer === "ambient" ? "ambient" : body.layer === "music" ? "music" : undefined,
          startBlockId: typeof body.startBlockId === "string" ? body.startBlockId : undefined,
          endBlockId: typeof body.endBlockId === "string" ? body.endBlockId : undefined,
          volume: typeof body.volume === "number" ? body.volume : undefined,
          fadeInMs: typeof body.fadeInMs === "number" ? body.fadeInMs : undefined,
          fadeOutMs: typeof body.fadeOutMs === "number" ? body.fadeOutMs : undefined,
          loop: typeof body.loop === "boolean" ? body.loop : undefined,
          overlapMode,
        });
        await events.record("audio_cue_updated", (await auth.session(authToken(request)))?.user.id, { cueId: cue.id });
        sendJson(response, 200, cue);
        return;
      }

      if (method === "DELETE" && cueDeleteMatch) {
        await audio.deleteCue(cueDeleteMatch[1]);
        sendJson(response, 200, { ok: true });
        return;
      }

      if (method === "GET" && isAdminShellRoute(pathname)) {
        try {
          await requireAdmin(request, auth);
        } catch (_error) {
          sendRedirect(response, `/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        if (await serveStatic(rootDir, "/admin", response)) {
          return;
        }
      }

      if (method === "GET" && (pathname === "/me/highlights" || pathname === "/me/notes")) {
        const context = await auth.session(authToken(request));
        if (!context) {
          sendRedirect(response, `/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        if (await serveStatic(rootDir, "/", response)) {
          return;
        }
      }

      if (await serveStatic(rootDir, pathname, response)) {
        return;
      }

      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      const status = typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : 500;
      sendJson(response, status, { error: error instanceof Error ? error.message : "Server error" });
    }
  });
}

export async function seedPostgresContent(options: CreateBookServerOptions = {}): Promise<void> {
  const rootDir = rootFromOptions(options);
  const pool = createPostgresPool(options.databaseUrl);
  try {
    await applyMigrations(pool);
    await new PostgresContentStore(pool, rootDir).bootstrapFromStatic();
    await new PostgresAuthStore(pool).bootstrapAdmin(readAdminBootstrapConfig(options));
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  createBookServer()
    .then((server) => {
      const port = Number(process.env.PORT || 8080);
      server.listen(port, () => {
        console.log(`Book server listening on ${port}`);
      });
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
