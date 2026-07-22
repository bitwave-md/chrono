import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";

import { db } from "@/db/client";
import {
  accounts,
  authenticators,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";
import { AuthAccessService } from "@/modules/auth/application/auth-access-service";
import { BootstrapUserService } from "@/modules/auth/application/bootstrap-user-service";
import { MembershipProvisioningService } from "@/modules/auth/application/membership-provisioning-service";
import { BootstrapCredentials } from "@/modules/auth/domain/bootstrap-credentials";
import { EmailServerConfiguration } from "@/modules/auth/infrastructure/email-server-configuration";

const authAccessService = new AuthAccessService();
const membershipProvisioningService = new MembershipProvisioningService();
const bootstrapCredentials = BootstrapCredentials.fromEnvironment();
const bootstrapUserService = bootstrapCredentials
  ? new BootstrapUserService(bootstrapCredentials)
  : null;

const adapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
  authenticatorsTable: authenticators,
}) as Adapter;

const providers: NextAuthOptions["providers"] = [CredentialsProvider({
  id: "bootstrap",
  name: "Owner setup key",
  credentials: {
    email: { label: "Owner email", type: "email" },
    token: { label: "Setup key", type: "password" },
  },
  async authorize(credentials) {
    if (!bootstrapUserService || !credentials?.email || !credentials.token) return null;
    return bootstrapUserService.authenticate(credentials.email, credentials.token);
  },
})];

if (process.env.EMAIL_SERVER) {
  providers.push(EmailProvider({
    server: EmailServerConfiguration.from(process.env.EMAIL_SERVER).toTransportOptions(),
    from: process.env.EMAIL_FROM ?? "Chrono <chrono@localhost>",
    maxAge: 15 * 60,
  }));
}

export const authCapabilities = {
  bootstrap: Boolean(bootstrapUserService),
  email: Boolean(process.env.EMAIL_SERVER),
};

export const authOptions: NextAuthOptions = {
  adapter,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers,
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      if (account?.provider === "bootstrap") return true;
      return authAccessService.canRequestMagicLink(user.email);
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.email) {
        await membershipProvisioningService.provision(user.id, user.email);
      }
    },
    async signIn({ user }) {
      if (user.email) {
        await membershipProvisioningService.provision(user.id, user.email);
      }
    },
  },
};
