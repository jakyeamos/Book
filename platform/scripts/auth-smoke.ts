import * as fs from "node:fs";
import * as path from "node:path";
import { resolveAdminRoutes } from "../../app/admin/routes";
import { buildReaderSessionIndicator } from "../../app/reader/account/session-indicator";
import { resolveReaderRoute } from "../../app/reader/routes";
import { AuthService } from "../api/src/auth/auth.service";
import { UserRepository } from "../api/src/users/user.repository";

function run(): void {
  const storePath = path.join(".planning", "data", "auth-store.smoke.json");
  if (fs.existsSync(storePath)) {
    fs.unlinkSync(storePath);
  }

  const users = new UserRepository(storePath);
  const auth = new AuthService(users);
  auth.bootstrapDefaults();

  const admin = auth.login({
    email: "admin@example.com",
    password: "change-me-admin",
  });

  const reader = auth.login({
    email: "reader@example.com",
    password: "change-me-reader",
  });

  const adminRequest = {
    headers: { authorization: `Bearer ${admin.session.token}` },
  };

  const readerRequest = {
    headers: { authorization: `Bearer ${reader.session.token}` },
  };

  const adminAccess = resolveAdminRoutes(adminRequest, auth);
  if (!adminAccess.allowed) {
    throw new Error("Expected admin route access for admin session");
  }

  const deniedAccess = resolveAdminRoutes(readerRequest, auth);
  if (deniedAccess.allowed) {
    throw new Error("Reader session should not have admin route access");
  }

  const readerIndicator = buildReaderSessionIndicator(readerRequest, auth);
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
