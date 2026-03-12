import { AuthService } from "../../platform/api/src/auth/auth.service";
import { RequestLike } from "../../platform/api/src/auth/role.middleware";
import { ensureAdminAccess } from "./auth/admin-guard";

export interface AdminRoute {
  path: string;
  title: string;
  requiresAuth: true;
  requiredRole: "admin";
}

export interface AdminRouteResolution {
  allowed: boolean;
  redirectTo?: string;
  reason?: string;
  routes: AdminRoute[];
}

export const ADMIN_ROUTES: AdminRoute[] = [
  { path: "/admin", title: "Dashboard", requiresAuth: true, requiredRole: "admin" },
  { path: "/admin/chapters", title: "Chapters", requiresAuth: true, requiredRole: "admin" },
  { path: "/admin/audio", title: "Audio Studio", requiresAuth: true, requiredRole: "admin" },
  { path: "/admin/publish", title: "Publishing", requiresAuth: true, requiredRole: "admin" },
];

export function resolveAdminRoutes(
  request: RequestLike,
  authService: AuthService,
): AdminRouteResolution {
  const gate = ensureAdminAccess(request, authService);
  if (!gate.allowed) {
    return {
      allowed: false,
      redirectTo: gate.redirectTo,
      reason: gate.reason,
      routes: [],
    };
  }

  return {
    allowed: true,
    routes: ADMIN_ROUTES,
  };
}
