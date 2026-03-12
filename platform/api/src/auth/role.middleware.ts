import { SessionContext, UserRole } from "../../../shared/src/users/schema";
import { AuthService } from "./auth.service";

export interface RequestLike {
  headers?: Record<string, string | undefined>;
  cookies?: Record<string, string | undefined>;
}

export function readAuthToken(request: RequestLike): string | undefined {
  const header = request.headers?.authorization ?? request.headers?.Authorization;
  if (header) {
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (match) {
      return match[1].trim();
    }
  }

  const cookieToken = request.cookies?.sessionToken;
  if (cookieToken) {
    return cookieToken;
  }

  return undefined;
}

export function authenticateRequest(
  request: RequestLike,
  authService: AuthService,
): SessionContext | undefined {
  const token = readAuthToken(request);
  return authService.optionalSession(token);
}

export function requireRole(
  request: RequestLike,
  authService: AuthService,
  role: UserRole,
): SessionContext {
  const token = readAuthToken(request);
  return authService.requireRole(token, role);
}
