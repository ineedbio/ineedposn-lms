import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyOtp, type VerifyOtpResult } from "@/lib/otp";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

const Schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});

const OTP_ERROR: Record<Extract<VerifyOtpResult, { ok: false }>["reason"], string> = {
  NOT_FOUND: "รหัส OTP ไม่ถูกต้อง",
  INVALID: "รหัส OTP ไม่ถูกต้อง",
  EXPIRED: "รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่",
  TOO_MANY_ATTEMPTS: "กรอกรหัสผิดหลายครั้งเกินไป กรุณาขอรหัสใหม่",
};

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const rl = await rateLimit("reset-password", ip, { limit: 10, windowSeconds: 15 * 60 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds);

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, otp, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return NextResponse.json({ error: "รหัส OTP ไม่ถูกต้อง" }, { status: 400 });
  }

  const result = await verifyOtp(user.id, "PASSWORD_RESET", otp);
  if (!result.ok) {
    return NextResponse.json({ error: OTP_ERROR[result.reason] }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      // Someone who reset their password should be forced to re-login everywhere.
      currentSessionId: null,
    },
  });

  return NextResponse.json({ ok: true });
}
