import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { issueNewSession, isSessionStillValid } from "./device-lock";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        if (!user.emailVerified) {
          // NextAuth surfaces thrown errors as ?error=<message> on redirect;
          // the login page checks for this and sends the student to verify-otp.
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // Device-lock: every successful login mints a new session id and
        // invalidates whatever device was previously signed in.
        const sessionId = await issueNewSession(user.id, "unknown-device");

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          avatarUrl: user.avatarUrl,
          sessionId,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // First sign-in: copy role + sessionId onto the token.
      if (user) {
        token.role = (user as any).role;
        token.sessionId = (user as any).sessionId;
        token.uid = (user as any).id;
        token.avatarUrl = (user as any).avatarUrl;
      }

      // Every subsequent request: verify this token's sessionId still
      // matches the DB. If another device logged in since, this token is
      // stale — mark it invalid so the session callback can force sign-out.
      if (token.uid && token.sessionId) {
        const stillValid = await isSessionStillValid(
          token.uid as string,
          token.sessionId as string
        );
        if (!stillValid) {
          token.invalidated = true;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.invalidated) {
        // Returning an empty session forces next-auth's client hooks to
        // treat the user as signed out; middleware also independently
        // rejects the request (see middleware.ts).
        return { ...session, user: undefined, expires: session.expires } as any;
      }
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).role = token.role;
        (session.user as any).avatarUrl = token.avatarUrl;
      }
      return session;
    },
  },
};
