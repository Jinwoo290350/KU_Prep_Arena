import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"
import { authConfig } from "./auth.config"

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex")
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: user } = await supabase
          .from("app_users")
          .select("id, username, salt, password_hash")
          .eq("username", credentials.username as string)
          .single()

        if (!user) return null

        const hash = hashPassword(credentials.password as string, user.salt)
        if (hash !== user.password_hash) return null

        return {
          id: user.id,
          name: user.username,
          email: `${user.username}@ku.prep.local`,
          image: null,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, profile }) {
      if (profile) {
        token.email = profile.email
        token.name = profile.name
        token.picture = profile.picture as string | undefined
      }
      if (user) {
        token.email = user.email
        token.name = user.name
        token.picture = user.image ?? undefined
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string | null | undefined
      }
      return session
    },
  },
})
