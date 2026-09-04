import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueOtp, verifyOtp, type VerifyOtpResult } from "@/lib/otp";
import { sendRegistrationOtp } from "@/lib/email";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

const OTP_ERROR: Record<Extract<VerifyOtpResult, { ok: false }>["reason"], string> = {
  NOT_FOUND: "รหัส OTP ไม่ถูกต้อง",
  INVALID: "รหัส OTP ไม่ถูกต้อง",
  EXPIRED: "รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่",
  TOO_MANY_ATTEMPTS: "กรอกรหัสผิดหลายครั้งเกินไป กรุณาขอรหัสใหม่",
};

export async function POST(req: Request) {
  // lib/otp.ts already caps wrong guesses per-code at 5; this additionally
  // rate-limits the endpoint itself so someone can't outrun that cap by
  // hammering /verify-otp directly (e.g. across many requested codes).
  const ip = clientIp(req.headers);
  const rl = await rateLimit("verify-otp", ip, { limit: 15, windowSeconds: 15 * 60 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds);

  const { email, otp } = await req.json();
  if (!email || !otp) {
    return NextResponse.json({ error: "กรอกข้อมูลไม่ครบ" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: String(email).toLowerCase() },
  });
  if (!user) {
    return NextResponse.json({ error: "รหัส OTP ไม่ถูกต้อง" }, { status: 400 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  const result = await verifyOtp(user.id, "EMAIL_VERIFY", String(otp));
  if (!result.ok) {
    return NextResponse.json({ error: OTP_ERROR[result.reason] }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  });

  return NextResponse.json({ ok: true });
}

// Resend a fresh OTP for an unverified account.
export async function PUT(req: Request) {
  const { email } = await req.json();

  // 3 resends per email per 15 minutes — resending is the main way this
  // endpoint could be turned into an email bomb against one inbox.
  if (email) {
    const rl = await rateLimit("verify-otp-resend", String(email).toLowerCase(), {
      limit: 3,
      windowSeconds: 15 * 60,
    });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds);
  }

  const user = await prisma.user.findUnique({
    where: { email: email ? String(email).toLowerCase() : "" },
  });
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true }); // don't leak account state
  }

  const code = await issueOtp(user.id, "EMAIL_VERIFY");
  try {
    await sendRegistrationOtp({ email: user.email, otp: code });
  } catch (err) {
    console.error("[verify-otp] resend failed", err);
    return NextResponse.json({ error: "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
