import { AuthService } from "../../platform/api/src/auth/auth.service";
import { RequestLike, readAuthToken } from "../../platform/api/src/auth/role.middleware";

export interface ReaderRoute {
  path: string;
  title: string;
  requiresLogin: boolean;
}

export interface ReaderRouteResolution {
  allowed: boolean;
  redirectTo?: string;
  route?: ReaderRoute;
}

export const READER_ROUTES: ReaderRoute[] = [
  { path: "/", title: "Read", requiresLogin: false },
  { path: "/chapter/:slug", title: "Chapter", requiresLogin: false },
  { path: "/me/highlights", title: "My Highlights", requiresLogin: true },
  { path: "/me/notes", title: "My Notes", requiresLogin: true },
];

export function resolveReaderRoute(
  path: string,
  request: RequestLike,
  authService: AuthService,
): ReaderRouteResolution {
  const route = READER_ROUTES.find((candidate) => candidate.path === path);
  if (!route) {
    return { allowed: false, redirectTo: "/" };
  }

  if (!route.requiresLogin) {
    return { allowed: true, route };
  }

  const token = readAuthToken(request);
  const context = authService.optionalSession(token);
  if (!context) {
    return { allowed: false, redirectTo: "/login" };
  }

  return { allowed: true, route };
}
