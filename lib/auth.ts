import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { issueNewSession, isSessionStillValid } from "./device-lock";
import { verifyOtp } from "./otp"; // <-- 1. เพิ่ม import นี้

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
        otp: { label: "OTP", type: "text" }, // <-- 2. เพิ่มช่อง otp
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const email = credentials.email.toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user) return null;

        // --- กรณีที่ 1: ล็อกอินด้วย OTP (Auto-login หลังสมัคร) ---
        if (credentials.otp) {
          const result = await verifyOtp(user.id, "EMAIL_VERIFY", String(credentials.otp));
          if (!result.ok) {
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
          if (!valid) return null;

          if (!user.emailVerified) {
            throw new Error("EMAIL_NOT_VERIFIED");
          }
        } else {
          return null;
        }

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
      if (user) {
        token.role = (user as any).role;
        token.sessionId = (user as any).sessionId;
        token.uid = (user as any).id;
        token.avatarUrl = (user as any).avatarUrl;
      }

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