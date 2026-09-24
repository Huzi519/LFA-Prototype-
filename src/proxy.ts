import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { Role } from "@/generated/prisma";

// Edge-safe: built from auth.config.ts (no providers/Prisma/bcrypt) so it
// only ever decodes the session JWT, never hits the database.
const { auth } = NextAuth(authConfig);

const ROLE_PREFIXES: { prefix: string; role: Role }[] = [
  { prefix: "/worker", role: Role.WORKER },
  { prefix: "/company", role: Role.COMPANY },
  { prefix: "/admin", role: Role.ADMIN },
];

const DASHBOARD_BY_ROLE: Record<Role, string> = {
  WORKER: "/worker/dashboard",
  COMPANY: "/company/dashboard",
  ADMIN: "/admin/dashboard",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const match = ROLE_PREFIXES.find((r) => pathname.startsWith(r.prefix));
  if (!match) return NextResponse.next();

  const user = req.auth?.user;
  if (!user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user.role !== match.role) {
    return NextResponse.redirect(
      new URL(DASHBOARD_BY_ROLE[user.role], req.nextUrl.origin)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/worker/:path*", "/company/:path*", "/admin/:path*"],
};
