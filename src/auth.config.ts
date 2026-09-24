import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma";

// Edge-safe subset of the Auth.js config — no providers, no Prisma/bcrypt
// imports — so middleware (which runs on the Edge runtime) can decode the
// session JWT without pulling in Node-only dependencies. The full config
// with the Credentials provider lives in src/auth.ts. Session/JWT type
// augmentation lives in src/types/next-auth.d.ts.

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
};
