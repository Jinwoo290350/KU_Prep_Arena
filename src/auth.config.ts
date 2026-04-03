import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

// Edge-safe config — no Node.js modules (no crypto, no supabase)
// Used by middleware only. Full auth.ts handles API routes and server components.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [Google],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isLoginPage = nextUrl.pathname === "/login"
      const isApi = nextUrl.pathname.startsWith("/api/")

      if (isApi) return true
      if (isLoginPage) return isLoggedIn ? Response.redirect(new URL("/", nextUrl)) : true
      return isLoggedIn
    },
  },
}
