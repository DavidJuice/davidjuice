/**
 * Edge-compatible auth config (no Prisma/Node.js dependencies).
 * Used by middleware only.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const publicPaths = [
        "/login",
        "/register",
        "/api/auth",
        "/api/register",
        "/api/webhooks",
      ];
      const isPublic = publicPaths.some((p) => pathname.startsWith(p));

      if (isPublic) return true;
      if (isLoggedIn) return true;

      // Redirect to login with callback URL
      const loginUrl = new URL("/login", nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return Response.redirect(loginUrl);
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "MEMBER";
      }
      return token;
    },
  },
  providers: [], // populated in lib/auth.ts
};
