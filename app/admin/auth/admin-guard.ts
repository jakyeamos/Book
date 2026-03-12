import { AuthService } from "../../../platform/api/src/auth/auth.service";
import { RequestLike, requireRole } from "../../../platform/api/src/auth/role.middleware";

export interface AdminGuardResult {
  allowed: boolean;
  redirectTo?: string;
  reason?: string;
}

export function ensureAdminAccess(
  request: RequestLike,
  authService: AuthService,
): AdminGuardResult {
  try {
    requireRole(request, authService, "admin");
    return { allowed: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return {
      allowed: false,
      redirectTo: "/login?next=/admin",
      reason: message,
    };
  }
}
