import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { PasswordAuthenticationService } from "@/modules/auth/application/password-authentication-service";

const authentication = new PasswordAuthenticationService();

export const authCapabilities = { password: true } as const;

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [CredentialsProvider({
    id: "credentials",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (typeof credentials?.email !== "string" || typeof credentials.password !== "string") return null;
      return authentication.authenticate(credentials.email, credentials.password);
    },
  })],
  pages: { signIn: "/auth/signin", error: "/auth/error" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.credentialVersion = (user as typeof user & { credentialVersion: number }).credentialVersion;
      }
      if (token.sub && token.credentialVersion) {
        const current = await authentication.currentCredential(token.sub);
        if (!current || current.status !== "active" || current.credentialVersion !== token.credentialVersion) token.sub = undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      else session.user = undefined;
      return session;
    },
  },
};
