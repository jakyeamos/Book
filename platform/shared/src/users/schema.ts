import { nowIso } from "../document/schema";

export type UserRole = "admin" | "reader";

export interface UserRecord {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  role: UserRole;
  token: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface SessionContext {
  user: UserRecord;
  session: AuthSessionRecord;
}

export interface CreateUserInput {
  email: string;
  displayName?: string;
  role: UserRole;
  passwordHash: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isRole(value: string): value is UserRole {
  return value === "admin" || value === "reader";
}

export function makeUserId(email: string): string {
  const safe = normalizeEmail(email).replace(/[^a-z0-9]+/g, "_");
  return `usr_${safe}`;
}

export function makeSessionId(userId: string): string {
  return `ses_${userId}_${Date.now()}`;
}

export function expiresAt(hoursFromNow: number): string {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date.toISOString();
}

export function touchUpdated<T extends { updatedAt: string }>(record: T): T {
  return {
    ...record,
    updatedAt: nowIso(),
  };
}
