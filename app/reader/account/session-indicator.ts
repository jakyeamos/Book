import { AuthService } from "../../../platform/api/src/auth/auth.service";
import { RequestLike, readAuthToken } from "../../../platform/api/src/auth/role.middleware";
import { UserRole } from "../../../platform/shared/src/users/schema";

export interface ReaderSessionIndicator {
  isLoggedIn: boolean;
  role?: UserRole;
  label: string;
}

export function buildReaderSessionIndicator(
  request: RequestLike,
  authService: AuthService,
): ReaderSessionIndicator {
  const token = readAuthToken(request);
  const context = authService.optionalSession(token);

  if (!context) {
    return {
      isLoggedIn: false,
      label: "Sign in to sync highlights and progress",
    };
  }

  return {
    isLoggedIn: true,
    role: context.user.role,
    label: `Signed in as ${context.user.displayName ?? context.user.email}`,
  };
}
