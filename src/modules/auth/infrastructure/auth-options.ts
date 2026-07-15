import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
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
import { MembershipProvisioningService } from "@/modules/auth/application/membership-provisioning-service";

const authAccessService = new AuthAccessService();
const membershipProvisioningService = new MembershipProvisioningService();

const adapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
  authenticatorsTable: authenticators,
}) as Adapter;

export const authOptions: NextAuthOptions = {
  adapter,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER ?? "smtp://localhost:1025",
      from: process.env.EMAIL_FROM ?? "Chrono <chrono@localhost>",
      maxAge: 15 * 60,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      return authAccessService.canRequestMagicLink(user.email);
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
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
