import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { issueNewSession, getSessionState } from "./device-lock";
import { rateLimit, peekRateLimit, clientIp } from "./rate-limit";
import { verifyOtp } from "./otp";

const LOGIN_ACCOUNT_LIMIT = { limit: 5, windowSeconds: 15 * 60 };
const LOGIN_IP_LIMIT = { limit: 20, windowSeconds: 15 * 60 };

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET, // <-- เพิ่มบรรทัดนี้
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" }, // <-- 2. เพิ่มช่อง otp
      },
      async authorize(credentials, req) {
        if (!credentials?.email) return null;
        const ip = clientIp((req as any)?.headers ?? {});

        // Per-account lock stops brute-forcing one person's password (or OTP)
        // from any IP; per-IP lock stops credential-stuffing many accounts
        // from one source.
        //
        // Only a WRONG password/OTP or unknown account below counts as an
        // attempt against these limits (via recordFailedAttempt) — a
        // successful login must never count, or normal re-logins (switching
        // devices, a previous session getting device-locked out, simply
        // logging in again later) would eventually lock out someone using
        // the correct password. Here we only peek at the current count so an
        // already-locked-out caller still fails fast.
        const peekEmail = credentials.email.toLowerCase();
        const accountPeek = await peekRateLimit("login-account", peekEmail, LOGIN_ACCOUNT_LIMIT);
        if (!accountPeek.allowed) throw new Error("TOO_MANY_ATTEMPTS");
        const ipPeek = await peekRateLimit("login-ip", ip, LOGIN_IP_LIMIT);
        if (!ipPeek.allowed) throw new Error("TOO_MANY_ATTEMPTS");

        async function recordFailedAttempt() {
          await rateLimit("login-account", peekEmail, LOGIN_ACCOUNT_LIMIT);
          await rateLimit("login-ip", ip, LOGIN_IP_LIMIT);
        }

        const email = credentials.email.toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user) {
          await recordFailedAttempt();
          return null;
        }

        // --- กรณีที่ 1: ล็อกอินด้วย OTP (Auto-login หลังสมัคร) ---
        if (credentials.otp) {
          const result = await verifyOtp(user.id, "EMAIL_VERIFY", String(credentials.otp));
          if (!result.ok) {
            await recordFailedAttempt();
            throw new Error("รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว");
          }
          if (!user.emailVerified) {
            await prisma.user.update({
              where: { id: user.id },
              data: { emailVerified: true },
            });
          }
        }
        // --- กรณีที่ 2: ล็อกอินปกติด้วย Password ---
        else if (credentials.password) {
          const valid = await bcrypt.compare(credentials.password, user.password);
          if (!valid) {
            await recordFailedAttempt();
            return null;
          }

          if (!user.emailVerified) {
            throw new Error("EMAIL_NOT_VERIFIED");
          }
        } else {
          return null;
        }

        // Checked only after the password/OTP is verified, so this never reveals
        // to a stranger whether an account exists or is banned.
        if (user.isBanned) throw new Error("ACCOUNT_BANNED");

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
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.avatarUrl !== undefined) token.avatarUrl = session.avatarUrl;
      }

      // First sign-in: ดึงข้อมูลลง token แล้ว return ทันที (ตัด query ซ้ำออก)
      if (user) {
        token.role = (user as any).role;
        token.sessionId = (user as any).sessionId;
        token.uid = (user as any).id;
        token.avatarUrl = (user as any).avatarUrl;
        return token; // <-- เพิ่มบรรทัดนี้ ลดเวลาไปเกือบ 1 วินาที!
      }

      // Every subsequent request:
      if (token.uid && token.sessionId) {
        const state = await getSessionState(token.uid as string, token.sessionId as string);
        if (!state.valid) {
          token.invalidated = true;
        } else if (state.role) {
          token.role = state.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.invalidated) {
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