import { auth } from "@/auth";
import { Role } from "@/generated/prisma";

export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in.") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
  }
}

export type SessionUser = { id: string; email: string; role: Role };

/** Returns the current session's user, or null when signed out. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Every server action and route must call this first (CLAUDE.md "Coding
 * Conventions"). Throws rather than redirecting so callers — Server Actions
 * in particular — can decide how to surface the failure.
 */
export async function requireRole(
  ...roles: [Role, ...Role[]]
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}
