import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  AuthSessionRecord,
  CreateUserInput,
  UserRecord,
  expiresAt,
  makeSessionId,
  makeUserId,
  normalizeEmail,
} from "../../../shared/src/users/schema";
import { nowIso } from "../../../shared/src/document/schema";

interface AuthStoreShape {
  users: UserRecord[];
  sessions: AuthSessionRecord[];
}

export interface CreateUserWithPasswordInput {
  email: string;
  displayName?: string;
  role: "admin" | "reader";
  password: string;
}

export class UserRepository {
  private readonly storePath: string;
  private store: AuthStoreShape;

  constructor(storePath = path.join(".planning", "data", "auth-store.json")) {
    this.storePath = storePath;
    this.store = this.load();
  }

  listUsers(): UserRecord[] {
    return [...this.store.users].sort((a, b) => a.email.localeCompare(b.email));
  }

  getUserByEmail(email: string): UserRecord | undefined {
    const normalized = normalizeEmail(email);
    return this.store.users.find((user) => user.email === normalized);
  }

  getUserById(userId: string): UserRecord | undefined {
    return this.store.users.find((user) => user.id === userId);
  }

  ensureUser(input: CreateUserWithPasswordInput): UserRecord {
    const existing = this.getUserByEmail(input.email);
    if (existing) {
      return existing;
    }

    return this.createUser({
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      passwordHash: hashPassword(input.password),
    });
  }

  createUser(input: CreateUserInput): UserRecord {
    const email = normalizeEmail(input.email);
    if (this.getUserByEmail(email)) {
      throw new Error(`User already exists: ${email}`);
    }

    const now = nowIso();
    const record: UserRecord = {
      id: makeUserId(email),
      email,
      displayName: input.displayName,
      role: input.role,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    this.store.users.push(record);
    this.save();

    return record;
  }

  updateLastLogin(userId: string): void {
    this.store.users = this.store.users.map((user) => {
      if (user.id !== userId) {
        return user;
      }

      return {
        ...user,
        lastLoginAt: nowIso(),
        updatedAt: nowIso(),
      };
    });

    this.save();
  }

  createSession(userId: string, role: "admin" | "reader", ttlHours = 24): AuthSessionRecord {
    const session: AuthSessionRecord = {
      id: makeSessionId(userId),
      userId,
      role,
      token: issueToken(),
      createdAt: nowIso(),
      expiresAt: expiresAt(ttlHours),
    };

    this.store.sessions.push(session);
    this.save();

    return session;
  }

  getSessionByToken(token: string): AuthSessionRecord | undefined {
    const now = Date.now();
    return this.store.sessions.find((session) => {
      if (session.token !== token) {
        return false;
      }
      if (session.revokedAt) {
        return false;
      }
      return new Date(session.expiresAt).getTime() > now;
    });
  }

  revokeSession(token: string): void {
    const now = nowIso();
    this.store.sessions = this.store.sessions.map((session) => {
      if (session.token !== token || session.revokedAt) {
        return session;
      }
      return {
        ...session,
        revokedAt: now,
      };
    });
    this.save();
  }

  pruneExpiredSessions(): void {
    const now = Date.now();
    this.store.sessions = this.store.sessions.filter((session) => {
      if (session.revokedAt) {
        return false;
      }
      return new Date(session.expiresAt).getTime() > now;
    });
    this.save();
  }

  private load(): AuthStoreShape {
    try {
      if (!fs.existsSync(this.storePath)) {
        return { users: [], sessions: [] };
      }

      const raw = fs.readFileSync(this.storePath, "utf8");
      const parsed = JSON.parse(raw) as AuthStoreShape;
      return {
        users: parsed.users ?? [],
        sessions: parsed.sessions ?? [],
      };
    } catch {
      return { users: [], sessions: [] };
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
    fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2), "utf8");
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return `${salt}:${digest}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, digest] = passwordHash.split(":");
  if (!salt || !digest) {
    return false;
  }

  const calculated = crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest, "utf8"), Buffer.from(calculated, "utf8"));
}

function issueToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
