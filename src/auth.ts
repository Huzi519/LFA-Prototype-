import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { UserStatus } from "@/generated/prisma";
import { authConfig } from "@/auth.config";

// Full Auth.js config (Node runtime only — imports Prisma + bcrypt). Used
// by Server Actions, Route Handlers and Server Components. See CLAUDE.md
// "Auth: Auth.js (NextAuth) ... role stored on the user".

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!user || user.status === UserStatus.SUSPENDED) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
});
