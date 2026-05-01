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
import { applyMigrations, createPostgresPool } from "./db/postgres";
import { hashPassword, verifyPassword } from "./users/user.repository";

export interface CreateBookServerOptions {
  mode?: "memory" | "postgres";
  rootDir?: string;
  databaseUrl?: string;
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
  updateChapter(chapterId: string, updates: { title?: string; html?: string }): Promise<ChapterRecord>;
  setChapterStatus(chapterId: string, status: ChapterStatus): Promise<ChapterRecord>;
}

interface AuthStore {
  bootstrapDefaults(): Promise<void>;
  registerReader(email: string, password: string, displayName?: string): Promise<{ user: UserRecord; session: AuthSessionRecord }>;
  login(email: string, password: string): Promise<{ user: UserRecord; session: AuthSessionRecord }>;
  session(token: string | undefined): Promise<{ user: UserRecord; session: AuthSessionRecord } | undefined>;
  logout(token: string | undefined): Promise<void>;
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
  deleteCue(cueId: string): Promise<void>;
}

function rootFromOptions(options: CreateBookServerOptions): string {
  return options.rootDir ?? process.cwd();
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
  const regex = /<(h2|h3|p|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
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
      level: tag === "h3" ? 3 : tag === "h2" ? 2 : undefined,
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

function makeChapterRecord(input: {
  slug: string;
  title: string;
  number: number;
  html: string;
  sourceFile: string;
  status?: ChapterStatus;
}): ChapterRecord {
  const id = makeChapterId(input.slug);
  const now = nowIso();
  const normalizedDocument = normalizeHtmlChapter(id, input.html);
  const sourceImport: SourceImportMeta = {
    sourceType: "html-fragment",
    sourceFile: input.sourceFile,
    importedAt: now,
    warnings: [],
  };

  return {
    id,
    slug: input.slug,
    title: input.title,
    orderIndex: input.number,
    status: input.status ?? "published",
    type: "standard",
    visibility: defaultVisibility(),
    theme: {},
    sourceImport,
    normalizedDocument,
    compiledOutput: compileRawHtml(id, input.html, normalizedDocument),
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

  async updateChapter(chapterId: string, updates: { title?: string; html?: string }): Promise<ChapterRecord> {
    const chapter = await this.getChapter(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const html = updates.html ?? chapter.compiledOutput.html;
    const title = updates.title ?? deriveTitle(html, chapter.title);
    const normalizedDocument = normalizeHtmlChapter(chapter.id, html);
    const next = {
      ...chapter,
      title,
      status: "draft" as ChapterStatus,
      normalizedDocument,
      compiledOutput: compileRawHtml(chapter.id, html, normalizedDocument),
      updatedAt: nowIso(),
    };
    this.chapters = this.chapters.map((item) => (item.id === chapter.id ? next : item));
    return next;
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

  async updateChapter(chapterId: string, updates: { title?: string; html?: string }): Promise<ChapterRecord> {
    const current = await this.getChapter(chapterId);
    if (!current) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const html = updates.html ?? current.compiledOutput.html;
    const normalizedDocument = normalizeHtmlChapter(current.id, html);
    const next: ChapterRecord = {
      ...current,
      title: updates.title ?? deriveTitle(html, current.title),
      status: "draft",
      normalizedDocument,
      compiledOutput: compileRawHtml(current.id, html, normalizedDocument),
      updatedAt: nowIso(),
    };
    await this.upsertChapter(next);
    return next;
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
}

class MemoryAuthStore implements AuthStore {
  private users: UserRecord[] = [];
  private sessions: AuthSessionRecord[] = [];

  async bootstrapDefaults(): Promise<void> {
    this.ensureUser("admin@example.com", "Admin", "admin", "change-me-admin");
    this.ensureUser("reader@example.com", "Reader", "reader", "change-me-reader");
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

  async bootstrapDefaults(): Promise<void> {
    const email = normalizeEmail(process.env.ADMIN_EMAIL || "admin@example.com");
    const password = process.env.ADMIN_PASSWORD || "change-me-admin";
    const existing = await this.pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return;
    }

    const now = nowIso();
    await this.pool.query(
      `INSERT INTO users (id, email, display_name, role, password_hash, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [makeUserId(email), email, "Admin", "admin", hashPassword(password), now, now],
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

  async deleteCue(cueId: string): Promise<void> {
    await this.pool.query("DELETE FROM audio_cues WHERE id = $1", [cueId]);
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

function chapterPayload(chapter: ChapterRecord): Record<string, unknown> {
  return {
    id: chapter.id,
    slug: chapter.slug,
    title: chapter.title,
    number: chapter.orderIndex,
    status: chapter.status,
    html: chapter.compiledOutput.html,
    version: chapter.version,
    updatedAt: chapter.updatedAt,
  };
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
  const readerState: ReaderStateStore = pool ? new PostgresReaderStateStore(pool) : new MemoryReaderStateStore();
  const events: AppEventStore = pool ? new PostgresAppEventStore(pool) : new MemoryAppEventStore();

  await content.bootstrapFromStatic();
  await auth.bootstrapDefaults();
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
        sendJson(response, 200, {
          ok: manifest.length > 0,
          mode,
          checks: {
            readerApi: manifest.length > 0,
            adminApi: true,
            auth: true,
            storage: true,
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
        sendJson(response, 200, chapters.map(chapterPayload));
        return;
      }

      if (method === "GET" && pathname === "/api/admin/analytics/events") {
        sendJson(response, 200, { events: await events.list(100) });
        return;
      }

      const adminChapterMatch = /^\/api\/admin\/chapters\/([^/]+)$/.exec(pathname);
      if (adminChapterMatch && method === "GET") {
        const chapter = await content.getChapter(adminChapterMatch[1]);
        sendJson(response, chapter ? 200 : 404, chapter ? chapterPayload(chapter) : { error: "Chapter not found" });
        return;
      }

      if (adminChapterMatch && method === "PUT") {
        const body = await readJson(request);
        const chapter = await content.updateChapter(adminChapterMatch[1], {
          title: typeof body.title === "string" ? body.title : undefined,
          html: typeof body.html === "string" ? body.html : undefined,
        });
        await events.record("chapter_updated", (await auth.session(authToken(request)))?.user.id, { chapterId: chapter.id });
        sendJson(response, 200, chapterPayload(chapter));
        return;
      }

      const publishMatch = /^\/api\/admin\/chapters\/([^/]+)\/publish$/.exec(pathname);
      if (publishMatch && method === "POST") {
        const chapter = await content.setChapterStatus(publishMatch[1], "published");
        await events.record("chapter_published", (await auth.session(authToken(request)))?.user.id, { chapterId: chapter.id });
        sendJson(response, 200, chapterPayload(chapter));
        return;
      }

      const previewMatch = /^\/api\/admin\/chapters\/([^/]+)\/preview$/.exec(pathname);
      if (previewMatch && method === "POST") {
        sendJson(response, 200, chapterPayload(await content.setChapterStatus(previewMatch[1], "preview")));
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

      const cueDeleteMatch = /^\/api\/admin\/audio\/cues\/([^/]+)$/.exec(pathname);
      if (method === "DELETE" && cueDeleteMatch) {
        await audio.deleteCue(cueDeleteMatch[1]);
        sendJson(response, 200, { ok: true });
        return;
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
    await new PostgresAuthStore(pool).bootstrapDefaults();
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
