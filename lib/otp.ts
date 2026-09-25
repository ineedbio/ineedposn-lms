import crypto from "crypto";
import type { OtpPurpose } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * One-time codes for email verification and password reset.
 *
 * Design (ported from the backend scaffold, replacing the old plaintext
 * User.otpCode / User.otpExpiry columns):
 *   - 6-digit code from crypto.randomInt (not Math.random)
 *   - only the sha-256 hash is stored; the raw code is emailed and never persisted
 *   - 10-minute TTL
 *   - max 5 wrong attempts per code, then it's dead (must request a new one)
 *   - issuing a new code consumes any older unconsumed code for the same purpose,
 *     so EMAIL_VERIFY and PASSWORD_RESET never step on each other
 */

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const hashCode = (code: string) =>
  crypto.createHash("sha256").update(code).digest("hex");

/** Create a fresh code for (userId, purpose) and return the raw code to email. */
export async function issueOtp(userId: string, purpose: OtpPurpose): Promise<string> {
  await prisma.otpToken.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await prisma.otpToken.create({
    data: {
      userId,
      purpose,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
  return code;
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "TOO_MANY_ATTEMPTS" | "INVALID" };

/** Check a submitted code. On success the code is consumed (single use). */
export async function verifyOtp(
  userId: string,
  purpose: OtpPurpose,
  code: string
): Promise<VerifyOtpResult> {
  const token = await prisma.otpToken.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!token) return { ok: false, reason: "NOT_FOUND" };
  if (token.expiresAt < new Date()) return { ok: false, reason: "EXPIRED" };
  if (token.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "TOO_MANY_ATTEMPTS" };

  const submitted = Buffer.from(hashCode(String(code).trim()));
  const stored = Buffer.from(token.codeHash);
  const match =
    submitted.length === stored.length && crypto.timingSafeEqual(submitted, stored);

  if (!match) {
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "INVALID" };
  }

  await prisma.otpToken.update({
    where: { id: token.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true };
}
