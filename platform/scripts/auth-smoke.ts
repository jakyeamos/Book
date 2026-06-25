import * as fs from "node:fs";
import * as crypto from "node:crypto";
import * as path from "node:path";
import { resolveAdminRoutes } from "../../app/admin/routes";
import { buildReaderSessionIndicator } from "../../app/reader/account/session-indicator";
import { resolveReaderRoute } from "../../app/reader/routes";
import { AuthService } from "../api/src/auth/auth.service";
import { UserRepository } from "../api/src/users/user.repository";

function legacyHash(password: string): string {
  const salt = "legacy-smoke-salt";
  const digest = crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return `${salt}:${digest}`;
}

function run(): void {
  const storePath = path.join(".planning", "data", "auth-store.smoke.json");
  if (fs.existsSync(storePath)) {
    fs.unlinkSync(storePath);
  }

  const users = new UserRepository(storePath);
  const auth = new AuthService(users);
  auth.bootstrapAdmin({
    email: "smoke-admin@example.com",
    password: "smoke-admin-password",
  });
  users.ensureUser({
    email: "smoke-reader@example.com",
    displayName: "Smoke Reader",
    role: "reader",
    password: "smoke-reader-password",
  });
  users.createUser({
    email: "legacy-reader@example.com",
    displayName: "Legacy Reader",
    role: "reader",
    passwordHash: legacyHash("legacy-reader-password"),
  });

  for (const credentials of [
    { email: "admin@example.com", password: "change-me-admin" },
    { email: "reader@example.com", password: "change-me-reader" },
  ]) {
    try {
      auth.login(credentials);
      throw new Error(`Default credentials unexpectedly worked for ${credentials.email}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Default credentials unexpectedly worked")) {
        throw error;
      }
    }
  }

  const admin = auth.login({
    email: "smoke-admin@example.com",
    password: "smoke-admin-password",
  });

  const reader = auth.login({
    email: "smoke-reader@example.com",
    password: "smoke-reader-password",
  });

  auth.login({
    email: "legacy-reader@example.com",
    password: "legacy-reader-password",
  });
  const upgradedLegacyUser = users.getUserByEmail("legacy-reader@example.com");
  if (!upgradedLegacyUser?.passwordHash.startsWith("scrypt:")) {
    throw new Error("Legacy password hash was not upgraded after successful login");
  }

  const adminRequest = {
    headers: { authorization: `Bearer ${admin.session.token}` },
  };

  const readerRequest = {
    headers: { authorization: `Bearer ${reader.session.token}` },
  };

  const readerCookieRequest = {
    cookies: { auth_token: reader.session.token },
  };

  const adminAccess = resolveAdminRoutes(adminRequest, auth);
  if (!adminAccess.allowed) {
    throw new Error("Expected admin route access for admin session");
  }

  const deniedAccess = resolveAdminRoutes(readerRequest, auth);
  if (deniedAccess.allowed) {
    throw new Error("Reader session should not have admin route access");
  }

  const readerIndicator = buildReaderSessionIndicator(readerCookieRequest, auth);
  if (!readerIndicator.isLoggedIn) {
    throw new Error("Expected reader to be logged in for session indicator");
  }

  const syncRoute = resolveReaderRoute("/me/highlights", readerRequest, auth);
  if (!syncRoute.allowed) {
    throw new Error("Expected logged-in reader to access sync route");
  }

  const anonRoute = resolveReaderRoute("/me/highlights", { headers: {} }, auth);
  if (anonRoute.allowed) {
    throw new Error("Expected anonymous user to be redirected from sync route");
  }

  fs.unlinkSync(storePath);
  console.log("platform auth smoke test: ok");
}

run();
