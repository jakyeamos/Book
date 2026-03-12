import { SessionContext, UserRole } from "../../../shared/src/users/schema";
import { UserRepository, verifyPassword } from "../users/user.repository";

export interface LoginInput {
  email: string;
  password: string;
  ttlHours?: number;
}

export class AuthService {
  constructor(private readonly users: UserRepository) {}

  bootstrapDefaults(): void {
    this.users.ensureUser({
      email: "admin@example.com",
      displayName: "Admin",
      role: "admin",
      password: "change-me-admin",
    });

    this.users.ensureUser({
      email: "reader@example.com",
      displayName: "Reader",
      role: "reader",
      password: "change-me-reader",
    });
  }

  login(input: LoginInput): SessionContext {
    const user = this.users.getUserByEmail(input.email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (!verifyPassword(input.password, user.passwordHash)) {
      throw new Error("Invalid credentials");
    }

    const session = this.users.createSession(user.id, user.role, input.ttlHours ?? 24);
    this.users.updateLastLogin(user.id);

    return { user, session };
  }

  logout(token: string): void {
    this.users.revokeSession(token);
  }

  optionalSession(token: string | undefined): SessionContext | undefined {
    if (!token) {
      return undefined;
    }

    const session = this.users.getSessionByToken(token);
    if (!session) {
      return undefined;
    }

    const user = this.users.getUserById(session.userId);
    if (!user) {
      return undefined;
    }

    return { user, session };
  }

  requireSession(token: string | undefined): SessionContext {
    const context = this.optionalSession(token);
    if (!context) {
      throw new Error("Unauthorized");
    }
    return context;
  }

  requireRole(token: string | undefined, role: UserRole): SessionContext {
    const context = this.requireSession(token);
    if (context.user.role !== role) {
      throw new Error("Forbidden");
    }

    return context;
  }
}
