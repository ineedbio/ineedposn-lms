import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { issueNewSession, isSessionStillValid } from "./device-lock";
import { rateLimit, peekRateLimit, clientIp } from "./rate-limit";

const LOGIN_ACCOUNT_LIMIT = { limit: 5, windowSeconds: 15 * 60 };
const LOGIN_IP_LIMIT = { limit: 20, windowSeconds: 15 * 60 };

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
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase();
        const ip = clientIp((req as any)?.headers ?? {});

        // Per-account lock stops brute-forcing one person's password from
        // any IP; per-IP lock stops credential-stuffing many accounts from
        // one source. Both throw the same generic error NextAuth already
        // shows on a wrong password, so this never reveals which accounts
        // exist or which limit tripped.
        //
        // Only a WRONG password/unknown account below counts as an attempt
        // against these limits (via recordFailedAttempt) — a successful
        // login must never count, or normal re-logins (switching devices,
        // a previous session getting device-locked out, simply logging in
        // again later) would eventually lock out someone using the correct
        // password. Here we only peek at the current count so an
        // already-locked-out caller still fails fast.
        const accountPeek = await peekRateLimit("login-account", email, LOGIN_ACCOUNT_LIMIT);
        if (!accountPeek.allowed) throw new Error("TOO_MANY_ATTEMPTS");
        const ipPeek = await peekRateLimit("login-ip", ip, LOGIN_IP_LIMIT);
        if (!ipPeek.allowed) throw new Error("TOO_MANY_ATTEMPTS");

        async function recordFailedAttempt() {
          await rateLimit("login-account", email, LOGIN_ACCOUNT_LIMIT);
          await rateLimit("login-ip", ip, LOGIN_IP_LIMIT);
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user) {
          await recordFailedAttempt();
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          await recordFailedAttempt();
          return null;
        }

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
