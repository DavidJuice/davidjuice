import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Use edge-compatible auth (no Prisma/Node.js modules) for middleware
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export default middleware;
